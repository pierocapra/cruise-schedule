-- Private bucket for uploaded schedules (10 MB per file, limited types)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-files',
  'source-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Per-user access: first path segment must equal the caller's user id
drop policy if exists "source_files_objects_select_own" on storage.objects;
create policy "source_files_objects_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "source_files_objects_insert_own" on storage.objects;
create policy "source_files_objects_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "source_files_objects_delete_own" on storage.objects;
create policy "source_files_objects_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
