  -- Row Level Security: strict team scoping.
  do $$
  declare t text;
  begin
    foreach t in array array['profiles','user_roles','teams','team_members','team_invites','team_assignments','section_prose','section_rows','evidence','page_status','step_states','activity','mentor_sessions','submissions','submit_checks','dismissed_insights','faculty_reviews']
    loop execute format('alter table public.%I enable row level security', t); end loop;
  end $$;

  -- identity: own profile + teammates' names
  create policy profiles_read on public.profiles for select to authenticated using (
    id = auth.uid() or exists (select 1 from public.team_members a join public.team_members b on a.team_id = b.team_id where a.user_id = auth.uid() and b.user_id = profiles.id));
  create policy roles_read on public.user_roles for select to authenticated using (user_id = auth.uid());

  -- teams (created only via create_team RPC)
  create policy teams_read on public.teams for select to authenticated using (private.is_team_member(id) or private.is_assigned_faculty(id));
  create policy teams_update on public.teams for update to authenticated using (private.is_team_member(id)) with check (private.is_team_member(id));
  create policy members_read on public.team_members for select to authenticated using (private.is_team_member(team_id) or private.is_assigned_faculty(team_id));
  create policy invites_read on public.team_invites for select to authenticated using (private.is_team_member(team_id));
  create policy assignments_read on public.team_assignments for select to authenticated using (private.is_team_member(team_id) or faculty_id = auth.uid());

  -- team content: members read + write, faculty read
  do $$
  declare t text;
  begin
    foreach t in array array['section_prose','section_rows','evidence','page_status','step_states','activity','mentor_sessions','submissions','submit_checks','dismissed_insights']
    loop
      execute format('create policy %1$s_sel on public.%1$I for select to authenticated using (private.is_team_member(team_id) or private.is_assigned_faculty(team_id))', t);
      execute format('create policy %1$s_ins on public.%1$I for insert to authenticated with check (private.is_team_member(team_id))', t);
      execute format('create policy %1$s_upd on public.%1$I for update to authenticated using (private.is_team_member(team_id)) with check (private.is_team_member(team_id))', t);
      execute format('create policy %1$s_del on public.%1$I for delete to authenticated using (private.is_team_member(team_id))', t);
    end loop;
  end $$;
  -- activity is append-only for students
  drop policy activity_upd on public.activity;
  drop policy activity_del on public.activity;

  -- faculty_reviews: students read RELEASED reviews only; no student write policy exists at all.
  create policy fr_student_read on public.faculty_reviews for select to authenticated
    using (private.is_team_member(team_id) and released_at is not null);
  create policy fr_faculty_read on public.faculty_reviews for select to authenticated using (private.is_assigned_faculty(team_id));
  create policy fr_faculty_ins on public.faculty_reviews for insert to authenticated
    with check (private.is_assigned_faculty(team_id) and faculty_id = auth.uid());
  create policy fr_faculty_upd on public.faculty_reviews for update to authenticated
    using (private.is_assigned_faculty(team_id) and faculty_id = auth.uid()) with check (private.is_assigned_faculty(team_id));

  -- table privileges: no anon access anywhere
  revoke all on all tables in schema public from anon;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  revoke insert, update, delete on public.profiles, public.user_roles, public.team_members, public.team_invites, public.team_assignments from authenticated;
  revoke insert, delete on public.teams from authenticated;
  grant usage, select on all sequences in schema public to authenticated;
