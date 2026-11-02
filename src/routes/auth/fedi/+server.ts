import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomBytes } from 'node:crypto';
import { FEDI_COOKIE, startFediLogin } from '#lib/server/fedi.ts';
import { allow } from '#lib/server/ratelimit.ts';

export const POST: RequestHandler = async ({ request, url, cookies, getClientAddress, locals }) => {
	const back = locals.user ? '/account' : '/login';
	const fail = (message: string) => redirect(303, `${back}?error=${encodeURIComponent(message)}`);
	if (!allow(`fedi:${getClientAddress()}`, 20, 15 * 60 * 1000)) fail('Too many attempts. Try again in a few minutes.');

	const input = String((await request.formData()).get('instance') ?? '');
	const state = randomBytes(24).toString('base64url');
	let target: string;
	try {
		const { instance, url: authorizeUrl } = await startFediLogin(input, `${url.origin}/auth/fedi/callback`, state);
		cookies.set(FEDI_COOKIE, JSON.stringify({ state, instance }), {
			path: '/auth/fedi',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 600
		});
		target = authorizeUrl;
	} catch (e) {
		fail((e as Error).message || "Couldn't reach that server.");
	}
	// The target is the server the visitor chose to sign in with.
	redirect(303, target!, { external: true });
};
