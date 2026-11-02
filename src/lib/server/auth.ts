import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { sql } from './db.ts';

export const SESSION_COOKIE = 'tesslet_session';
const DAY = 24 * 60 * 60 * 1000;
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (passwordHash: string, password: string) =>
	verify(passwordHash, password).catch(() => false);

export async function createSession(userId: string) {
	const token = randomBytes(32).toString('base64url');
	const expires = new Date(Date.now() + SESSION_DAYS * DAY);
	await sql`insert into sessions (id, user_id, expires_at) values (${hashToken(token)}, ${userId}, ${expires})`;
	return { token, expires };
}

export async function validateSession(token: string): Promise<App.Locals['user']> {
	const [row] = await sql`
		select u.id, u.email, u.is_admin, u.status, u.birthdate, s.expires_at, p.display_name
		from sessions s
		join users u on u.id = s.user_id
		left join profiles p on p.user_id = u.id
		where s.id = ${hashToken(token)} and s.expires_at > now()`;
	if (!row || row.status !== 'active') return null;

	// Sliding expiry: extend sessions that are past their halfway point.
	if (row.expires_at.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY) {
		await sql`update sessions set expires_at = ${new Date(Date.now() + SESSION_DAYS * DAY)} where id = ${hashToken(token)}`;
	}
	return {
		id: row.id,
		email: row.email ?? null,
		needsOnboarding: row.birthdate == null,
		isAdmin: row.is_admin,
		displayName: row.display_name ?? null,
		hasProfile: row.display_name != null
	};
}

export async function deleteSession(token: string) {
	await sql`delete from sessions where id = ${hashToken(token)}`;
}

export function setSessionCookie(cookies: Cookies, token: string, expires: Date, secure: boolean) {
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, expires });
}

export function isAdult(birthdate: Date) {
	const cutoff = new Date();
	cutoff.setFullYear(cutoff.getFullYear() - 18);
	return birthdate <= cutoff;
}
