import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { createSession, setSessionCookie, verifyPassword } from '#lib/server/auth.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/discover');
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!allow(`login:${getClientAddress()}`, 10, 15 * 60 * 1000) || !allow(`login:${email}`, 10, 15 * 60 * 1000)) {
			return fail(429, { email, error: 'Too many attempts. Wait 15 minutes and try again.' });
		}
		const [user] = await sql`select id, password_hash, status from users where email = ${email}`;
		if (!user?.password_hash || !(await verifyPassword(user.password_hash, password))) {
			return fail(400, { email, error: "Email or password didn't match." });
		}
		if (user.status !== 'active') return fail(403, { email, error: 'This account has been suspended.' });

		const { token, expires } = await createSession(user.id);
		setSessionCookie(cookies, token, expires, url.protocol === 'https:');
		redirect(303, '/discover');
	}
};
