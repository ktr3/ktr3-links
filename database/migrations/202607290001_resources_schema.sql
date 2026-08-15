do $$ begin
  create type resource_category as enum ('serum', 'midi', 'fx', 'template', 'samples', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type resource_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type resource_access_model as enum ('open', 'email');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type resource_file_kind as enum ('download', 'cover', 'preview');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type subscriber_status as enum ('pending', 'confirmed', 'unsubscribed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type resource_download_channel as enum ('open', 'email');
exception when duplicate_object then null;
end $$;

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists admin_login_attempts (
  id bigint generated always as identity primary key,
  identifier_hash char(64) not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 100),
  summary text not null check (char_length(summary) between 10 and 180),
  description text not null check (char_length(description) between 10 and 5000),
  category resource_category not null,
  tags text[] not null default '{}',
  status resource_status not null default 'draft',
  access_model resource_access_model not null default 'email',
  published_at timestamptz,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(tags) <= 12)
);

create table if not exists resource_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  kind resource_file_kind not null,
  storage_key text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 180),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  size_bytes bigint not null check (size_bytes > 0),
  sha256 char(64) not null,
  created_at timestamptz not null default now(),
  unique (resource_id, kind)
);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  name text check (name is null or char_length(name) between 1 and 80),
  status subscriber_status not null default 'pending',
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  consent_source text,
  consent_version text,
  confirmation_token_hash char(64),
  confirmation_expires_at timestamptz,
  confirmed_at timestamptz,
  unsubscribe_token_hash char(64) not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (marketing_consent = false or consent_at is not null)
);

create unique index if not exists subscribers_email_unique
  on subscribers (lower(email));

create table if not exists resource_delivery_grants (
  id uuid primary key default gen_random_uuid(),
  token_hash char(64) not null unique,
  resource_id uuid not null references resources(id) on delete cascade,
  resource_file_id uuid not null references resource_files(id) on delete cascade,
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  expires_at timestamptz not null,
  downloads_remaining smallint not null default 3 check (downloads_remaining between 0 and 10),
  created_at timestamptz not null default now()
);

create table if not exists resource_downloads (
  id bigint generated always as identity primary key,
  resource_id uuid not null references resources(id) on delete cascade,
  resource_file_id uuid not null references resource_files(id) on delete cascade,
  subscriber_id uuid references subscribers(id) on delete set null,
  channel resource_download_channel not null,
  occurred_at timestamptz not null default now()
);

create table if not exists resource_audit_events (
  id bigint generated always as identity primary key,
  resource_id uuid references resources(id) on delete set null,
  actor_id uuid references admin_users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_expiry_idx on admin_sessions (expires_at);
create index if not exists admin_login_attempts_rate_idx
  on admin_login_attempts (identifier_hash, attempted_at desc);
create index if not exists resources_public_idx
  on resources (category, published_at desc) where status = 'published';
create index if not exists resource_files_resource_idx on resource_files (resource_id, kind);
create index if not exists subscribers_status_idx on subscribers (status, created_at desc);
create index if not exists delivery_grants_expiry_idx on resource_delivery_grants (expires_at);
create index if not exists resource_downloads_resource_time_idx
  on resource_downloads (resource_id, occurred_at desc);
