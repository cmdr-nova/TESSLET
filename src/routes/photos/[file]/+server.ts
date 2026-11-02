import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '#lib/server/config.ts';
import { sql } from '#lib/server/db.ts';

// Photos are only served to signed-in users (the hook already enforces that),
// and never if a moderator hid them or the owner is suspended.
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!/^[0-9a-f]{32}\.webp$/.test(params.file)) error(404);
	const [row] = await sql`
		select ph.user_id from photos ph join users u on u.id = ph.user_id
		where ph.filename = ${params.file}
			and ((not ph.hidden and u.status = 'active') or ph.user_id = ${locals.user!.id} or ${locals.user!.isAdmin})`;
	if (!row) error(404);
	const data = await readFile(path.join(config.uploadDir, params.file)).catch(() => null);
	if (!data) error(404);
	return new Response(data, {
		headers: { 'content-type': 'image/webp', 'cache-control': 'private, max-age=86400' }
	});
};
