-- Authorship foreign keys to profiles had no ON DELETE action, so Postgres defaults to RESTRICT:
-- deleting a user account fails as soon as anything they authored still exists. Content should
-- outlive the author (the column just clears), except team_assignments, which is the membership
-- row itself and should disappear with the faculty account.
create or replace function private.redo_fk(p_table text, p_column text, p_action text) returns void
language plpgsql as $$
declare cname text;
begin
  select tc.constraint_name into cname
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public' and tc.table_name = p_table and kcu.column_name = p_column;
  if cname is not null then execute format('alter table public.%I drop constraint %I', p_table, cname); end if;
  execute format('alter table public.%1$I add constraint %1$s_%2$s_fkey foreign key (%2$I) references public.profiles(id) %3$s', p_table, p_column, p_action);
end $$;

alter table public.teams alter column created_by drop not null;
alter table public.faculty_reviews alter column faculty_id drop not null;

select private.redo_fk('teams', 'created_by', 'on delete set null');
select private.redo_fk('faculty_reviews', 'faculty_id', 'on delete set null');
select private.redo_fk('section_prose', 'updated_by', 'on delete set null');
select private.redo_fk('section_rows', 'created_by', 'on delete set null');
select private.redo_fk('evidence', 'created_by', 'on delete set null');
select private.redo_fk('activity', 'created_by', 'on delete set null');
select private.redo_fk('submissions', 'submitted_by', 'on delete set null');
select private.redo_fk('team_invites', 'invited_by', 'on delete set null');
select private.redo_fk('team_assignments', 'faculty_id', 'on delete cascade');

drop function private.redo_fk(text, text, text);
