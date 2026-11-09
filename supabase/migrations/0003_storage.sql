-- Private evidence bucket; object path: team/{team_id}/{page_no}/{uuid}-{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 26214400,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf','video/mp4','video/webm','text/csv','text/plain','application/zip'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

create function private.path_team(name text) returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(name, '/', 1) = 'team' and split_part(name, '/', 2) ~ '^[0-9a-f-]{36}$'
    then split_part(name, '/', 2)::uuid end
$$;
grant execute on function private.path_team(text) to authenticated;

create policy evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (private.is_team_member(private.path_team(name)) or private.is_assigned_faculty(private.path_team(name))));
create policy evidence_write on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and private.is_team_member(private.path_team(name)));
create policy evidence_delete on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and private.is_team_member(private.path_team(name)));
