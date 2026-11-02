import type { Actions, PageServerLoad } from './$types';
import { sql } from '#lib/server/db.ts';
import { photoUrl } from '#lib/server/photos.ts';
import { REPORT_REASONS } from '#lib/server/safety.ts';

export const load: PageServerLoad = async () => {
	const reports = await sql`
		select r.id::text, r.reason, r.details, r.created_at, r.target_id,
			tp.display_name as target_name, tu.email as target_email, tu.status as target_status,
			rp.display_name as reporter_name,
			(select count(*)::int from reports x where x.target_id = r.target_id) as total_reports,
			coalesce((select array_agg(filename order by position) from photos where user_id = r.target_id), '{}') as photos
		from reports r
		join users tu on tu.id = r.target_id
		left join profiles tp on tp.user_id = r.target_id
		left join profiles rp on rp.user_id = r.reporter_id
		where r.status = 'open'
		order by r.created_at`;
	return {
		reasons: REPORT_REASONS as Record<string, string>,
		reports: reports.map((r) => ({
			id: r.id as string,
			reason: r.reason as string,
			details: r.details as string,
			created_at: r.created_at as Date,
			target_id: r.target_id as string,
			target_name: r.target_name as string | null,
			target_email: r.target_email as string,
			reporter_name: r.reporter_name as string | null,
			total_reports: r.total_reports as number,
			photos: (r.photos as string[]).map(photoUrl)
		}))
	};
};

export const actions: Actions = {
	dismiss: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		await sql`update reports set status = 'dismissed', handled_by = ${locals.user!.id} where id = ${id}`;
	},
	suspend: async ({ request, locals }) => {
		const form = await request.formData();
		const target = String(form.get('target'));
		await sql.begin(async (tx) => {
			await tx`update users set status = 'suspended' where id = ${target} and not is_admin`;
			await tx`delete from sessions where user_id = ${target}`;
			await tx`update reports set status = 'actioned', handled_by = ${locals.user!.id}
				where target_id = ${target} and status = 'open'`;
		});
	},
	hidePhotos: async ({ request, locals }) => {
		const form = await request.formData();
		const target = String(form.get('target'));
		await sql`update photos set hidden = true where user_id = ${target}`;
		await sql`update reports set status = 'actioned', handled_by = ${locals.user!.id} where id = ${String(form.get('id'))}`;
	}
};
