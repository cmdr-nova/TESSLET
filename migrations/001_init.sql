-- Core schema for tesslet.
create extension if not exists postgis;
create extension if not exists citext;

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         citext unique not null,
  password_hash text not null,
  birthdate     date not null,
  is_admin      boolean not null default false,
  status        text not null default 'active' check (status in ('active', 'suspended')),
  created_at    timestamptz not null default now()
);

-- Session ids are sha256 hashes of the cookie token, so a DB leak can't be replayed as cookies.
create table sessions (
  id         text primary key,
  user_id    uuid not null references users on delete cascade,
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions (user_id);

create table profiles (
  user_id         uuid primary key references users on delete cascade,
  display_name    text not null check (char_length(display_name) between 1 and 40),
  bio             text not null default '' check (char_length(bio) <= 1000),
  pronouns        text not null default '' check (char_length(pronouns) <= 30),
  gender          text not null check (gender in ('woman', 'man', 'nonbinary')),
  interested_in   text[] not null default '{}',
  age_min         int not null default 18 check (age_min >= 18),
  age_max         int not null default 99 check (age_max <= 120),
  max_distance_km int not null default 50 check (max_distance_km between 1 and 500),
  -- Always stored snapped to a coarse grid (see src/lib/server/geo.ts). Never store raw GPS.
  location        geography(Point, 4326),
  last_active     timestamptz not null default now()
);
create index profiles_location_idx on profiles using gist (location);

create table photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users on delete cascade,
  filename   text not null unique,
  position   int not null default 0,
  hidden     boolean not null default false, -- set by moderators
  created_at timestamptz not null default now()
);
create index photos_user_idx on photos (user_id, position);

create table swipes (
  swiper_id  uuid not null references users on delete cascade,
  target_id  uuid not null references users on delete cascade,
  liked      boolean not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index swipes_target_idx on swipes (target_id) where liked;

create table matches (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid not null references users on delete cascade,
  user_b       uuid not null references users on delete cascade,
  created_at   timestamptz not null default now(),
  unmatched_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index matches_b_idx on matches (user_b);

create table messages (
  id         bigserial primary key,
  match_id   uuid not null references matches on delete cascade,
  sender_id  uuid not null references users on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index messages_match_idx on messages (match_id, id);

create table blocks (
  blocker_id uuid not null references users on delete cascade,
  blocked_id uuid not null references users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create index blocks_blocked_idx on blocks (blocked_id);

create table reports (
  id          bigserial primary key,
  reporter_id uuid not null references users on delete cascade,
  target_id   uuid not null references users on delete cascade,
  reason      text not null check (reason in ('fake', 'harassment', 'spam', 'underage', 'inappropriate_photos', 'other')),
  details     text not null default '' check (char_length(details) <= 2000),
  status      text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by  uuid references users on delete set null,
  created_at  timestamptz not null default now()
);
create index reports_open_idx on reports (created_at) where status = 'open';
