// "Sign in with Mastodon": works with any server that speaks the Mastodon client API,
// which includes Mastodon, GoToSocial, Akkoma/Pleroma, and many forks.
import { sql } from './db.ts';
import { config } from './config.ts';
import { assertPublicHost, instanceBaseUrl, normalizeInstance, safeFetch } from './netguard.ts';
import type { ExternalIdentity } from './identity.ts';

const SCOPE = 'read:accounts';
export const FEDI_COOKIE = 'tesslet_fedi_oauth';

async function getApp(instance: string, redirectUri: string) {
	const [existing] = await sql`
		select client_id, client_secret from fedi_apps where instance = ${instance} and redirect_uri = ${redirectUri}`;
	if (existing) return existing as { client_id: string; client_secret: string };

	const res = await safeFetch(`${instanceBaseUrl(instance)}/api/v1/apps`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			client_name: config.appName,
			redirect_uris: redirectUri,
			scopes: SCOPE,
			website: config.publicUrl || undefined
		})
	});
	if (!res.ok) throw new Error(`${instance} didn't let us register (HTTP ${res.status}). Is it a Mastodon-compatible server?`);
	const app = (await res.json()) as { client_id?: string; client_secret?: string };
	if (!app.client_id || !app.client_secret) throw new Error(`${instance} sent back an unexpected response.`);
	await sql`
		insert into fedi_apps (instance, redirect_uri, client_id, client_secret)
		values (${instance}, ${redirectUri}, ${app.client_id}, ${app.client_secret})
		on conflict do nothing`;
	return { client_id: app.client_id, client_secret: app.client_secret };
}

export async function startFediLogin(input: string, redirectUri: string, state: string) {
	const instance = normalizeInstance(input);
	if (!instance) throw new Error('Enter your server, like mastodon.social or @you@mastodon.social.');
	await assertPublicHost(instance);
	const app = await getApp(instance, redirectUri);
	const url = new URL(`${instanceBaseUrl(instance)}/oauth/authorize`);
	url.search = new URLSearchParams({
		response_type: 'code',
		client_id: app.client_id,
		redirect_uri: redirectUri,
		scope: SCOPE,
		state
	}).toString();
	return { instance, url: url.toString() };
}

export async function finishFediLogin(instance: string, code: string, redirectUri: string): Promise<ExternalIdentity> {
	await assertPublicHost(instance);
	const app = await getApp(instance, redirectUri);
	const base = instanceBaseUrl(instance);

	const tokenRes = await safeFetch(`${base}/oauth/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			client_id: app.client_id,
			client_secret: app.client_secret,
			redirect_uri: redirectUri,
			scope: SCOPE
		})
	});
	if (!tokenRes.ok) throw new Error(`${instance} rejected the sign-in (HTTP ${tokenRes.status}).`);
	const { access_token } = (await tokenRes.json()) as { access_token?: string };
	if (!access_token) throw new Error(`${instance} didn't send an access token.`);

	const meRes = await safeFetch(`${base}/api/v1/accounts/verify_credentials`, {
		headers: { authorization: `Bearer ${access_token}` }
	});
	if (!meRes.ok) throw new Error(`Couldn't read your account from ${instance}.`);
	const me = (await meRes.json()) as { id?: string; username?: string; url?: string };
	if (!me.id || !me.username) throw new Error(`${instance} sent back an unexpected account.`);

	// We only needed to know who you are, so give the token straight back.
	await safeFetch(`${base}/oauth/revoke`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ client_id: app.client_id, client_secret: app.client_secret, token: access_token })
	}).catch(() => {});

	return {
		provider: 'mastodon',
		subject: `${instance}:${me.id}`,
		handle: `@${me.username}@${instance}`,
		profileUrl: typeof me.url === 'string' && me.url.startsWith('https://') ? me.url : null
	};
}
