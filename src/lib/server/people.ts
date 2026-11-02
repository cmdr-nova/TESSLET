import { sql } from './db.ts';
import { distanceLabel } from './geo.ts';
import { photoUrl } from './photos.ts';
import type { PersonCard } from '../types.ts';

export type { PersonCard };


const notBlocked = (me: string) => sql`
	not exists (select 1 from blocks b
		where (b.blocker_id = ${me} and b.blocked_id = p.user_id) or (b.blocker_id = p.user_id and b.blocked_id = ${me}))`;

// Columns every person card needs. `me` is the viewer's profile row (aliased "me").
const cardColumns = (me: string) => sql`
	p.user_id as id, p.display_name as name, p.pronouns, p.bio,
	extract(year from age(u.birthdate))::int as age,
	case when p.location is not null and me.location is not null
		then ST_Distance(p.location, me.location) / 1000 end as km,
	(select json_build_object('name', i.handle, 'url', i.profile_url) from identities i
		where i.user_id = p.user_id and p.show_handle order by i.created_at limit 1) as handle,
	exists (select 1 from swipes l where l.swiper_id = p.user_id and l.target_id = ${me} and l.liked) as liked_you,
	coalesce((select array_agg(ph.filename order by ph.position) from photos ph
		where ph.user_id = p.user_id and not ph.hidden), '{}') as photos`;

function toCard(row: Record<string, any>): PersonCard {
	return {
		id: row.id,
		name: row.name,
		age: row.age,
		pronouns: row.pronouns,
		bio: row.bio,
		distance: distanceLabel(row.km),
		photos: (row.photos as string[]).map(photoUrl),
		likedYou: row.liked_you,
		handle: row.handle ?? null
	};
}

/**
 * People who fit my filters AND whose filters I fit (gender, age, distance),
 * that I haven't swiped on, with at least one photo, and no block either way.
 */
export async function discover(me: string, limit = 20) {
	const rows = await sql`
		select ${cardColumns(me)}
		from profiles me
		join users mu on mu.id = me.user_id
		join profiles p on p.user_id <> me.user_id
		join users u on u.id = p.user_id and u.status = 'active'
		where me.user_id = ${me}
			and me.location is not null and p.location is not null
			and ST_DWithin(p.location, me.location, least(me.max_distance_km, p.max_distance_km) * 1000)
			and p.gender = any(me.interested_in) and me.gender = any(p.interested_in)
			and extract(year from age(u.birthdate)) between me.age_min and me.age_max
			and extract(year from age(mu.birthdate)) between p.age_min and p.age_max
			and not exists (select 1 from swipes s where s.swiper_id = ${me} and s.target_id = p.user_id)
			and exists (select 1 from photos ph where ph.user_id = p.user_id and not ph.hidden)
			and ${notBlocked(me)}
		order by p.last_active desc
		limit ${limit}`;
	return rows.map(toCard);
}

/** Everyone who liked me that I haven't answered yet. Fully visible, no blur. */
export async function likedYou(me: string) {
	const rows = await sql`
		select ${cardColumns(me)}, s.created_at as liked_at
		from swipes s
		join profiles p on p.user_id = s.swiper_id
		join users u on u.id = p.user_id and u.status = 'active'
		join profiles me on me.user_id = ${me}
		where s.target_id = ${me} and s.liked
			and not exists (select 1 from swipes mine where mine.swiper_id = ${me} and mine.target_id = s.swiper_id)
			and ${notBlocked(me)}
		order by s.created_at desc`;
	return rows.map(toCard);
}

/** A single profile, visible only if there's no block either way. */
export async function person(me: string, id: string) {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	const [row] = await sql`
		select ${cardColumns(me)}
		from profiles p
		join users u on u.id = p.user_id and u.status = 'active'
		join profiles me on me.user_id = ${me}
		where p.user_id = ${id} and ${notBlocked(me)}`;
	return row ? toCard(row) : null;
}
