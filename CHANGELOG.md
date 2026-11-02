# Changelog

All notable changes to Tesslet are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] - 2026-11-02

### Added
- Photo cropper: picking a photo opens a 4:5 crop frame with drag to move, scroll/pinch/slider to zoom, and keyboard controls. Uploads still work without JavaScript.

### Changed
- Buttons redesigned: no more text wrapping, consistent heights, clearer outlined secondary style, hover/press/focus states.
- Landing page call-to-action buttons sit side by side on wide screens and stack at equal widths on phones.

## [0.2.0] - 2026-11-02

### Added
- Sign in or sign up with a fediverse account (Mastodon, GoToSocial, Akkoma, and other servers with the Mastodon API).
- Sign in or sign up with Bluesky or any ATProto PDS, via ATProto OAuth.
- Connect or disconnect those accounts from the Account page, and optionally show your handle on your dating profile.
- Age gate at /welcome for accounts created without email, which can also add an optional email.
- Passwordless accounts confirm deletion by typing DELETE.
- SSRF guard for fediverse sign-in: only public hostnames, no IPs or private networks, no redirects, 10 second timeouts.
- `PUBLIC_URL` setting, and `/oauth-client-metadata.json` for ATProto.

### Changed
- Releases are automatic: merging a version bump to main tags it, publishes the Docker image, and creates the GitHub release.
- Default support link is now https://mkultra.monster/support/.

## [0.1.0] - 2026-11-02

### Added
- Email + password accounts with an 18+ gate, Argon2 password hashing, and hashed session tokens.
- Profiles: name, pronouns, bio, gender, who you want to see, age range, distance, up to 6 photos.
- Discover: a swipeable card stack filtered both ways (you fit their filters and they fit yours).
- "Liked you": everyone who liked you, fully visible, with one-tap like back.
- Mutual matches, created race-free with a per-pair advisory lock.
- Real-time chat over Server-Sent Events backed by Postgres LISTEN/NOTIFY, with read receipts.
- Safety: block, report (which also blocks), unmatch, admin moderation queue (dismiss, hide photos, suspend).
- Privacy: locations snapped to a ~2 km grid, distances shown only as buckets, photos re-encoded to strip EXIF/GPS, photos only served to signed-in users.
- Account page with full JSON data export and permanent account deletion.
- About page with an optional support link. No in-app payments.
- Installable PWA manifest, light and dark themes.
- Docker Compose setup (app + PostGIS), demo seed script, unit tests, Playwright end-to-end test, CI and release workflows.

[Unreleased]: https://github.com/cmdr-nova/tesslet/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/cmdr-nova/tesslet/releases/tag/v0.3.0
[0.2.0]: https://github.com/cmdr-nova/tesslet/releases/tag/v0.2.0
[0.1.0]: https://github.com/cmdr-nova/tesslet/commit/6a650ee
