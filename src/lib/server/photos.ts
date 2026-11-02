import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.ts';
import { sql } from './db.ts';

export const MAX_PHOTOS = 6;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Re-encodes every upload to WebP. That does three jobs at once:
 * rejects anything that isn't really an image, caps the size, and strips
 * EXIF metadata (which can include the exact GPS spot the photo was taken).
 */
export async function processImage(input: Buffer) {
	return sharp(input, { limitInputPixels: 50_000_000 })
		.rotate() // apply EXIF orientation before the metadata is dropped
		.resize(1080, 1350, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 82 })
		.toBuffer();
}

export async function storeImage(data: Buffer) {
	await mkdir(config.uploadDir, { recursive: true });
	const filename = `${randomBytes(16).toString('hex')}.webp`;
	await writeFile(path.join(config.uploadDir, filename), data);
	return filename;
}

export async function addPhoto(userId: string, file: File) {
	if (file.size === 0) throw new Error('Pick a photo first.');
	if (file.size > MAX_BYTES) throw new Error('Photos must be under 10 MB.');
	const [{ count }] = await sql`select count(*)::int as count from photos where user_id = ${userId}`;
	if (count >= MAX_PHOTOS) throw new Error(`You can have up to ${MAX_PHOTOS} photos.`);

	let data: Buffer;
	try {
		data = await processImage(Buffer.from(await file.arrayBuffer()));
	} catch {
		throw new Error("That file doesn't look like an image we can read (try JPG, PNG, or WebP).");
	}
	const filename = await storeImage(data);
	await sql`insert into photos (user_id, filename, position) values (${userId}, ${filename}, ${count})`;
}

export async function removePhoto(userId: string, photoId: string) {
	const [row] = await sql`delete from photos where id = ${photoId} and user_id = ${userId} returning filename`;
	if (row) await unlink(path.join(config.uploadDir, row.filename)).catch(() => {});
}

export const photoUrl = (filename: string) => `/photos/${filename}`;
