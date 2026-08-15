alter table subscribers
  add column if not exists email_provider text,
  add column if not exists provider_contact_id text,
  add column if not exists provider_synced_at timestamptz,
  add column if not exists provider_sync_error text;
