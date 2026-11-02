// A tiny fake Mastodon server for testing fediverse sign-in without the internet.
// It auto-approves every authorization request. Usage: node tests/mock-mastodon.mjs [port]
import http from 'node:http';

const port = Number(process.argv[2] ?? 4010);
const apps = new Map();
const codes = new Map();
const tokens = new Map();
let currentUser = 'val'; // who "logs in" next; change it with POST /__mock/user {"username": "..."}

const readBody = (req) =>
	new Promise((resolve) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => resolve(data));
	});
const send = (res, status, body) => {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
};

http
	.createServer(async (req, res) => {
		const url = new URL(req.url, `http://${req.headers.host}`);
		const raw = await readBody(req);
		const body = req.headers['content-type']?.includes('json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));

		if (req.method === 'POST' && url.pathname === '/__mock/user') {
			currentUser = body.username;
			return send(res, 200, { ok: true });
		}
		if (req.method === 'POST' && url.pathname === '/api/v1/apps') {
			const app = { client_id: `cid-${apps.size + 1}`, client_secret: `secret-${apps.size + 1}`, redirect_uri: body.redirect_uris };
			apps.set(app.client_id, app);
			return send(res, 200, app);
		}
		if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
			const app = apps.get(url.searchParams.get('client_id'));
			if (!app || app.redirect_uri !== url.searchParams.get('redirect_uri')) return send(res, 400, { error: 'bad client' });
			const username = currentUser;
			const code = `code-${Math.random().toString(36).slice(2)}`;
			codes.set(code, { client_id: app.client_id, username });
			const back = new URL(app.redirect_uri);
			back.searchParams.set('code', code);
			back.searchParams.set('state', url.searchParams.get('state'));
			res.writeHead(302, { location: back.toString() });
			return res.end();
		}
		if (req.method === 'POST' && url.pathname === '/oauth/token') {
			const grant = codes.get(body.code);
			const app = apps.get(body.client_id);
			if (!grant || !app || app.client_secret !== body.client_secret) return send(res, 400, { error: 'invalid_grant' });
			codes.delete(body.code);
			const token = `tok-${Math.random().toString(36).slice(2)}`;
			tokens.set(token, grant.username);
			return send(res, 200, { access_token: token, token_type: 'Bearer', scope: 'read:accounts' });
		}
		if (req.method === 'GET' && url.pathname === '/api/v1/accounts/verify_credentials') {
			const username = tokens.get((req.headers.authorization ?? '').replace('Bearer ', ''));
			if (!username) return send(res, 401, { error: 'unauthorized' });
			return send(res, 200, { id: `id-${username}`, username, acct: username, url: `https://example.test/@${username}` });
		}
		if (req.method === 'POST' && url.pathname === '/oauth/revoke') {
			tokens.delete(body.token);
			return send(res, 200, {});
		}
		send(res, 404, { error: 'not found' });
	})
	.listen(port, () => console.log(`mock mastodon on http://localhost:${port}`));
