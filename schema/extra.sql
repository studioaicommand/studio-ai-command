-- ===== v43 fresh-install additions: original Studio Intelligence Core tables, Command records + jobs, and hardening.

-- Original sales-agent tables (Studio Intelligence Core v1)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  first_name text, last_name text, email text, phone text, source text,
  tags text[] not null default '{}', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  channel text, status text, metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  external_message_id text, direction text, sender_type text, channel text, content text,
  model text, metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, sent_at);
create table if not exists lead_intelligence (
  lead_id uuid primary key references leads(id) on delete cascade,
  qualification_status text, intent_level text,
  pain_points jsonb, goals jsonb, objections jsonb,
  conversation_summary text, recommended_next_action text,
  memory jsonb not null default '{}'::jsonb, last_ai_analysis_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists agent_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid, conversation_id uuid,
  event_type text, action text, success boolean not null default false,
  input_data jsonb, output_data jsonb, error_message text, model text,
  created_at timestamptz not null default now()
);
create index if not exists agent_events_conv_idx on agent_events (conversation_id, created_at desc);

-- Command's searchable history (every chat, voice transcript, Telegram message, report and decision)
create table if not exists studio_command_records (
  id uuid primary key,
  source text not null, external_key text not null, role text not null,
  content text not null default '', occurred_at timestamptz not null default now(),
  conversation_id text, actor text, department text, prospect_id text, contact_id text,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at timestamptz not null default now()
);
create index if not exists studio_command_records_time_idx on studio_command_records (occurred_at desc, id desc);
create index if not exists studio_command_records_search_idx on studio_command_records using gin (search_vector);
create index if not exists studio_command_records_conv_idx on studio_command_records (conversation_id);

-- Command's AI jobs queue
create table if not exists studio_command_jobs (
  id uuid primary key,
  kind text, department text, title text, request text not null default '',
  status text not null default 'queued', source text,
  params jsonb not null default '{}'::jsonb, result jsonb, error text,
  thread_id uuid, report_id uuid, attempts int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  started_at timestamptz, finished_at timestamptz
);
create index if not exists studio_command_jobs_status_idx on studio_command_jobs (status, created_at);

-- Hardening: every table locked to the Worker's service key. Row-level security on everywhere, and the
-- public (anon) and signed-in (authenticated) API roles get no access at all, even if a key leaked.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', t.tablename);
    execute format('grant all on table public.%I to service_role', t.tablename);
  end loop;
end $$;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
