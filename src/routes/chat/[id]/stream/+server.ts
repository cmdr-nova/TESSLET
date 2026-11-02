import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatch } from '#lib/server/matching.ts';
import { getMessage, subscribe } from '#lib/server/chat.ts';
import { sql } from '#lib/server/db.ts';

// Server-Sent Events: the browser keeps this open and gets each new message as it lands.
export const GET: RequestHandler = async ({ locals, params, request }) => {
	const me = locals.user!.id;
	const match = await getMatch(me, params.id);
	if (!match) error(404);

	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream({
		start(controller) {
			const write = (text: string) => {
				try {
					controller.enqueue(encoder.encode(text));
				} catch {
					cleanup();
				}
			};
			const unsubscribe = subscribe(match.id, async (id) => {
				const msg = await getMessage(id);
				if (!msg) return;
				if (msg.sender_id !== me) await sql`update messages set read_at = now() where id = ${id} and read_at is null`;
				write(`data: ${JSON.stringify(msg)}\n\n`);
			});
			const ping = setInterval(() => write(': ping\n\n'), 25_000);
			cleanup = () => {
				clearInterval(ping);
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed
				}
			};
			request.signal.addEventListener('abort', () => cleanup());
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' }
	});
};
