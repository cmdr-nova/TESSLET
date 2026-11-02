import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeEqual } from 'node:crypto';
import { FEDI_COOKIE, finishFediLogin } from '#lib/server/fedi.ts';
import { completeExternalLogin } from '#lib/server/identity.ts';

const same = (a: string, b: string) =>
	a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const GET: RequestHandler = async (event) => {
	const { url, cookies, locals } = event;
	const back = locals.user ? '/account' : '/login';
	const fail = (message: string) => redirect(303, `${back}?error=${encodeURIComponent(message)}`);

	const raw = cookies.get(FEDI_COOKIE);
	cookies.delete(FEDI_COOKIE, { path: '/auth/fedi' });
	let saved: { state?: string; instance?: string } = {};
	try {
		saved = JSON.parse(raw ?? '{}');
	} catch {
		// treated as missing below
	}
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state') ?? '';
	if (url.searchParams.get('error')) fail('Sign-in was cancelled.');
	if (!code || !saved.state || !saved.instance || !same(state, saved.state)) {
		fail('That sign-in link expired. Please try again.');
	}

	let destination: string;
	try {
		const identity = await finishFediLogin(saved.instance!, code!, `${url.origin}/auth/fedi/callback`);
		destination = await completeExternalLogin(event, identity);
	} catch (e) {
		fail((e as Error).message || 'Sign-in failed.');
	}
	redirect(303, destination!);
};
