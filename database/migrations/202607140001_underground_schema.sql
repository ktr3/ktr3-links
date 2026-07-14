create extension if not exists pgcrypto;

do $$ begin
  create type profile_role as enum ('artist', 'producer', 'dj', 'collective', 'visual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type moderation_status as enum ('pending', 'needs_changes', 'approved', 'rejected', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type link_platform as enum ('instagram', 'youtube', 'spotify', 'soundcloud', 'bandcamp', 'tiktok', 'apple_music', 'beatstars', 'website');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type web_event_type as enum ('random_impression', 'profile_open', 'search_result_click', 'external_link_click');
exception when duplicate_object then null;
end $$;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  password_hash text not null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 80),
  primary_role profile_role not null,
  city text check (city is null or char_length(city) <= 80),
  contact_email text not null check (char_length(contact_email) <= 254),
  message text check (message is null or char_length(message) <= 2000),
  submitted_links jsonb not null default '[]'::jsonb,
  consent_at timestamptz not null,
  status moderation_status not null default 'pending',
  possible_duplicate_profile_id uuid,
  moderation_notes text,
  reviewed_by uuid references admin_users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  normalized_name text not null,
  primary_role profile_role not null,
  city text check (city is null or char_length(city) <= 80),
  bio text check (bio is null or char_length(bio) <= 2000),
  status moderation_status not null default 'pending',
  source_submission_id uuid unique references submissions(id) on delete set null,
  consent_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table submissions drop constraint if exists submissions_possible_duplicate_profile_id_fkey;
alter table submissions
  add constraint submissions_possible_duplicate_profile_id_fkey
  foreign key (possible_duplicate_profile_id) references profiles(id) on delete set null;

create table if not exists profile_roles (
  profile_id uuid not null references profiles(id) on delete cascade,
  role profile_role not null,
  primary key (profile_id, role)
);

create table if not exists profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  platform link_platform not null,
  url text not null check (url ~ '^https://'),
  resource_type text check (resource_type is null or resource_type in ('artist', 'track', 'album', 'playlist')),
  resource_id text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (profile_id, platform, url)
);

create table if not exists moderation_events (
  id bigint generated always as identity primary key,
  submission_id uuid references submissions(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  actor_id uuid references admin_users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists web_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  session_id uuid not null,
  visitor_hash text not null check (char_length(visitor_hash) = 64),
  profile_id uuid references profiles(id) on delete set null,
  event_type web_event_type not null,
  destination_platform link_platform,
  context jsonb not null default '{}'::jsonb
);

create table if not exists profile_stats_daily (
  day date not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  random_impressions integer not null default 0 check (random_impressions >= 0),
  profile_opens integer not null default 0 check (profile_opens >= 0),
  search_selections integer not null default 0 check (search_selections >= 0),
  external_clicks integer not null default 0 check (external_clicks >= 0),
  unique_visitors integer not null default 0 check (unique_visitors >= 0),
  primary key (day, profile_id)
);

create unique index if not exists profiles_normalized_name_unique
  on profiles (normalized_name) where status <> 'archived';
create index if not exists profiles_public_directory_idx
  on profiles (primary_role, display_name) where status = 'approved';
create index if not exists submissions_queue_idx on submissions (status, created_at);
create index if not exists profile_links_profile_idx on profile_links (profile_id, platform);
create index if not exists web_events_profile_time_idx on web_events (profile_id, occurred_at desc);
create index if not exists web_events_session_time_idx on web_events (session_id, occurred_at desc);
