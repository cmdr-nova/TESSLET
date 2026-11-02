-- Sign in with the fediverse (Mastodon API servers) or ATProto (Bluesky and other PDSes).
-- Accounts created this way have no email or password, and add their birthdate at /welcome.
alter table users alter column email drop not null;
alter table users alter column password_hash drop not null;
alter table users alter column birthdate drop not null;

create table identities (
  provider    text not null check (provider in ('mastodon', 'atproto')),
  subject     text not null, -- mastodon: "<instance host>:<account id>", atproto: the DID
  user_id     uuid not null references users on delete cascade,
  handle      text not null, -- "@name@instance" or "name.bsky.social"
  profile_url text,
  created_at  timestamptz not null default now(),
  primary key (provider, subject)
);
create index identities_user_idx on identities (user_id);

-- Opt-in: show your linked handle on your dating profile.
alter table profiles add column show_handle boolean not null default false;

-- Per-instance OAuth apps we registered via POST /api/v1/apps.
create table fedi_apps (
  instance      text not null,
  redirect_uri  text not null,
  client_id     text not null,
  client_secret text not null,
  created_at    timestamptz not null default now(),
  primary key (instance, redirect_uri)
);

-- Storage for @atproto/oauth-client-node (in-flight logins and token sessions).
create table atproto_oauth_state (
  key        text primary key,
  value      jsonb not null,
  created_at timestamptz not null default now()
);
create table atproto_oauth_session (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
