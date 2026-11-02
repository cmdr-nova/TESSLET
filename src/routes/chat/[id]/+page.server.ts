import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { getMatch, unmatch } from '#lib/server/matching.ts';
import { sendMessage } from '#lib/server/chat.ts';
import { photoUrl } from '#lib/server/photos.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = locals.user!.id;
	const match = await getMatch(me, params.id);
	if (!match) error(404, 'This chat is no longer available.');

	await sql`update messages set read_at = now()
		where match_id = ${match.id} and sender_id <> ${me} and read_at is null`;
	const messages = await sql`
		select id::text, sender_id, body, created_at, read_at from messages
		where match_id = ${match.id} order by id desc limit 200`;

	return {
		matchId: match.id,
		me,
		other: {
			id: match.other.id as string,
			name: match.other.display_name as string,
			photo: match.other.photo ? photoUrl(match.other.photo) : null
		},
		messages: messages.reverse().map((m) => ({ ...m })) as {
			id: string; sender_id: string; body: string; created_at: Date; read_at: Date | null;
		}[]
	};
};

export const actions: Actions = {
	send: async ({ request, locals, params }) => {
		const me = locals.user!.id;
		const match = await getMatch(me, params.id);
		if (!match) return fail(404, { error: 'This chat is no longer available.' });
		const body = String((await request.formData()).get('body') ?? '').trim();
		if (!body) return fail(400, { error: 'Type a message first.' });
		if (body.length > 2000) return fail(400, { error: 'Messages are capped at 2000 characters.' });
		if (!allow(`msg:${me}`, 30, 60 * 1000)) return fail(429, { error: 'Slow down a little!' });
		await sendMessage(match.id, me, body);
		return { sent: true };
	},
	unmatch: async ({ locals, params }) => {
		await unmatch(locals.user!.id, params.id);
		redirect(303, '/matches');
	}
};
