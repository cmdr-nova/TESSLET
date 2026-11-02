import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, validateSession } from '#lib/server/auth.ts';
import { sql } from '#lib/server/db.ts';

const PUBLIC = new Set(['/', '/login', '/signup', '/about', '/oauth-client-metadata.json']);
const NO_PROFILE_OK = new Set(['/profile', '/logout', '/about', '/account', '/welcome']);
const ONBOARDING_OK = new Set(['/welcome', '/logout', '/about']);

const redirectTo = (location: string) => new Response(null, { status: 303, headers: { location } });

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const user = token ? await validateSession(token) : null;
	event.locals.user = user;

	const path = event.url.pathname;
	// /auth/* handles fediverse and ATProto sign-in, for logged-out and logged-in (linking) users alike.
	const isPublic = PUBLIC.has(path) || path.startsWith('/auth/');

	if (!user && !isPublic) return redirectTo('/login');
	if (user?.needsOnboarding && !isPublic && !ONBOARDING_OK.has(path)) return redirectTo('/welcome');
	if (user && !user.hasProfile && !isPublic && !NO_PROFILE_OK.has(path)) return redirectTo('/profile');
	if (path.startsWith('/admin') && !user?.isAdmin) return new Response('Not found', { status: 404 });

	if (user?.hasProfile) {
		await sql`update profiles set last_active = now()
			where user_id = ${user.id} and last_active < now() - interval '5 minutes'`;
	}

	const response = await resolve(event);
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'same-origin');
	response.headers.set('x-content-type-options', 'nosniff');
	return response;
};
