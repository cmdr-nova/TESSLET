// Production entry point: `node server.js` (after `npm run build`).
// Wraps SvelteKit's Node handler so the app works both behind a reverse proxy
// (Caddy/nginx set X-Forwarded-Proto) and directly over plain http on localhost.
import http from 'node:http';
import { handler } from './build/handler.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = http.createServer((req, res) => {
	if (!req.headers['x-forwarded-proto']) req.headers['x-forwarded-proto'] = 'http';
	handler(req, res, () => {
		res.statusCode = 404;
		res.end('Not found');
	});
});

server.listen(port, host, () => console.log(`Tesslet listening on http://${host}:${port}`));
