-- ===== 001_studio_agents.sql
-- Studio Agents: tables for the Instagram DM agent, follow-up agent and prospecting agent.
-- Safe to run more than once. Creates NEW tables only — your existing
-- leads / lead_intelligence / conversations / messages / agent_events tables are untouched.
-- Run in Supabase → SQL Editor on the "Studio Intelligence Core" project.

create extension if not exists pgcrypto;

-- People talking to you on Instagram (one row per Instagram user)
create table if not exists agent_leads (
  id                uuid primary key default gen_random_uuid(),
  ig_user_id        text unique,             -- Instagram-scoped user ID
  ig_username       text,
  name              text,
  email             text,
  source            text,                    -- 'comment:MAP', 'comment:AI', 'dm'
  keyword           text,                    -- MAP / AI
  stage             text not null default 'qualifying',
                    -- qualifying | book | booked | nurture | human | no_show | closed
  score             int,                     -- 1–10 fit score from Claude
  summary           text,                    -- Claude's running notes on the lead
  ghl_contact_id    text,
  link_sent_at      timestamptz,             -- booking link actually sent
  last_inbound_at   timestamptz,             -- their last DM (opens Instagram's 24h reply window)
  last_outbound_at  timestamptz,
  nudges            int not null default 0,
  nurture_tagged_at timestamptz,             -- handed to GHL email follow-up
  booked_at         timestamptz,
  brief             text,                    -- pre-call brief
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists agent_leads_stage_idx on agent_leads (stage);
create index if not exists agent_leads_email_idx on agent_leads (lower(email));

-- Every DM in and out (including drafts waiting for your approval)
create table if not exists agent_messages (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references agent_leads(id) on delete cascade,
  direction   text not null check (direction in ('in','out')),
  text        text not null,
  status      text not null default 'sent',
              -- received | draft | sending | sent | failed | superseded | skipped
  ig_mid      text unique,                   -- Instagram message ID (dedupes webhook retries)
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists agent_messages_lead_idx on agent_messages (lead_id, created_at);
create index if not exists agent_messages_status_idx on agent_messages (status);

-- Comments already answered (so a comment never gets two DMs)
create table if not exists agent_comment_log (
  comment_id  text primary key,
  created_at  timestamptz not null default now()
);

-- Businesses found by the browser prospecting agent, waiting for you to reach out
create table if not exists agent_prospects (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null,
  website        text unique,
  instagram      text,
  email          text,
  phone          text,
  location       text,
  niche          text,
  leak           text,          -- the main gap spotted
  evidence       text,          -- what was seen that shows the gap
  opener         text,          -- personalised first message, drafted for you to send
  score          int,
  status         text not null default 'to_send',   -- to_send | sent | replied | skipped
  source_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists agent_prospects_status_idx on agent_prospects (status, score desc);

-- Lock the tables down: only your Worker (service_role key) can read/write.
alter table agent_leads       enable row level security;
alter table agent_messages    enable row level security;
alter table agent_comment_log enable row level security;
alter table agent_prospects   enable row level security;

grant all on table agent_leads, agent_messages, agent_comment_log, agent_prospects to service_role;

-- ===== 002_team.sql
-- Studio AI Intelligence — executive team tables. Safe to run more than once.
-- Run in Supabase → SQL Editor on the "Studio Intelligence Core" project (after 001_studio_agents.sql).

create extension if not exists pgcrypto;

-- Chat threads with a department head
create table if not exists team_threads (
  id          uuid primary key default gen_random_uuid(),
  department  text not null,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists team_threads_dept_idx on team_threads (department, updated_at desc);

create table if not exists team_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references team_threads(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  meta        jsonb not null default '{}'::jsonb,   -- actions proposed, deliverables, departments consulted
  created_at  timestamptz not null default now()
);
create index if not exists team_messages_thread_idx on team_messages (thread_id, created_at);

-- Approval queue: everything that touches a client or money waits here
create table if not exists team_actions (
  id          uuid primary key default gen_random_uuid(),
  department  text not null,
  type        text not null,      -- ghl_email | ghl_sms | ghl_tags | ghl_note | ghl_task | ghl_opportunity_status | stripe_draft_invoice | owner_task
  title       text not null,
  reason      text,
  params      jsonb not null default '{}'::jsonb,
  status      text not null default 'pending',   -- pending | running | done | failed | rejected
  result      jsonb,
  thread_id   uuid,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists team_actions_status_idx on team_actions (status, created_at desc);

-- Briefings, weekly reports and deliverables (calendars, SOPs, plans…)
create table if not exists team_reports (
  id          uuid primary key default gen_random_uuid(),
  department  text not null,
  kind        text not null,      -- briefing | weekly | deliverable
  subkind     text,
  title       text not null,
  body        text not null,
  thread_id   uuid,
  created_at  timestamptz not null default now()
);
create index if not exists team_reports_idx on team_reports (kind, department, created_at desc);

-- Shared team memory: durable facts and decisions from the owner
create table if not exists team_memory (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'other',
  fact        text not null,
  department  text,
  created_at  timestamptz not null default now()
);

alter table team_threads  enable row level security;
alter table team_messages enable row level security;
alter table team_actions  enable row level security;
alter table team_reports  enable row level security;
alter table team_memory   enable row level security;

grant all on table team_threads, team_messages, team_actions, team_reports, team_memory to service_role;

-- ===== 003_team_v2.sql
-- Executive Team v2: settings (autopilot, shifts, mission) + autopilot flag on actions. Additive only.
create table if not exists team_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table team_settings enable row level security;
grant all on table team_settings to service_role;

alter table team_actions add column if not exists auto boolean not null default false;

select 'team_settings' as ok, count(*) from team_settings;

-- ===== 004_campaign.sql
-- Outreach campaign + founder calls: extra research and call fields on prospects. Additive only.
alter table agent_prospects add column if not exists vertical         text;
alter table agent_prospects add column if not exists decision_maker   text;
alter table agent_prospects add column if not exists email_subject    text;
alter table agent_prospects add column if not exists email_body       text;
alter table agent_prospects add column if not exists email_source_url text;
alter table agent_prospects add column if not exists consent_basis    text;
alter table agent_prospects add column if not exists campaign         text;
alter table agent_prospects add column if not exists ghl_contact_id   text;
alter table agent_prospects add column if not exists enrolled_at      timestamptz;
alter table agent_prospects add column if not exists call_status      text;
alter table agent_prospects add column if not exists call_notes       text;
alter table agent_prospects add column if not exists last_call_at     timestamptz;
create index if not exists agent_prospects_calls_idx on agent_prospects (status, score desc) where phone is not null;
select 'agent_prospects ready' as ok, count(*) from agent_prospects;

-- ===== 005_acquisition.sql
-- Studio AI v10: acquisition engine. Leak reports on prospects + cost-per-lead logging. Additive only, safe to run twice.
alter table agent_prospects add column if not exists leak_report       jsonb;
alter table agent_prospects add column if not exists leak_score        integer;
alter table agent_prospects add column if not exists report_token      text;
alter table agent_prospects add column if not exists source            text;
alter table agent_prospects add column if not exists google_rating     numeric;
alter table agent_prospects add column if not exists google_reviews    integer;
alter table agent_prospects add column if not exists research_cost_aud numeric not null default 0;
create unique index if not exists agent_prospects_report_token_idx on agent_prospects (report_token) where report_token is not null;

create table if not exists team_usage (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  department         text,
  source             text,
  model              text,
  calls              integer not null default 0,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cache_write_tokens integer not null default 0,
  cache_read_tokens  integer not null default 0,
  web_searches       integer not null default 0,
  cost_usd           numeric not null default 0,
  cost_aud           numeric not null default 0,
  prospects          integer not null default 0,
  enrols             integer not null default 0
);
create index if not exists team_usage_created_idx on team_usage (created_at desc);
alter table team_usage enable row level security;
grant all on table team_usage to service_role;

select 'v10 acquisition ready' as ok, (select count(*) from agent_prospects) as prospects, (select count(*) from team_usage) as usage_rows;

-- ===== 006_audit.sql
-- Studio AI v13: audit trail. Additive only, safe to run twice.
create table if not exists team_audit (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor       text,
  action      text not null,
  target_type text,
  target_id   text,
  summary     text,
  details     jsonb
);
create index if not exists team_audit_created_idx on team_audit (created_at desc);
alter table team_audit enable row level security;
grant all on table team_audit to service_role;
select 'v13 audit ready' as ok, count(*) from team_audit;

-- ===== 007_demos.sql
-- v15: AI Front Desk demos (demo-first outreach). Safe to run more than once.
create table if not exists agent_demos (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  prospect_id uuid,
  business_name text,
  website text,
  vertical text,
  kb jsonb not null default '{}'::jsonb,
  quality text,
  pages jsonb default '[]'::jsonb,
  views int not null default 0,
  chats int not null default 0,
  first_view_at timestamptz,
  last_view_at timestamptz,
  last_chat_at timestamptz,
  day text,
  day_count int not null default 0,
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agent_demos_prospect on agent_demos(prospect_id);
alter table agent_demos enable row level security;
alter table agent_prospects add column if not exists demo_token text;

-- ===== 008_demos_v16.sql
-- v16: demo screenshots, voice calls, "Yes, set this up" taps. Safe to run more than once.
alter table agent_demos add column if not exists shot text;
alter table agent_demos add column if not exists has_shot boolean not null default false;
alter table agent_demos add column if not exists buy_clicks int not null default 0;
alter table agent_demos add column if not exists last_buy_at timestamptz;
alter table agent_demos add column if not exists voice_day text;
alter table agent_demos add column if not exists voice_count int not null default 0;
alter table agent_demos add column if not exists voice_calls int not null default 0;
alter table agent_demos add column if not exists last_voice_at timestamptz;

-- ===== 009_clients.sql
-- v17: clients with a live AI receptionist, and their conversations. Safe to run more than once.
create table if not exists agent_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  business_name text not null,
  website text,
  vertical text,
  mode text,
  status text not null default 'onboarding',
  prospect_id uuid,
  demo_token text,
  widget_key text unique not null,
  kb jsonb not null default '{}'::jsonb,
  extra_facts text default '',
  alert_name text,
  alert_email text,
  alert_phone text,
  ghl_contact_id text,
  plan_monthly numeric,
  pilot_price numeric,
  paid_at timestamptz,
  pilot_ends_at timestamptz,
  started_live_at timestamptz,
  checklist jsonb not null default '{}'::jsonb,
  safety jsonb,
  installed_url text,
  installed_at timestamptz,
  last_seen_at timestamptz,
  last_chat_at timestamptz,
  day text,
  day_count int not null default 0,
  notes text
);
alter table agent_clients enable row level security;

create table if not exists client_conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references agent_clients(id) on delete cascade,
  session text not null,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  page text,
  messages jsonb not null default '[]'::jsonb,
  lead jsonb,
  lead_at timestamptz,
  escalated boolean not null default false,
  preview boolean not null default false,
  cost_aud numeric not null default 0,
  unique (client_id, session)
);
create index if not exists client_conversations_client on client_conversations(client_id, last_at desc);
alter table client_conversations enable row level security;

-- ===== 010_clients_v18.sql
-- v18: Chat vs Chat + Voice plans, brand look, knowledge vault. Safe to run more than once.
alter table agent_clients add column if not exists voice_enabled boolean not null default false;
alter table agent_clients add column if not exists look jsonb not null default '{}'::jsonb;
alter table agent_clients add column if not exists knowledge jsonb not null default '{}'::jsonb;

-- ===== v10-step1
-- Studio AI v10: acquisition engine. Leak reports on prospects + cost-per-lead logging. Additive only, safe to run twice.
alter table agent_prospects add column if not exists leak_report       jsonb;
alter table agent_prospects add column if not exists leak_score        integer;
alter table agent_prospects add column if not exists report_token      text;
alter table agent_prospects add column if not exists source            text;
alter table agent_prospects add column if not exists google_rating     numeric;
alter table agent_prospects add column if not exists google_reviews    integer;
alter table agent_prospects add column if not exists research_cost_aud numeric not null default 0;
create unique index if not exists agent_prospects_report_token_idx on agent_prospects (report_token) where report_token is not null;

create table if not exists team_usage (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  department         text,
  source             text,
  model              text,
  calls              integer not null default 0,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cache_write_tokens integer not null default 0,
  cache_read_tokens  integer not null default 0,
  web_searches       integer not null default 0,
  cost_usd           numeric not null default 0,
  cost_aud           numeric not null default 0,
  prospects          integer not null default 0,
  enrols             integer not null default 0
);
create index if not exists team_usage_created_idx on team_usage (created_at desc);
alter table team_usage enable row level security;
grant all on table team_usage to service_role;

select 'v10 acquisition ready' as ok, (select count(*) from agent_prospects) as prospects, (select count(*) from team_usage) as usage_rows;

-- ===== v13-step1
-- Studio AI v13: audit trail. Additive only, safe to run twice.
create table if not exists team_audit (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor       text,
  action      text not null,
  target_type text,
  target_id   text,
  summary     text,
  details     jsonb
);
create index if not exists team_audit_created_idx on team_audit (created_at desc);
alter table team_audit enable row level security;
grant all on table team_audit to service_role;
select 'v13 audit ready' as ok, count(*) from team_audit;

-- ===== v15-step1
-- v15: AI Front Desk demos (demo-first outreach). Safe to run more than once.
create table if not exists agent_demos (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  prospect_id uuid,
  business_name text,
  website text,
  vertical text,
  kb jsonb not null default '{}'::jsonb,
  quality text,
  pages jsonb default '[]'::jsonb,
  views int not null default 0,
  chats int not null default 0,
  first_view_at timestamptz,
  last_view_at timestamptz,
  last_chat_at timestamptz,
  day text,
  day_count int not null default 0,
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agent_demos_prospect on agent_demos(prospect_id);
alter table agent_demos enable row level security;
alter table agent_prospects add column if not exists demo_token text;

-- ===== v16-step1
-- v16: demo screenshots, voice calls, "Yes, set this up" taps. Safe to run more than once.
alter table agent_demos add column if not exists shot text;
alter table agent_demos add column if not exists has_shot boolean not null default false;
alter table agent_demos add column if not exists buy_clicks int not null default 0;
alter table agent_demos add column if not exists last_buy_at timestamptz;
alter table agent_demos add column if not exists voice_day text;
alter table agent_demos add column if not exists voice_count int not null default 0;
alter table agent_demos add column if not exists voice_calls int not null default 0;
alter table agent_demos add column if not exists last_voice_at timestamptz;

-- ===== v17-step1
-- v17: clients with a live AI receptionist, and their conversations. Safe to run more than once.
create table if not exists agent_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  business_name text not null,
  website text,
  vertical text,
  mode text,
  status text not null default 'onboarding',
  prospect_id uuid,
  demo_token text,
  widget_key text unique not null,
  kb jsonb not null default '{}'::jsonb,
  extra_facts text default '',
  alert_name text,
  alert_email text,
  alert_phone text,
  ghl_contact_id text,
  plan_monthly numeric,
  pilot_price numeric,
  paid_at timestamptz,
  pilot_ends_at timestamptz,
  started_live_at timestamptz,
  checklist jsonb not null default '{}'::jsonb,
  safety jsonb,
  installed_url text,
  installed_at timestamptz,
  last_seen_at timestamptz,
  last_chat_at timestamptz,
  day text,
  day_count int not null default 0,
  notes text
);
alter table agent_clients enable row level security;

create table if not exists client_conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references agent_clients(id) on delete cascade,
  session text not null,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  page text,
  messages jsonb not null default '[]'::jsonb,
  lead jsonb,
  lead_at timestamptz,
  escalated boolean not null default false,
  preview boolean not null default false,
  cost_aud numeric not null default 0,
  unique (client_id, session)
);
create index if not exists client_conversations_client on client_conversations(client_id, last_at desc);
alter table client_conversations enable row level security;

-- ===== v18-step1
-- v18: Chat vs Chat + Voice plans, brand look, knowledge vault. Safe to run more than once.
alter table agent_clients add column if not exists voice_enabled boolean not null default false;
alter table agent_clients add column if not exists look jsonb not null default '{}'::jsonb;
alter table agent_clients add column if not exists knowledge jsonb not null default '{}'::jsonb;

