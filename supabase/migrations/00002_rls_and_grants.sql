-- Enable RLS on all tables
alter table tracked_topics enable row level security;
alter table events enable row level security;
alter table analyses enable row level security;
alter table deliveries enable row level security;
alter table ingestion_runs enable row level security;

-- No grants for anon or authenticated roles.
-- All access is server-side via service_role key.
-- This ensures the browser never touches these tables directly.

-- Explicitly revoke just in case defaults changed
revoke all on tracked_topics from anon, authenticated;
revoke all on events from anon, authenticated;
revoke all on analyses from anon, authenticated;
revoke all on deliveries from anon, authenticated;
revoke all on ingestion_runs from anon, authenticated;
