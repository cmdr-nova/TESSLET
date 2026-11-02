import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { likedYou } from '#lib/server/people.ts';
import { swipe } from '#lib/server/matching.ts';

export const load: PageServerLoad = async ({ locals }) => ({ people: await likedYou(locals.user!.id) });

export const actions: Actions = {
	answer: async ({ request, locals }) => {
		const form = await request.formData();
		const target = String(form.get('target') ?? '');
		if (!/^[0-9a-f-]{36}$/i.test(target)) return fail(400, { error: 'Unknown person.' });
		const matchId = await swipe(locals.user!.id, target, form.get('liked') === 'true');
		if (matchId) redirect(303, `/chat/${matchId}?new=1`);
		return {};
	}
};
