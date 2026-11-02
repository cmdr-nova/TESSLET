import type { PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { photoUrl } from '#lib/server/photos.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const rows = await sql`
		with mine as (
			select m.id, m.created_at, case when m.user_a = ${me} then m.user_b else m.user_a end as other_id
			from matches m
			where (m.user_a = ${me} or m.user_b = ${me}) and m.unmatched_at is null
		)
		select mine.id, mine.created_at, p.display_name as name,
			(select filename from photos where user_id = mine.other_id and not hidden order by position limit 1) as photo,
			last.body as last_body, last.sender_id = ${me} as last_mine, last.created_at as last_at,
			(select count(*)::int from messages x where x.match_id = mine.id and x.sender_id <> ${me} and x.read_at is null) as unread
		from mine
		join users u on u.id = mine.other_id and u.status = 'active'
		join profiles p on p.user_id = mine.other_id
		left join lateral (
			select body, sender_id, created_at from messages where match_id = mine.id order by id desc limit 1
		) last on true
		where not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = mine.other_id)
			or (b.blocker_id = mine.other_id and b.blocked_id = ${me}))
		order by coalesce(last.created_at, mine.created_at) desc`;
	return {
		matches: rows.map((r) => ({
			id: r.id as string,
			name: r.name as string,
			photo: r.photo ? photoUrl(r.photo) : null,
			preview: r.last_body ? `${r.last_mine ? 'You: ' : ''}${r.last_body}` : 'New match! Say hi.',
			unread: r.unread as number
		}))
	};
};
