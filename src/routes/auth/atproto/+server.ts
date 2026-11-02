import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startAtprotoLogin } from '#lib/server/atproto.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const POST: RequestHandler = async ({ request, getClientAddress, locals }) => {
	const back = locals.user ? '/account' : '/login';
	const fail = (message: string) => redirect(303, `${back}?error=${encodeURIComponent(message)}`);
	if (!allow(`atproto:${getClientAddress()}`, 20, 15 * 60 * 1000)) fail('Too many attempts. Try again in a few minutes.');

	const input = String((await request.formData()).get('handle') ?? '');
	let target: string;
	try {
		target = await startAtprotoLogin(input);
	} catch (e) {
		const message = (e as Error).message;
		console.warn(`ATProto sign-in for "${input}" failed:`, message);
		fail(message.startsWith('Enter your handle') ? message : `Couldn't find that Bluesky/ATProto account. Check the handle and try again.`);
	}
	// The target is the server the visitor chose to sign in with.
	redirect(303, target!, { external: true });
};
