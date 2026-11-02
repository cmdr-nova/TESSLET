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
	appName: process.env.APP_NAME ?? 'Tesslet',
	supportUrl: process.env.SUPPORT_URL ?? 'https://mkultra.monster/clearance/',
	adminEmails: (process.env.ADMIN_EMAILS ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean)
};
