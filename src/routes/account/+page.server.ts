import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { sql } from '#lib/server/db.ts';
import { config } from '#lib/server/config.ts';
import { SESSION_COOKIE, verifyPassword } from '#lib/server/auth.ts';

export const actions: Actions = {
	// Real deletion: rows cascade away and photo files are removed from disk.
	delete: async ({ request, locals, cookies }) => {
		const me = locals.user!.id;
		const password = String((await request.formData()).get('password') ?? '');
		const [user] = await sql`select password_hash from users where id = ${me}`;
		if (!user || !(await verifyPassword(user.password_hash, password))) {
			return fail(400, { error: "That password didn't match." });
		}
		const photos = await sql`select filename from photos where user_id = ${me}`;
		await sql`delete from users where id = ${me}`;
		await Promise.all(photos.map((p) => unlink(path.join(config.uploadDir, p.filename)).catch(() => {})));
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
