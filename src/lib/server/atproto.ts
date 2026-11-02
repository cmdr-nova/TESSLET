// "Sign in with Bluesky": ATProto OAuth via the official client library.
// Production needs PUBLIC_URL (https) so the PDS can fetch our client metadata at
// <PUBLIC_URL>/oauth-client-metadata.json. Without it we run as an ATProto
// "loopback" development client, which only works when you open the app at http://127.0.0.1.
import {
	NodeOAuthClient,
	buildAtprotoLoopbackClientMetadata,
	requestLocalLock,
	type NodeSavedSession,
	type NodeSavedState
} from '@atproto/oauth-client-node';
import { sql } from './db.ts';
import { config } from './config.ts';
import type { ExternalIdentity } from './identity.ts';

type Table = 'atproto_oauth_state' | 'atproto_oauth_session';

function pgStore<V>(table: Table) {
	return {
		async get(key: string): Promise<V | undefined> {
			const [row] = await sql`select value from ${sql(table)} where key = ${key}`;
			return (row?.value as V) ?? undefined;
		},
		async set(key: string, value: V) {
			const json = sql.json(value as never);
			if (table === 'atproto_oauth_state') {
				await sql`delete from atproto_oauth_state where created_at < now() - interval '1 hour'`;
				await sql`insert into atproto_oauth_state (key, value) values (${key}, ${json})
					on conflict (key) do update set value = excluded.value`;
			} else {
				await sql`insert into atproto_oauth_session (key, value) values (${key}, ${json})
					on conflict (key) do update set value = excluded.value, updated_at = now()`;
			}
		},
		async del(key: string) {
			await sql`delete from ${sql(table)} where key = ${key}`;
		}
	};
}

export const atprotoIsLoopback = () => !config.publicUrl.startsWith('https://');
export const atprotoCallbackPath = '/auth/atproto/callback';

let client: NodeOAuthClient | null = null;

export function getAtprotoClient() {
	if (client) return client;
	const clientMetadata = atprotoIsLoopback()
		? buildAtprotoLoopbackClientMetadata({
				scope: 'atproto',
				redirect_uris: [`http://127.0.0.1:${config.port}${atprotoCallbackPath}`]
			})
		: {
				client_id: `${config.publicUrl}/oauth-client-metadata.json`,
				client_name: config.appName,
				client_uri: config.publicUrl,
				redirect_uris: [`${config.publicUrl}${atprotoCallbackPath}`] as [string],
				scope: 'atproto',
				grant_types: ['authorization_code', 'refresh_token'] as ['authorization_code', 'refresh_token'],
				response_types: ['code'] as ['code'],
				application_type: 'web' as const,
				token_endpoint_auth_method: 'none' as const,
				dpop_bound_access_tokens: true
			};
	client = new NodeOAuthClient({
		clientMetadata,
		stateStore: pgStore<NodeSavedState>('atproto_oauth_state'),
		sessionStore: pgStore<NodeSavedSession>('atproto_oauth_session'),
		requestLock: requestLocalLock
	});
	return client;
}

export function normalizeAtHandle(input: string) {
	const s = input.trim().replace(/^@/, '');
	if (/^did:(plc|web):[a-zA-Z0-9._:%-]+$/.test(s)) return s;
	const h = s.toLowerCase();
	return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/.test(h) ? h : null;
}

export async function startAtprotoLogin(input: string) {
	const handle = normalizeAtHandle(input);
	if (!handle) throw new Error('Enter your handle, like you.bsky.social.');
	const url = await getAtprotoClient().authorize(handle, {
		scope: 'atproto',
		state: JSON.stringify({ handle }),
		signal: AbortSignal.timeout(15_000)
	});
	return url.toString();
}

export async function finishAtprotoLogin(params: URLSearchParams): Promise<ExternalIdentity> {
	const oauth = getAtprotoClient();
	const { session, state } = await oauth.callback(params);
	const did = session.did;
	let handle: string = did;
	try {
		const typed = JSON.parse(state ?? '{}').handle;
		if (typeof typed === 'string' && !typed.startsWith('did:')) handle = typed;
	} catch {
		// keep the DID
	}
	// We only needed to know who you are, so give the tokens straight back.
	await oauth.revoke(did).catch(() => {});
	return {
		provider: 'atproto',
		subject: did,
		handle,
		profileUrl: `https://bsky.app/profile/${did}`
	};
}
