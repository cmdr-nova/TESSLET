import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { finishAtprotoLogin } from '#lib/server/atproto.ts';
import { completeExternalLogin } from '#lib/server/identity.ts';

export const GET: RequestHandler = async (event) => {
	const back = event.locals.user ? '/account' : '/login';
	let destination: string;
	try {
		const identity = await finishAtprotoLogin(event.url.searchParams);
		destination = await completeExternalLogin(event, identity);
	} catch (e) {
		console.warn('ATProto callback failed:', (e as Error).message);
		redirect(303, `${back}?error=${encodeURIComponent('Bluesky sign-in failed or expired. Please try again.')}`);
	}
	redirect(303, destination!);
};
