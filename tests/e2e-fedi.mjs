// End-to-end test of fediverse sign-in against tests/mock-mastodon.mjs.
// The app must run with FEDI_DEV_ALLOW_LOCAL=1 so it may talk to http://localhost.
// Run: MOCK_URL=localhost:4010 BASE_URL=http://localhost:3000 npm run test:e2e:fedi
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const MOCK = process.env.MOCK_URL ?? 'localhost:4010';
const step = (name) => console.log(`✓ ${name}`);
const mockUser = (username) =>
	fetch(`http://${MOCK}/__mock/user`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username }) });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const newPage = async () => {
	const page = await (await browser.newContext()).newPage();
	page.on('pageerror', (e) => errors.push(e.message));
	return page;
};

try {
	// 1. Brand-new account from a fediverse login
	await mockUser('fedival');
	const a = await newPage();
	await a.goto(`${BASE}/login`);
	await a.fill('input[name=instance]', `@fedival@${MOCK}`);
	await a.click('button:has-text("Continue with the fediverse")');
	await a.waitForURL('**/welcome');
	assert.match(await a.textContent('h1'), /@fedival@localhost:4010/);
	await a.goto(`${BASE}/discover`);
	assert.match(a.url(), /\/welcome$/, 'age gate cannot be skipped');
	step('fediverse sign-in creates an account and lands on the age gate');

	await a.fill('input[name=birthdate]', '2015-01-01');
	await a.check('input[name=agree]');
	await a.click('button:has-text("Continue")');
	assert.match(await a.textContent('.error'), /18 or older/);
	await a.fill('input[name=birthdate]', '1994-01-01');
	await a.check('input[name=agree]');
	await a.click('button:has-text("Continue")');
	await a.waitForURL('**/profile');
	step('under-18 rejected, adult continues to profile setup');

	await a.fill('input[name=display_name]', 'Fedi Val');
	await a.check('input[name=gender][value=woman]');
	await a.check('input[name=interested_in][value=woman]');
	await a.check('input[name=show_handle]');
	await a.click('button:has-text("Save profile")');
	await a.waitForURL('**/profile?welcome=1');
	await a.click('button.link:has-text("Log out")');
	await a.waitForURL(`${BASE}/`);

	// 2. Same fediverse account signs in again -> same Tesslet account
	await a.goto(`${BASE}/login`);
	await a.fill('input[name=instance]', MOCK);
	await a.click('button:has-text("Continue with the fediverse")');
	await a.waitForURL('**/discover');
	await a.goto(`${BASE}/account`);
	assert.match(await a.textContent('main'), /@fedival@localhost:4010/);
	assert.ok(await a.$('input[name=confirm]'), 'passwordless accounts confirm deletion by typing DELETE');
	step('returning fediverse sign-in reuses the same account');

	// 3. Password account links a different fediverse identity, and can't steal fedival
	const b = await newPage();
	await b.goto(`${BASE}/signup`);
	await b.fill('input[name=email]', 'linker@test.local');
	await b.fill('input[name=password]', 'supersecret123');
	await b.fill('input[name=birthdate]', '1990-02-02');
	await b.check('input[name=agree]');
	await b.click('button:has-text("Sign up")');
	await b.waitForURL('**/profile');
	await b.goto(`${BASE}/account`);
	await mockUser('linker');
	await b.fill('input[name=instance]', MOCK);
	await b.click('button:has-text("Continue with the fediverse")');
	await b.waitForURL('**/account?linked=1');
	assert.match(await b.textContent('main'), /@linker@localhost:4010/);
	await mockUser('fedival');
	await b.fill('input[name=instance]', MOCK);
	await b.click('button:has-text("Continue with the fediverse")');
	await b.waitForURL('**/account?error=*');
	assert.match(await b.textContent('.error'), /already linked to a different account/);
	step('linking works, and an identity can only belong to one account');

	// 4. Input validation and SSRF guard
	const c = await newPage();
	await c.goto(`${BASE}/login`);
	await c.fill('input[name=instance]', 'not a server');
	await c.click('button:has-text("Continue with the fediverse")');
	await c.waitForURL('**/login?error=*');
	await c.fill('input[name=instance]', '10.0.0.1');
	await c.click('button:has-text("Continue with the fediverse")');
	await c.waitForURL('**/login?error=*');
	await c.fill('input[name=handle]', 'not a handle!');
	await c.click('button:has-text("Continue with Bluesky")');
	await c.waitForURL('**/login?error=*');
	assert.match(await c.textContent('.error'), /Enter your handle/);
	step('bad servers, private IPs, and bad handles are rejected');

	// 5. Forged callback state is refused
	await c.goto(`${BASE}/auth/fedi/callback?code=abc&state=forged`);
	assert.match(c.url(), /\/login\?error=/);
	step('callbacks without a matching state cookie are refused');

	assert.deepEqual(errors, [], 'no client-side errors');
	console.log('\nAll fediverse login checks passed.');
} finally {
	await browser.close();
}
