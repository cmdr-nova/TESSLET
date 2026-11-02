# Changelog

All notable changes to Tesslet are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/cmdr-nova/tesslet/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cmdr-nova/tesslet/releases/tag/v0.1.0
