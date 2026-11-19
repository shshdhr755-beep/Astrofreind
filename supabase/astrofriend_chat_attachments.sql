-- AstroFriend chat attachments migration. Run in Supabase SQL Editor.
alter table public.af_chat_messages add column if not exists attachment_path text;
alter table public.af_chat_messages add column if not exists attachment_name text;
alter table public.af_chat_messages add column if not exists attachment_mime text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'af-chat-attachments',
  'af-chat-attachments',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/gif','image/webp','image/heic',
    'video/mp4','video/quicktime','video/webm',
    'application/pdf','text/plain','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists af_chat_attachments_read on storage.objects;
create policy af_chat_attachments_read on storage.objects
for select to authenticated
using (
  bucket_id = 'af-chat-attachments'
  and exists (
    select 1 from public.af_chat_sessions s
    where s.id = (storage.foldername(name))[1]::uuid
      and (s.customer_id = auth.uid() or public.af_is_admin())
  )
);

drop policy if exists af_chat_attachments_insert on storage.objects;
create policy af_chat_attachments_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'af-chat-attachments'
  and exists (
    select 1 from public.af_chat_sessions s
    where s.id = (storage.foldername(name))[1]::uuid
      and s.status = 'active'
      and (s.customer_id = auth.uid() or public.af_is_admin())
  )
);
