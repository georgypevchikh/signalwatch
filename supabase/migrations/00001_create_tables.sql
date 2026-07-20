-- SignalWatch core tables

-- Tracked topics for relevance filtering
create table tracked_topics (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  keywords text[] not null,
  excluded_keywords text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Raw events from external sources
create table events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('hacker_news')),
  external_id text not null,
  title text not null,
  url text,
  author text,
  published_at timestamptz,
  raw_payload jsonb not null,
  filter_score integer not null default 0,
  filter_version text not null,
  matched_topics text[] not null default '{}',
  status text not null check (status in ('new', 'ignored', 'analyzed', 'failed', 'dead'))
    default 'new',
  failure_code text,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

-- AI analysis results
create table analyses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid unique not null references events(id) on delete cascade,
  relevant boolean not null,
  category text not null check (category in ('ai', 'automation', 'developer_tools', 'security', 'other')),
  urgency text not null check (urgency in ('low', 'medium', 'high')),
  sentiment text not null check (sentiment in ('negative', 'neutral', 'positive', 'mixed')),
  confidence integer not null check (confidence between 0 and 100),
  summary text not null check (char_length(summary) <= 240),
  why_it_matters text not null check (char_length(why_it_matters) <= 320),
  suggested_action text not null check (char_length(suggested_action) <= 240),
  model text not null,
  prompt_version text not null,
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Delivery tracking per channel
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  channel text not null check (channel in ('telegram', 'discord')),
  status text not null check (status in ('pending', 'processing', 'sent', 'failed', 'unknown', 'dead'))
    default 'pending',
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  external_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, channel)
);

-- Ingestion run tracking
create table ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('schedule', 'manual')),
  status text not null check (status in ('running', 'succeeded', 'failed'))
    default 'running',
  fetched_count integer not null default 0,
  candidate_count integer not null default 0,
  analyzed_count integer not null default 0,
  notified_count integer not null default 0,
  error_count integer not null default 0,
  error_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Only one running ingestion at a time
create unique index idx_ingestion_runs_single_running
  on ingestion_runs ((true))
  where status = 'running';

-- Performance indexes
create index idx_events_status on events(status) where status in ('new', 'failed');
create index idx_deliveries_pending on deliveries(status) where status in ('pending', 'failed');
