-- Portfolio platform core schema. Team-scoped; every team table carries team_id for cheap RLS.
create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------- identity ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('student','faculty','hod','admin')),
  primary key (user_id, role)
);

-- restrict sign-up to the institutional domain, create profile + student role
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) not like '%@kletech.ac.in' then
    raise exception 'Only @kletech.ac.in accounts may register';
  end if;
  insert into public.profiles(id, email, full_name)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', initcap(replace(split_part(new.email,'@',1),'.',' '))));
  insert into public.user_roles(user_id, role) values (new.id, 'student');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------- teams ----------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  theme_no int not null check (theme_no between 1 and 6),
  artefact text not null default '',
  current_review text not null default 'R1' check (current_review in ('R1','R2','R3','R4','R5','FINAL')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('lead','member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create unique index one_team_per_student on public.team_members(user_id);
create table public.team_invites (
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (team_id, email)
);
create table public.team_assignments (
  team_id uuid not null references public.teams(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'mentor' check (kind in ('mentor','reviewer')),
  primary key (team_id, faculty_id, kind)
);

-- ---------- RLS helpers ----------
create function private.is_team_member(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = tid and user_id = auth.uid())
$$;
create function private.is_assigned_faculty(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_assignments a join public.user_roles r on r.user_id = a.faculty_id and r.role = 'faculty'
    where a.team_id = tid and a.faculty_id = auth.uid())
$$;
grant usage on schema private to authenticated;
grant execute on function private.is_team_member(uuid), private.is_assigned_faculty(uuid) to authenticated;

-- ---------- portfolio content ----------
create table public.section_prose (
  team_id uuid not null references public.teams(id) on delete cascade,
  page_no int not null check (page_no between 0 and 15),
  section_id text not null,
  content jsonb,
  text text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (team_id, page_no, section_id)
);
create table public.section_rows (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  page_no int not null check (page_no between 0 and 15),
  section_id text not null,
  sort int not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),   -- server clock: overwritten by trigger below
  updated_at timestamptz not null default now()
);
create index on public.section_rows(team_id, page_no, section_id);

create function private.row_times() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.created_at := now(); new.created_by := auth.uid();
  else new.created_at := old.created_at; new.team_id := old.team_id; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger section_rows_times before insert or update on public.section_rows
  for each row execute function private.row_times();

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  page_no int not null check (page_no between 0 and 15),
  section_id text not null,
  name text not null,
  mime text not null,
  size bigint not null check (size <= 26214400),
  caption text not null default '',
  storage_path text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.evidence(team_id, page_no, section_id);

create table public.page_status (
  team_id uuid not null references public.teams(id) on delete cascade,
  page_no int not null check (page_no between 0 and 15),
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (team_id, page_no)
);
create table public.step_states (
  team_id uuid not null references public.teams(id) on delete cascade,
  step_no int not null check (step_no between 1 and 16),
  state text not null check (state in ('todo','doing','done')),
  primary key (team_id, step_no)
);
create table public.activity (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  text text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.activity(team_id, created_at desc);
create table public.mentor_sessions (
  id uuid primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  page_no int not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.submissions (
  team_id uuid primary key references public.teams(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted')),
  review_id text,
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id)
);
create table public.submit_checks (
  team_id uuid not null references public.teams(id) on delete cascade,
  review_id text not null,
  criterion_id text not null,
  ticked boolean not null default false,
  primary key (team_id, review_id, criterion_id)
);
create table public.dismissed_insights (
  team_id uuid not null references public.teams(id) on delete cascade,
  insight_id text not null,
  primary key (team_id, insight_id)
);

-- Official faculty reviews: students can only read released ones.
create table public.faculty_reviews (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  review_id text not null check (review_id in ('R1','R2','R3','R4','R5','FINAL')),
  summary text not null default '',
  observations jsonb not null default '[]'::jsonb,   -- [{ "text": "...", "page_no": 4 }]
  faculty_id uuid not null references public.profiles(id),
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.faculty_reviews(team_id, review_id);

-- ---------- RPCs ----------
create function public.create_team(p_name text, p_theme int, p_artefact text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid; i int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.team_members where user_id = auth.uid()) then
    raise exception 'already in a team';
  end if;
  insert into public.teams(name, theme_no, artefact, created_by) values (trim(p_name), p_theme, coalesce(p_artefact,''), auth.uid())
    returning id into tid;
  insert into public.team_members(team_id, user_id, role) values (tid, auth.uid(), 'lead');
  for i in 0..15 loop insert into public.page_status(team_id, page_no) values (tid, i); end loop;
  insert into public.submissions(team_id) values (tid);
  return tid;
end $$;

create function public.claim_invites() returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid; em text;
begin
  if auth.uid() is null then return null; end if;
  select team_id into tid from public.team_members where user_id = auth.uid();
  if tid is not null then return tid; end if;
  select lower(email) into em from public.profiles where id = auth.uid();
  select team_id into tid from public.team_invites where lower(email) = em limit 1;
  if tid is null then return null; end if;
  insert into public.team_members(team_id, user_id) values (tid, auth.uid());
  delete from public.team_invites where lower(email) = em;
  return tid;
end $$;

create function public.invite_member(p_team uuid, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid() and role = 'lead') then
    raise exception 'only the team lead can invite';
  end if;
  if lower(p_email) not like '%@kletech.ac.in' then raise exception 'institutional email required'; end if;
  insert into public.team_invites(team_id, email, invited_by) values (p_team, lower(trim(p_email)), auth.uid()) on conflict do nothing;
end $$;
grant execute on function public.create_team(text,int,text), public.claim_invites(), public.invite_member(uuid,text) to authenticated;
revoke execute on function public.create_team(text,int,text), public.claim_invites(), public.invite_member(uuid,text) from anon, public;
