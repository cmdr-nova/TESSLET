// Tiny in-memory sliding-window limiter. Fine for one server process; swap for
// Redis or a Postgres table if you ever run more than one app container.
const buckets = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number) {
	const now = Date.now();
	const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
	const ok = hits.length < limit;
	if (ok) hits.push(now);
	buckets.set(key, hits);
	return ok;
}

setInterval(() => {
	const now = Date.now();
	for (const [key, hits] of buckets) {
		if (hits.every((t) => now - t > 60 * 60 * 1000)) buckets.delete(key);
	}
}, 10 * 60 * 1000).unref();
