create table if not exists resource_delivery_attempts (
  id bigint generated always as identity primary key,
  resource_id uuid references resources(id) on delete set null,
  email_hash char(64) not null,
  ip_hash char(64),
  accepted boolean not null,
  reason text check (reason is null or char_length(reason) between 2 and 40),
  attempted_at timestamptz not null default now()
);

create index if not exists resource_delivery_attempts_email_time_idx
  on resource_delivery_attempts (email_hash, attempted_at desc);
create index if not exists resource_delivery_attempts_ip_time_idx
  on resource_delivery_attempts (ip_hash, attempted_at desc)
  where ip_hash is not null;
create index if not exists resource_delivery_attempts_accepted_time_idx
  on resource_delivery_attempts (attempted_at desc)
  where accepted = true;

update resources
set access_model = 'email',
    updated_at = now()
where category = 'midi'
  and access_model <> 'email';

do $$ begin
  alter table resources
    add constraint resources_midi_requires_email
    check (category <> 'midi' or access_model = 'email');
exception when duplicate_object then null;
end $$;
