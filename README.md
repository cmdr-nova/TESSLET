# Tesslet

A dating app where everything is free. See everyone who liked you, match, and chat. No subscriptions, no blurred "likes you" grid, no paid boosts.

Built with SvelteKit (TypeScript), Postgres + PostGIS, and plain Server-Sent Events for live chat. Self-hosts on one small server with Docker Compose.

## Run it locally (Docker)

You only need Docker.

```sh
git clone https://github.com/cmdr-nova/tesslet
cd tesslet
ADMIN_EMAILS=you@example.com docker compose up --build
```

Open http://localhost:3000, sign up with the email you put in `ADMIN_EMAILS` (that account gets the `/admin` moderation queue), and fill in your profile. On the profile page, "Use my current location" fills in your coordinates.

### Add demo people to swipe on

```sh
docker compose exec app node scripts/seed.js 51.5072 -0.1276
```

Pass your own latitude and longitude so the demo people land near you. Run it again after you've signed up and a few of them will already like you, so the "Liked you" tab has something in it. Every demo account's password is `password1234` (for example `ava@demo.local`), so you can log in as one in a private window and chat with yourself.

## Develop without Docker for the app

```sh
docker compose up -d db          # first uncomment the db "ports" line in docker-compose.yml
cp .env.example .env             # then edit ADMIN_EMAILS
npm install
npm run db:migrate
npm run db:seed
npm run dev                      # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run check` | Typecheck (svelte-check) |
| `npm test` | Unit tests (`src/**/*.test.ts`, Node's built-in runner) |
| `npm run build` then `npm start` | Production build, migrate, serve on port 3000 |
| `npm run test:e2e` | Playwright run through the whole core loop against a running, freshly seeded server |
| `npm run db:migrate` | Apply new files in `migrations/` |
| `npm run db:seed` | Add demo people |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://tesslet:tesslet@localhost:5432/tesslet` | Postgres with PostGIS |
| `UPLOAD_DIR` | `./data/uploads` (`/data/uploads` in Docker) | Where photos are stored |
| `APP_NAME` | `Tesslet` | Shown in the header and About page |
| `ADMIN_EMAILS` | empty | Comma-separated; these accounts get `/admin` when they sign up |
| `SUPPORT_URL` | `https://mkultra.monster/clearance/` | The support link on the About page |
| `POSTGRES_PASSWORD` | `tesslet` | Compose only. Change it for anything public |
| `PORT` | `3000` | HTTP port |

## Deploying

Put it behind a reverse proxy that terminates HTTPS and sets `X-Forwarded-Proto` (Caddy does this by default). A minimal Caddyfile:

```
tesslet.example.com {
	reverse_proxy localhost:3000
}
```

Set a real `POSTGRES_PASSWORD`, and back up the `db` and `uploads` volumes.

## How the important bits work

- **Matching**: a like is a row in `swipes`. When the other person's like already exists, a `matches` row is created in the same transaction, under an advisory lock on the pair so two simultaneous likes can't miss each other (`src/lib/server/matching.ts`).
- **Discovery** only shows people where both sides fit each other's gender, age, and distance filters, who have a photo, and with no block either way (`src/lib/server/people.ts`).
- **Chat**: sending inserts a message and fires `pg_notify`; each open chat holds an SSE stream that gets new messages pushed to it (`src/lib/server/chat.ts`, `src/routes/chat/[id]/stream`).
- **Location privacy**: coordinates are snapped to a ~2 km grid before they're stored, and distances are only shown as buckets like "Less than 10 km away". Exact "X km away" readouts let attackers trilaterate people.
- **Photos** are re-encoded to WebP with `sharp`, which strips EXIF (including GPS), and are only served to signed-in users.
- **Blocking** removes both people from each other's discovery, likes, matches, and chat. Reporting also blocks.
- **Rate limits** on sign-up, login, swipes, messages, and reports are in memory (`src/lib/server/ratelimit.ts`). Move them to Postgres or Redis if you ever run more than one app container.

## Versioning and releases

Tesslet uses [Semantic Versioning](https://semver.org/) and keeps a [CHANGELOG](CHANGELOG.md).

To cut a release:

1. Move the `Unreleased` notes in `CHANGELOG.md` under a new version heading.
2. `npm version <patch|minor|major> --no-git-tag-version` and commit both files.
3. `git tag vX.Y.Z && git push origin main --tags`

The Release workflow checks the tag matches `package.json`, publishes `ghcr.io/cmdr-nova/tesslet:X.Y.Z` (plus `X.Y` and `latest`), and creates a GitHub release from the changelog entry.

CI runs on every push to `main` and every pull request: typecheck, unit tests, build, migrations, seed, the full end-to-end test, and a Docker build.
