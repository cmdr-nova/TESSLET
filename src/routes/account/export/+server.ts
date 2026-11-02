import type { RequestHandler } from './$types';
import { sql } from '#lib/server/db.ts';

// GDPR-style export of everything we hold about the signed-in user.
export const GET: RequestHandler = async ({ locals }) => {
	const me = locals.user!.id;
	const [user] = await sql`select id, email, birthdate, created_at from users where id = ${me}`;
	const [profile] = await sql`
		select display_name, bio, pronouns, gender, interested_in, age_min, age_max, max_distance_km,
			ST_Y(location::geometry) as lat_rounded, ST_X(location::geometry) as lng_rounded, last_active
		from profiles where user_id = ${me}`;
	const data = {
		exported_at: new Date().toISOString(),
		user,
		profile: profile ?? null,
		photos: await sql`select filename, position, created_at from photos where user_id = ${me}`,
		swipes: await sql`select target_id, liked, created_at from swipes where swiper_id = ${me}`,
		matches: await sql`select id, user_a, user_b, created_at, unmatched_at from matches where user_a = ${me} or user_b = ${me}`,
		messages_sent: await sql`select match_id, body, created_at from messages where sender_id = ${me}`,
		blocks: await sql`select blocked_id, created_at from blocks where blocker_id = ${me}`,
		reports_filed: await sql`select target_id, reason, details, created_at from reports where reporter_id = ${me}`
	};
	return new Response(JSON.stringify(data, null, 2), {
		headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="my-data.json"' }
	});
};
