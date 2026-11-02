import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { parseCoords } from '#lib/server/geo.ts';
import { MAX_PHOTOS, addPhoto, photoUrl, removePhoto } from '#lib/server/photos.ts';

const GENDERS = ['woman', 'man', 'nonbinary'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const [profile] = await sql`
		select display_name, bio, pronouns, gender, interested_in, age_min, age_max, max_distance_km,
			location is not null as has_location
		from profiles where user_id = ${me}`;
	const photos = await sql`select id, filename from photos where user_id = ${me} order by position`;
	return {
		profile: profile ?? null,
		photos: photos.map((p) => ({ id: p.id as string, url: photoUrl(p.filename) })),
		maxPhotos: MAX_PHOTOS
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const me = locals.user!.id;
		const form = await request.formData();
		const name = String(form.get('display_name') ?? '').trim();
		const bio = String(form.get('bio') ?? '').trim();
		const pronouns = String(form.get('pronouns') ?? '').trim();
		const gender = String(form.get('gender') ?? '');
		const interestedIn = form.getAll('interested_in').map(String).filter((g) => (GENDERS as readonly string[]).includes(g));
		const ageMin = Math.max(18, Number(form.get('age_min')) || 18);
		const ageMax = Math.min(120, Math.max(ageMin, Number(form.get('age_max')) || 99));
		const distance = Math.min(500, Math.max(1, Number(form.get('max_distance_km')) || 50));
		const coords = parseCoords(form.get('lat'), form.get('lng'));

		if (!name || name.length > 40) return fail(400, { error: 'Your name needs to be 1 to 40 characters.' });
		if (bio.length > 1000) return fail(400, { error: 'Keep your bio under 1000 characters.' });
		if (pronouns.length > 30) return fail(400, { error: 'Pronouns are capped at 30 characters.' });
		if (!(GENDERS as readonly string[]).includes(gender)) return fail(400, { error: 'Pick how you identify.' });
		if (interestedIn.length === 0) return fail(400, { error: "Pick at least one group you're interested in." });

		const point = coords ? sql`ST_SetSRID(ST_MakePoint(${coords.lng}, ${coords.lat}), 4326)::geography` : null;
		await sql`
			insert into profiles (user_id, display_name, bio, pronouns, gender, interested_in, age_min, age_max, max_distance_km, location)
			values (${me}, ${name}, ${bio}, ${pronouns}, ${gender}, ${interestedIn}, ${ageMin}, ${ageMax}, ${distance}, ${point})
			on conflict (user_id) do update set
				display_name = excluded.display_name, bio = excluded.bio, pronouns = excluded.pronouns,
				gender = excluded.gender, interested_in = excluded.interested_in, age_min = excluded.age_min,
				age_max = excluded.age_max, max_distance_km = excluded.max_distance_km,
				location = coalesce(excluded.location, profiles.location)`;

		const isNew = !locals.user!.hasProfile;
		if (isNew) redirect(303, '/profile?welcome=1');
		return { saved: true };
	},

	addPhoto: async ({ request, locals }) => {
		if (!locals.user!.hasProfile) return fail(400, { error: 'Save your profile first, then add photos.' });
		const file = (await request.formData()).get('photo');
		if (!(file instanceof File)) return fail(400, { error: 'Pick a photo first.' });
		try {
			await addPhoto(locals.user!.id, file);
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
		return { photoAdded: true };
	},

	removePhoto: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		await removePhoto(locals.user!.id, id);
		return { photoRemoved: true };
	}
};
