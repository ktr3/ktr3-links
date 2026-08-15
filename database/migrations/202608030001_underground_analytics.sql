alter type web_event_type add value if not exists 'role_filter_selected';
alter type web_event_type add value if not exists 'search_used';

create index if not exists web_events_time_idx
  on web_events (occurred_at desc);
create index if not exists web_events_visitor_time_idx
  on web_events (visitor_hash, occurred_at desc);
create index if not exists web_events_type_time_idx
  on web_events (event_type, occurred_at desc);
