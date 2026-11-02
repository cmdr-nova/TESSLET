import type { RequestEvent } from '@sveltejs/kit';
import { sql } from './db.ts';
import { createSession, setSessionCookie } from './auth.ts';
import { allow } from './ratelimit.ts';

export type ExternalIdentity = {
	provider: 'mastodon' | 'atproto';
	subject: string;
	handle: string;
	profileUrl: string | null;
};

const withError = (path: string, message: string) => `${path}?error=${encodeURIComponent(message)}`;

/**
 * Runs after a successful fediverse/ATProto sign-in and returns where to send the browser.
 * - Known identity: log in as its owner.
 * - Already logged in: link the identity to the current account.
 * - Otherwise: create a new account, which then adds a birthdate at /welcome.
 */
export async function completeExternalLogin(event: RequestEvent, ident: ExternalIdentity): Promise<string> {
	const current = event.locals.user;
	const secure = event.url.protocol === 'https:';
	const [existing] = await sql`
		select i.user_id, u.status from identities i join users u on u.id = i.user_id
		where i.provider = ${ident.provider} and i.subject = ${ident.subject}`;

	if (existing) {
		await sql`update identities set handle = ${ident.handle}, profile_url = ${ident.profileUrl}
			where provider = ${ident.provider} and subject = ${ident.subject}`;
		if (current) {
			return current.id === existing.user_id
				? '/account?linked=1'
				: withError('/account', `${ident.handle} is already linked to a different account.`);
		}
		if (existing.status !== 'active') return withError('/login', 'This account has been suspended.');
		const { token, expires } = await createSession(existing.user_id);
		setSessionCookie(event.cookies, token, expires, secure);
		return '/discover';
	}

	if (current) {
		await sql`insert into identities (provider, subject, user_id, handle, profile_url)
			values (${ident.provider}, ${ident.subject}, ${current.id}, ${ident.handle}, ${ident.profileUrl})`;
		return '/account?linked=1';
	}

	if (!allow(`signup:${event.getClientAddress()}`, 5, 60 * 60 * 1000)) {
		return withError('/login', 'Too many sign-ups from here. Try again in an hour.');
	}
	const userId = await sql.begin(async (tx) => {
		const [user] = await tx`insert into users default values returning id`;
		await tx`insert into identities (provider, subject, user_id, handle, profile_url)
			values (${ident.provider}, ${ident.subject}, ${user.id}, ${ident.handle}, ${ident.profileUrl})`;
		return user.id as string;
	});
	const { token, expires } = await createSession(userId);
	setSessionCookie(event.cookies, token, expires, secure);
	return '/welcome';
}

export async function listIdentities(userId: string) {
	return (await sql`
		select provider, handle, profile_url from identities where user_id = ${userId} order by created_at`) as unknown as {
		provider: 'mastodon' | 'atproto';
		handle: string;
		profile_url: string | null;
	}[];
}
