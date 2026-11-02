import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { config } from '#lib/server/config.ts';
import { createSession, hashPassword, setSessionCookie } from '#lib/server/auth.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/discover');
};

function isAdult(birthdate: Date) {
	const cutoff = new Date();
	cutoff.setFullYear(cutoff.getFullYear() - 18);
	return birthdate <= cutoff;
}

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		if (!allow(`signup:${getClientAddress()}`, 5, 60 * 60 * 1000)) {
			return fail(429, { email: '', error: 'Too many sign-ups from here. Try again in an hour.' });
		}
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		const birthdate = new Date(String(form.get('birthdate') ?? ''));
		const agreed = form.get('agree') === 'on';

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { email, error: 'That email looks off.' });
		if (password.length < 10) return fail(400, { email, error: 'Use at least 10 characters for your password.' });
		if (Number.isNaN(birthdate.getTime())) return fail(400, { email, error: 'Enter your birthdate.' });
		if (!isAdult(birthdate)) return fail(400, { email, error: 'You need to be 18 or older to join.' });
		if (!agreed) return fail(400, { email, error: 'Please agree to the community rules.' });

		const [existing] = await sql`select 1 from users where email = ${email}`;
		if (existing) return fail(400, { email, error: 'An account with that email already exists.' });

		const [user] = await sql`
			insert into users (email, password_hash, birthdate, is_admin)
			values (${email}, ${await hashPassword(password)}, ${birthdate}, ${config.adminEmails.includes(email)})
			returning id`;
		const { token, expires } = await createSession(user.id);
		setSessionCookie(cookies, token, expires, url.protocol === 'https:');
		redirect(303, '/profile');
	}
};
