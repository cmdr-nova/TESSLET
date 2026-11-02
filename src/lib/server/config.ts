// Server config, read from process.env (and .env during local dev).
import pkg from '../../../package.json' with { type: 'json' };

try {
	process.loadEnvFile();
} catch {
	// no .env file, that's fine in Docker
}

export const config = {
	version: pkg.version as string,
	databaseUrl: process.env.DATABASE_URL ?? 'postgres://tesslet:tesslet@localhost:5432/tesslet',
	uploadDir: process.env.UPLOAD_DIR ?? './data/uploads',
	/** Public https URL of this server, e.g. https://tesslet.example. Needed for Bluesky/ATProto login in production. */
	publicUrl: (process.env.PUBLIC_URL ?? '').replace(/\/+$/, ''),
	port: Number(process.env.PORT ?? 3000),
	/** DEV/TEST ONLY: lets fediverse login talk to http://localhost instances. Never set in production. */
	fediDevAllowLocal: process.env.FEDI_DEV_ALLOW_LOCAL === '1',
	appName: process.env.APP_NAME ?? 'Tesslet',
	supportUrl: process.env.SUPPORT_URL ?? 'https://mkultra.monster/support/',
	adminEmails: (process.env.ADMIN_EMAILS ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean)
};
