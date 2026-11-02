import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { config } from './config.ts';

// Fediverse login makes our server talk to whatever instance a visitor types in.
// These checks stop that from being used to reach private networks (SSRF).

const blocked = new BlockList();
for (const cidr of ['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16', '224.0.0.0/4']) {
	const [addr, prefix] = cidr.split('/');
	blocked.addSubnet(addr, Number(prefix), 'ipv4');
}
for (const cidr of ['::/127', 'fc00::/7', 'fe80::/10', 'ff00::/8', '::ffff:0:0/96']) {
	const [addr, prefix] = cidr.split('/');
	blocked.addSubnet(addr, Number(prefix), 'ipv6');
}

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const DEV_LOCAL = /^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

/** Accepts "mkultra.social", "https://mkultra.social/@val", "@val@mkultra.social", or "val@mkultra.social". */
export function normalizeInstance(input: string): string | null {
	let s = input.trim().toLowerCase().replace(/^https?:\/\//, '');
	if (s.includes('@')) s = s.split('/')[0].split('@').filter(Boolean).pop() ?? '';
	s = s.split('/')[0];
	if (config.fediDevAllowLocal && DEV_LOCAL.test(s)) return s;
	return HOSTNAME.test(s) ? s : null;
}

export function instanceBaseUrl(host: string) {
	return config.fediDevAllowLocal && DEV_LOCAL.test(host) ? `http://${host}` : `https://${host}`;
}

export async function assertPublicHost(host: string) {
	if (config.fediDevAllowLocal && DEV_LOCAL.test(host)) return;
	if (isIP(host)) throw new Error('Use the server name, not an IP address.');
	const addresses = await lookup(host, { all: true }).catch(() => []);
	if (addresses.length === 0) throw new Error(`Couldn't find a server called ${host}.`);
	for (const { address, family } of addresses) {
		if (blocked.check(address, family === 6 ? 'ipv6' : 'ipv4')) throw new Error(`${host} isn't a public server.`);
	}
}

/** fetch() for untrusted hosts: short timeout and no redirects. */
export async function safeFetch(url: string, init: RequestInit = {}) {
	return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10_000) });
}
