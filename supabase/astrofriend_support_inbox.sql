-- AstroFriend Help Us support inbox. Run once in Supabase SQL Editor.
create table if not exists public.af_support_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('customer','admin')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists af_support_messages_customer_idx on public.af_support_messages(customer_id, created_at);
alter table public.af_support_messages enable row level security;
drop policy if exists af_support_read on public.af_support_messages;
create policy af_support_read on public.af_support_messages for select to authenticated using (customer_id=auth.uid() or public.af_is_admin());
drop policy if exists af_support_customer_insert on public.af_support_messages;
create policy af_support_customer_insert on public.af_support_messages for insert to authenticated with check (customer_id=auth.uid() and sender='customer');
drop policy if exists af_support_admin_reply on public.af_support_messages;
create policy af_support_admin_reply on public.af_support_messages for insert to authenticated with check (public.af_is_admin() and sender='admin');
grant select, insert on public.af_support_messages to authenticated;
