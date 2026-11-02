// Creates demo people around a point so you can try swiping locally.
// Usage: node scripts/seed.js [lat] [lng]     (defaults to central London)
// Every demo account's password is "password1234". Some of them already like you
// once you sign up, so the "Liked you" tab has something in it.
import postgres from 'postgres';
import sharp from 'sharp';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

try { process.loadEnvFile(); } catch {}

const lat = Number(process.argv[2] ?? 51.5072);
const lng = Number(process.argv[3] ?? -0.1276);
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://tesslet:tesslet@localhost:5432/tesslet');
const uploadDir = process.env.UPLOAD_DIR ?? './data/uploads';
await mkdir(uploadDir, { recursive: true });

const people = [
	['Ava', 'woman', 'she/her', 27, 'Climbing gym regular, bad at karaoke, great at brunch.'],
	['Mia', 'woman', 'she/they', 31, 'Synth nerd. Ask me about modular.'],
	['Noor', 'woman', 'she/her', 24, 'Bookshop on Saturdays, pub quiz on Tuesdays.'],
	['Jules', 'nonbinary', 'they/them', 29, 'Film photography and too many houseplants.'],
	['Rowan', 'nonbinary', 'they/he', 33, 'Will cook for you. Will not share my fries.'],
	['Sam', 'man', 'he/him', 30, 'Cyclist, coffee snob, recovering hockey fan.'],
	['Theo', 'man', 'he/him', 26, 'I run a fediverse server for my local bird club.'],
	['Kai', 'man', 'he/they', 35, 'Board games, long walks, longer playlists.'],
	['Lena', 'woman', 'she/her', 38, 'Architect. I judge buildings, not people.'],
	['Iris', 'woman', 'she/her', 22, 'Art student. Dogs > cats (fight me).'],
	['Alex', 'nonbinary', 'they/them', 28, 'Roller derby and tabletop RPGs.'],
	['Marco', 'man', 'he/him', 41, 'Sourdough evangelist.']
];
const colors = ['#e8457c', '#6c5ce7', '#00b894', '#fdcb6e', '#0984e3', '#e17055', '#2d3436', '#a29bfe'];
const pwHash = await hash('password1234');

for (const [i, [name, gender, pronouns, age, bio]] of people.entries()) {
	const email = `${name.toLowerCase()}@demo.local`;
	const birthdate = new Date();
	birthdate.setFullYear(birthdate.getFullYear() - age, birthdate.getMonth(), birthdate.getDate() - 30);
	const [user] = await sql`
		insert into users (email, password_hash, birthdate) values (${email}, ${pwHash}, ${birthdate})
		on conflict (email) do update set email = excluded.email returning id`;
	const jitter = () => (Math.random() - 0.5) * 0.2;
	const plat = Math.round((lat + jitter()) / 0.02) * 0.02;
	const plng = Math.round((lng + jitter()) / 0.02) * 0.02;
	await sql`
		insert into profiles (user_id, display_name, bio, pronouns, gender, interested_in, location)
		values (${user.id}, ${name}, ${bio}, ${pronouns}, ${gender}, ${['woman', 'man', 'nonbinary']},
			ST_SetSRID(ST_MakePoint(${plng}, ${plat}), 4326)::geography)
		on conflict (user_id) do nothing`;
	const [{ count }] = await sql`select count(*)::int as count from photos where user_id = ${user.id}`;
	if (count === 0) {
		for (let n = 0; n < 2; n++) {
			const bg = colors[(i + n * 3) % colors.length];
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
				<rect width="100%" height="100%" fill="${bg}"/>
				<text x="50%" y="52%" font-size="420" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${name[0]}</text>
				<text x="50%" y="88%" font-size="64" font-family="sans-serif" fill="#fff" text-anchor="middle">demo photo ${n + 1}</text></svg>`;
			const data = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
			const filename = `${randomBytes(16).toString('hex')}.webp`;
			await writeFile(path.join(uploadDir, filename), data);
			await sql`insert into photos (user_id, filename, position) values (${user.id}, ${filename}, ${n})`;
		}
	}
}

// Every 3rd demo person likes every real (non-demo) account that exists right now.
const demoIds = (await sql`select id from users where email like '%@demo.local' order by email`).map((r) => r.id);
const realIds = (await sql`select id from users where email not like '%@demo.local'`).map((r) => r.id);
for (const [i, demo] of demoIds.entries()) {
	if (i % 3 !== 0) continue;
	for (const real of realIds) {
		await sql`insert into swipes (swiper_id, target_id, liked) values (${demo}, ${real}, true) on conflict do nothing`;
	}
}
console.log(`Seeded ${people.length} demo people near ${lat}, ${lng}. ${realIds.length ? `${Math.ceil(demoIds.length / 3)} of them like your account(s).` : 'Run this again after you sign up so some of them like you.'}`);
await sql.end();
