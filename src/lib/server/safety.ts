import { sql } from './db.ts';

/** SQL fragment: true when either user has blocked the other. */
export const blockedBetween = (a: string, b: string) => sql`
	exists (select 1 from blocks where (blocker_id = ${a} and blocked_id = ${b}) or (blocker_id = ${b} and blocked_id = ${a}))`;

export async function block(me: string, target: string) {
	if (me === target) return;
	await sql.begin(async (tx) => {
		await tx`insert into blocks (blocker_id, blocked_id) values (${me}, ${target}) on conflict do nothing`;
		await tx`update matches set unmatched_at = now()
			where user_a = ${me < target ? me : target} and user_b = ${me < target ? target : me} and unmatched_at is null`;
	});
}

export const REPORT_REASONS = {
	fake: 'Fake profile or scam',
	harassment: 'Harassment or threats',
	spam: 'Spam or advertising',
	underage: 'Looks under 18',
	inappropriate_photos: 'Inappropriate photos',
	other: 'Something else'
} as const;

export async function report(me: string, target: string, reason: string, details: string) {
	if (me === target || !(reason in REPORT_REASONS)) return false;
	await sql`insert into reports (reporter_id, target_id, reason, details)
		values (${me}, ${target}, ${reason}, ${details.slice(0, 2000)})`;
	return true;
}
