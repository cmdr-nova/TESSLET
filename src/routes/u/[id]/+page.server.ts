import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { person } from '#lib/server/people.ts';
import { REPORT_REASONS, block, report } from '#lib/server/safety.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (params.id === locals.user!.id) redirect(303, '/profile');
	const p = await person(locals.user!.id, params.id);
	if (!p) error(404, "This profile isn't available.");
	return { person: p, reasons: REPORT_REASONS };
};

export const actions: Actions = {
	block: async ({ locals, params }) => {
		await block(locals.user!.id, params.id);
		redirect(303, '/discover');
	},
	report: async ({ request, locals, params }) => {
		const me = locals.user!.id;
		if (!allow(`report:${me}`, 10, 60 * 60 * 1000)) return fail(429, { error: 'Too many reports at once. Try again later.' });
		const form = await request.formData();
		const ok = await report(me, params.id, String(form.get('reason') ?? ''), String(form.get('details') ?? ''));
		if (!ok) return fail(400, { error: 'Pick a reason.' });
		// Reporting someone also blocks them, so you never have to see them again.
		await block(me, params.id);
		redirect(303, '/discover?reported=1');
	}
};
