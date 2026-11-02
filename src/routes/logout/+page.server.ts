import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { SESSION_COOKIE, deleteSession } from '#lib/server/auth.ts';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await deleteSession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
