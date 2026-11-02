import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { discover } from '#lib/server/people.ts';
import { swipe } from '#lib/server/matching.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const [setup] = await sql`
		select location is not null as has_location,
			exists (select 1 from photos where user_id = ${me}) as has_photo
		from profiles where user_id = ${me}`;
	return { people: await discover(me), hasLocation: setup.has_location, hasPhoto: setup.has_photo };
};

export const actions: Actions = {
	swipe: async ({ request, locals }) => {
		const me = locals.user!.id;
		const form = await request.formData();
		const target = String(form.get('target') ?? '');
		const liked = form.get('liked') === 'true';
		if (!/^[0-9a-f-]{36}$/i.test(target)) return fail(400, { error: 'Unknown person.' });
		// Generous, but stops bots from liking everyone in a city in a minute.
		if (!allow(`swipe:${me}`, 300, 60 * 60 * 1000)) {
			return fail(429, { error: "You're swiping really fast. Take a breather and try again soon." });
		}
		const matchId = await swipe(me, target, liked);
		return { matchId };
	}
};
