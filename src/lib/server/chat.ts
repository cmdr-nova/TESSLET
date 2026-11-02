import { EventEmitter } from 'node:events';
import { sql } from './db.ts';

// Postgres LISTEN/NOTIFY fans new messages out to every open chat stream.
// Notifications carry only ids; each stream re-reads the row itself.
const bus = new EventEmitter();
bus.setMaxListeners(0);
let listening: Promise<unknown> | null = null;

function ensureListener() {
	listening ??= sql.listen('chat_message', (payload) => {
		try {
			const { match_id, id } = JSON.parse(payload);
			bus.emit(match_id, id);
		} catch {
			// ignore malformed payloads
		}
	});
}

export function subscribe(matchId: string, onMessage: (messageId: string) => void) {
	ensureListener();
	bus.on(matchId, onMessage);
	return () => {
		bus.off(matchId, onMessage);
	};
}

export async function sendMessage(matchId: string, senderId: string, body: string) {
	const [msg] = await sql`insert into messages (match_id, sender_id, body)
		values (${matchId}, ${senderId}, ${body}) returning id`;
	await sql`select pg_notify('chat_message', ${JSON.stringify({ match_id: matchId, id: String(msg.id) })})`;
}

export async function getMessage(id: string) {
	const [m] = await sql`select id::text, sender_id, body, created_at, read_at from messages where id = ${id}`;
	return m ?? null;
}
