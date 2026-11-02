import type { LayoutServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { config } from '#lib/server/config.ts';

export const load: LayoutServerLoad = async ({ locals }) => {
	let likedYouCount = 0;
	if (locals.user?.hasProfile) {
		const me = locals.user.id;
		const [row] = await sql`
			select count(*)::int as n from swipes s
			join users u on u.id = s.swiper_id and u.status = 'active'
			where s.target_id = ${me} and s.liked
				and not exists (select 1 from swipes mine where mine.swiper_id = ${me} and mine.target_id = s.swiper_id)
				and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = s.swiper_id)
					or (b.blocker_id = s.swiper_id and b.blocked_id = ${me}))`;
		likedYouCount = row.n;
	}
	return { user: locals.user, likedYouCount, appName: config.appName, version: config.version };
};
