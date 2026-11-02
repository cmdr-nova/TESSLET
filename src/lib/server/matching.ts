import { sql } from './db.ts';
import { blockedBetween } from './safety.ts';

const pair = (x: string, y: string) => (x < y ? [x, y] : [y, x]);

/**
 * Records a like or pass. Returns the match id when this like completes a mutual match.
 * An advisory lock on the user pair stops two simultaneous likes from both missing each other.
 */
export async function swipe(me: string, target: string, liked: boolean): Promise<string | null> {
	if (me === target) return null;
	const [a, b] = pair(me, target);
	return sql.begin(async (tx) => {
		await tx`select pg_advisory_xact_lock(hashtextextended(${a + ':' + b}, 0))`;
		const [ok] = await tx`
			select 1 from users where id = ${target} and status = 'active' and not ${blockedBetween(me, target)}`;
		if (!ok) return null;

		await tx`insert into swipes (swiper_id, target_id, liked) values (${me}, ${target}, ${liked})
			on conflict (swiper_id, target_id) do update set liked = excluded.liked, created_at = now()`;
		if (!liked) return null;

		const [likedBack] = await tx`select 1 from swipes where swiper_id = ${target} and target_id = ${me} and liked`;
		if (!likedBack) return null;

		const [created] = await tx`insert into matches (user_a, user_b) values (${a}, ${b})
			on conflict (user_a, user_b) do nothing returning id`;
		if (created) return created.id as string;
		const [existing] = await tx`select id from matches where user_a = ${a} and user_b = ${b} and unmatched_at is null`;
		return (existing?.id as string) ?? null;
	});
}

/** The other person in an active match, or null if the match is gone, blocked, or not yours. */
export async function getMatch(me: string, matchId: string) {
	if (!/^[0-9a-f-]{36}$/i.test(matchId)) return null;
	const [row] = await sql`
		select m.id, case when m.user_a = ${me} then m.user_b else m.user_a end as other_id
		from matches m
		where m.id = ${matchId} and (m.user_a = ${me} or m.user_b = ${me}) and m.unmatched_at is null`;
	if (!row) return null;
	const [other] = await sql`
		select u.id, p.display_name,
			(select filename from photos where user_id = u.id and not hidden order by position limit 1) as photo
		from users u join profiles p on p.user_id = u.id
		where u.id = ${row.other_id} and u.status = 'active' and not ${blockedBetween(me, row.other_id)}`;
	return other ? { id: row.id as string, other } : null;
}

export async function unmatch(me: string, matchId: string) {
	await sql`update matches set unmatched_at = now()
		where id = ${matchId} and (user_a = ${me} or user_b = ${me}) and unmatched_at is null`;
}
