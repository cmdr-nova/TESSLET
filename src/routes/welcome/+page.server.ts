import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { config } from '#lib/server/config.ts';
import { isAdult } from '#lib/server/auth.ts';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.needsOnboarding) redirect(303, '/discover');
	const [identity] = await sql`select handle from identities where user_id = ${locals.user.id} order by created_at limit 1`;
	return { handle: (identity?.handle as string) ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const birthdate = new Date(String(form.get('birthdate') ?? ''));
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		if (Number.isNaN(birthdate.getTime())) return fail(400, { error: 'Enter your birthdate.' });
		if (!isAdult(birthdate)) return fail(400, { error: 'You need to be 18 or older to join.' });
		if (form.get('agree') !== 'on') return fail(400, { error: 'Please agree to the community rules.' });
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { error: 'That email looks off.' });
		if (email) {
			const [taken] = await sql`select 1 from users where email = ${email} and id <> ${locals.user!.id}`;
			if (taken) return fail(400, { error: 'That email is already used by another account.' });
		}
		await sql`update users set birthdate = ${birthdate}, email = ${email || null},
			is_admin = is_admin or ${email !== '' && config.adminEmails.includes(email)}
			where id = ${locals.user!.id}`;
		redirect(303, '/profile');
	}
};
