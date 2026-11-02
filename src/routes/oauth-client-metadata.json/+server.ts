import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { atprotoIsLoopback, getAtprotoClient } from '#lib/server/atproto.ts';

// ATProto servers fetch this to learn who we are (our client_id is this URL).
export const GET: RequestHandler = () => {
	if (atprotoIsLoopback()) error(404, 'Set PUBLIC_URL to enable Bluesky login.');
	return json(getAtprotoClient().clientMetadata);
};
