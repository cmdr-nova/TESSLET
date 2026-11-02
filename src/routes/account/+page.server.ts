import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { sql } from '#lib/server/db.ts';
import { config } from '#lib/server/config.ts';
import { SESSION_COOKIE, verifyPassword } from '#lib/server/auth.ts';
import { listIdentities } from '#lib/server/identity.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const [user] = await sql`select password_hash is not null as has_password from users where id = ${locals.user!.id}`;
	return { identities: await listIdentities(locals.user!.id), hasPassword: user.has_password as boolean };
};

export const actions: Actions = {
	unlink: async ({ request, locals }) => {
		const me = locals.user!.id;
		const handle = String((await request.formData()).get('handle') ?? '');
		const [user] = await sql`select password_hash is not null as has_password from users where id = ${me}`;
		const [{ n }] = await sql`select count(*)::int as n from identities where user_id = ${me}`;
		if (!user.has_password && n <= 1) {
			return fail(400, { error: "That's your only way to sign in, so it can't be disconnected." });
		}
		await sql`delete from identities where user_id = ${me} and handle = ${handle}`;
		return { unlinked: true };
	},

	// Real deletion: rows cascade away and photo files are removed from disk.
	delete: async ({ request, locals, cookies }) => {
		const me = locals.user!.id;
		const form = await request.formData();
		const [user] = await sql`select password_hash from users where id = ${me}`;
		const confirmed = user?.password_hash
			? await verifyPassword(user.password_hash, String(form.get('password') ?? ''))
			: String(form.get('confirm') ?? '').trim() === 'DELETE';
		if (!confirmed) {
			return fail(400, { error: user?.password_hash ? "That password didn't match." : 'Type DELETE to confirm.' });
		}
		const photos = await sql`select filename from photos where user_id = ${me}`;
		await sql`delete from users where id = ${me}`;
		await Promise.all(photos.map((p) => unlink(path.join(config.uploadDir, p.filename)).catch(() => {})));
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
