// Applies every migrations/*.sql file that hasn't run yet, in filename order.
// Usage: node scripts/migrate.js   (reads DATABASE_URL, or .env if present)
import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

try { process.loadEnvFile(); } catch {}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://tesslet:tesslet@localhost:5432/tesslet', { onnotice: () => {} });

await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

for (const file of files) {
  if (done.has(file)) continue;
  const text = await readFile(path.join(dir, file), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
    await tx`insert into schema_migrations (name) values (${file})`;
  });
  console.log(`applied ${file}`);
}
console.log('migrations up to date');
await sql.end();
