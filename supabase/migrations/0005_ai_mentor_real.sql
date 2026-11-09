-- Real-life AI Mentor extensions: disputes, faculty annotations, and token usage telemetry.

-- 1. Student disputes during viva preparation
create table if not exists public.ai_student_disputes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_id uuid not null references public.mentor_sessions(id) on delete cascade,
  page_no int not null check (page_no between 0 and 15),
  question_id text not null,
  question_text text not null,
  quote text,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_student_disputes_team on public.ai_student_disputes(team_id);
create index if not exists idx_ai_student_disputes_session on public.ai_student_disputes(session_id);

-- 2. Faculty annotations and AI supervision
create table if not exists public.ai_faculty_annotations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mentor_sessions(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  flags_ai_error boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_faculty_annotations_session on public.ai_faculty_annotations(session_id);

-- 3. AI token usage, latency, and model metrics
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  team_id uuid references public.teams(id) on delete cascade,
  operation text not null check (operation in ('mentor_turn', 'generate_questions', 'page_analysis', 'portfolio_analysis')),
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  latency_ms int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_usage_log_team on public.ai_usage_log(team_id, created_at desc);

-- 4. Enable RLS
alter table public.ai_student_disputes enable row level security;
alter table public.ai_faculty_annotations enable row level security;
alter table public.ai_usage_log enable row level security;

-- 5. RLS Policies
-- Disputes: Team members can insert and read their own disputes; assigned faculty can read
drop policy if exists "teams insert own disputes" on public.ai_student_disputes;
create policy "teams insert own disputes" on public.ai_student_disputes
  for insert with check (private.is_team_member(team_id));

drop policy if exists "teams and faculty read disputes" on public.ai_student_disputes;
create policy "teams and faculty read disputes" on public.ai_student_disputes
  for select using (private.is_team_member(team_id) or private.is_assigned_faculty(team_id));

-- Faculty annotations: Only assigned faculty can view and manage
drop policy if exists "assigned faculty manage annotations" on public.ai_faculty_annotations;
create policy "assigned faculty manage annotations" on public.ai_faculty_annotations
  for all using (exists (
    select 1 from public.mentor_sessions ms
    where ms.id = session_id and private.is_assigned_faculty(ms.team_id)
  ));

-- Usage log: Team members can record their own usage; faculty/admins can view
drop policy if exists "insert usage log" on public.ai_usage_log;
create policy "insert usage log" on public.ai_usage_log
  for insert with check (team_id is null or private.is_team_member(team_id));

drop policy if exists "select usage log" on public.ai_usage_log;
create policy "select usage log" on public.ai_usage_log
  for select using (team_id is not null and (private.is_team_member(team_id) or private.is_assigned_faculty(team_id)));

