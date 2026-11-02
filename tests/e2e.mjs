// End-to-end smoke test of the whole core loop, against a running server.
// Expects a fresh database that has been migrated and seeded (npm run db:seed),
// with ADMIN_EMAILS including e2e@test.local. Run: BASE_URL=http://localhost:3000 npm run test:e2e
import { chromium } from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const step = (name) => console.log(`✓ ${name}`);

const dir = await mkdtemp(path.join(tmpdir(), 'tesslet-e2e-'));
const jpgPath = path.join(dir, 'me.jpg');
// A landscape JPEG carrying GPS EXIF, to prove uploads get cropped to 4:5 and scrubbed.
await writeFile(
	jpgPath,
	await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#33aa77' } })
		.jpeg()
		.withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } })
		.toBuffer()
);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
async function newUser() {
	const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(e.message));
	return { ctx, page };
}

try {
	const { ctx: ctxA, page: a } = await newUser();

	await a.goto(`${BASE}/signup`);
	await a.fill('input[name=email]', 'e2e@test.local');
	await a.fill('input[name=password]', 'supersecret123');
	await a.fill('input[name=birthdate]', '1995-05-05');
	await a.check('input[name=agree]');
	await a.click('button:has-text("Sign up")');
	await a.waitForURL('**/profile');
	await a.goto(`${BASE}/discover`);
	assert.match(a.url(), /\/profile$/, 'users without a profile are sent to /profile');
	step('sign up + profile gate');

	await a.fill('input[name=display_name]', 'Valerie');
	await a.fill('input[name=pronouns]', 'she/her');
	await a.fill('textarea[name=bio]', 'I run fediverse servers.');
	await a.check('input[name=gender][value=woman]');
	for (const g of ['woman', 'man', 'nonbinary']) await a.check(`input[name=interested_in][value=${g}]`);
	await a.fill('input[name=lat]', '51.5153');
	await a.fill('input[name=lng]', '-0.1410');
	await a.click('button:has-text("Save profile")');
	await a.waitForURL('**/profile?welcome=1');
	await a.setInputFiles('input[name=photo]', jpgPath);
	await a.waitForSelector('[role=dialog] .frame img');
	const frame = await (await a.$('[role=dialog] .frame'))?.boundingBox();
	assert.ok(frame, 'cropper opens after picking a photo');
	await a.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
	await a.mouse.down();
	await a.mouse.move(frame.x + frame.width / 2 + 60, frame.y + frame.height / 2, { steps: 5 });
	await a.mouse.up();
	await a.click('button:has-text("Use photo")');
	await a.waitForSelector('img.photo');
	assert.equal(await a.$('[role=dialog]'), null, 'cropper closes after upload');
	step('profile + photo upload through the cropper');

	const ownPhoto = await a.getAttribute('img.photo', 'src');
	const meta = await sharp(await (await ctxA.request.get(BASE + ownPhoto)).body()).metadata();
	assert.equal(meta.format, 'webp');
	assert.deepEqual([meta.width, meta.height], [1080, 1350], 'cropped to the 4:5 profile frame');
	assert.equal(meta.exif, undefined, 'EXIF must be stripped');
	const anon = await browser.newContext();
	assert.equal((await anon.request.get(BASE + ownPhoto, { maxRedirects: 0 })).status(), 303, 'photos need login');
	step('photos re-encoded, EXIF stripped, login required');

	await a.goto(`${BASE}/discover`);
	await a.waitForSelector('article h2');
	const seen = [];
	for (let i = 0; i < 20; i++) {
		const h = await a.$('article h2');
		if (!h) break;
		const name = (await h.textContent()).trim();
		seen.push(name);
		await a.click(name.startsWith('Ava') ? 'button:has-text("Like")' : 'button:has-text("Pass")');
		await a.waitForFunction((prev) => document.querySelector('article h2')?.textContent?.trim() !== prev, name);
	}
	assert.equal(seen.length, 12, `expected all 12 seeded people, saw ${seen.length}`);
	assert.ok((await a.textContent('main')).includes('seen everyone'));
	step('discover: swiped through every seeded person');

	const { page: b } = await newUser();
	await b.goto(`${BASE}/login`);
	await b.fill('input[name=email]', 'ava@demo.local');
	await b.fill('input[name=password]', 'password1234');
	await b.click('button:has-text("Log in")');
	await b.waitForURL('**/discover');
	assert.match(await b.textContent('nav a[href="/likes"]'), /1/);
	await b.goto(`${BASE}/likes`);
	assert.match(await b.textContent('article h2'), /Valerie/);
	assert.equal(await b.$('.blur, [style*="blur"]'), null, 'nothing is blurred');
	step('liked-you list is fully visible');

	await b.click('button:has-text("Like back")');
	await b.waitForURL('**/chat/**');
	const chatPath = new URL(b.url()).pathname;
	await a.goto(`${BASE}/matches`);
	await a.click('a.person');
	await a.waitForURL(`**${chatPath}`);
	step('mutual like creates a match for both people');

	await a.waitForTimeout(500); // let the event stream connect
	await b.fill('textarea[name=body]', 'hey Valerie!');
	await b.click('button:has-text("Send")');
	await a.waitForSelector('.bubble:has-text("hey Valerie")', { timeout: 5000 });
	await a.fill('textarea[name=body]', 'hi Ava!');
	await a.press('textarea[name=body]', 'Enter');
	await b.waitForSelector('.bubble:has-text("hi Ava")', { timeout: 5000 });
	step('real-time chat both ways');

	await b.goto(`${BASE}${(await b.getAttribute('.top a.person', 'href')) ?? ''}`);
	await b.selectOption('select[name=reason]', 'spam');
	await b.click('button:has-text("Report and block")');
	await b.waitForURL('**/discover?reported=1');
	assert.equal((await a.goto(BASE + chatPath)).status(), 404);
	await a.goto(`${BASE}/matches`);
	assert.ok((await a.textContent('main')).includes('No matches'));
	step('report + block closes the match for both');

	await a.goto(`${BASE}/admin`);
	assert.ok((await a.textContent('main')).includes('Spam'));
	step('report lands in the admin queue');

	const data = await (await ctxA.request.get(`${BASE}/account/export`)).json();
	assert.equal(data.messages_sent.length, 1);
	step('data export');

	assert.deepEqual(errors, [], 'no client-side errors');
	console.log('\nAll e2e checks passed.');
} finally {
	await browser.close();
}
