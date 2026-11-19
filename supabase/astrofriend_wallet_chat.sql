
-- AstroFriend wallet + live text chat migration
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.af_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique
);
create table if not exists public.af_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.af_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  kind text not null check (kind in ('topup','chat_debit','refund','adjustment')),
  description text not null,
  session_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists public.af_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  expert_name text not null,
  rate_per_minute numeric(8,2) not null check (rate_per_minute > 0),
  status text not null default 'pending' check (status in ('pending','active','ended')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  next_charge_at timestamptz,
  ended_at timestamptz
);
create table if not exists public.af_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.af_chat_sessions(id) on delete cascade,
  sender text not null check (sender in ('customer','admin')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.af_wallet_transactions add column if not exists session_id uuid;
create index if not exists af_chat_sessions_customer_idx on public.af_chat_sessions(customer_id, created_at desc);
create index if not exists af_chat_messages_session_idx on public.af_chat_messages(session_id, created_at);
create index if not exists af_wallet_tx_user_idx on public.af_wallet_transactions(user_id, created_at desc);

create or replace function public.af_is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.af_admins a where a.user_id=auth.uid()); $$;

alter table public.af_admins enable row level security;
alter table public.af_wallets enable row level security;
alter table public.af_wallet_transactions enable row level security;
alter table public.af_chat_sessions enable row level security;
alter table public.af_chat_messages enable row level security;

drop policy if exists af_admins_self_read on public.af_admins;
create policy af_admins_self_read on public.af_admins for select to authenticated using (user_id=auth.uid());
drop policy if exists af_wallet_self_read on public.af_wallets;
create policy af_wallet_self_read on public.af_wallets for select to authenticated using (user_id=auth.uid() or public.af_is_admin());
drop policy if exists af_tx_self_read on public.af_wallet_transactions;
create policy af_tx_self_read on public.af_wallet_transactions for select to authenticated using (user_id=auth.uid() or public.af_is_admin());
drop policy if exists af_sessions_read on public.af_chat_sessions;
create policy af_sessions_read on public.af_chat_sessions for select to authenticated using (customer_id=auth.uid() or public.af_is_admin());
drop policy if exists af_messages_read on public.af_chat_messages;
create policy af_messages_read on public.af_chat_messages for select to authenticated using (
  exists(select 1 from public.af_chat_sessions s where s.id=session_id and (s.customer_id=auth.uid() or public.af_is_admin()))
);
drop policy if exists af_messages_insert on public.af_chat_messages;
create policy af_messages_insert on public.af_chat_messages for insert to authenticated with check (
  char_length(message) between 1 and 2000 and
  ((sender='customer' and exists(select 1 from public.af_chat_sessions s where s.id=session_id and s.customer_id=auth.uid() and s.status='active'))
   or (sender='admin' and public.af_is_admin() and exists(select 1 from public.af_chat_sessions s where s.id=session_id and s.status='active')))
);

create or replace function public.af_create_chat_request(p_expert_name text,p_rate_per_minute numeric)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_balance numeric;
begin
 if auth.uid() is null then raise exception 'Please login first.'; end if;
 if length(trim(p_expert_name))=0 or p_rate_per_minute not in (4,5) then raise exception 'Invalid expert or chat rate.'; end if;
 insert into public.af_wallets(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select balance into v_balance from public.af_wallets where user_id=auth.uid();
 if v_balance < p_rate_per_minute then raise exception 'Wallet balance कम है। पहले wallet में money add करें.'; end if;
 if exists(select 1 from public.af_chat_sessions where customer_id=auth.uid() and status in ('pending','active')) then raise exception 'आपकी एक chat पहले से pending या active है.'; end if;
 insert into public.af_chat_sessions(customer_id,expert_name,rate_per_minute) values(auth.uid(),trim(p_expert_name),p_rate_per_minute) returning id into v_id;
 return v_id;
end; $$;

create or replace function public.af_start_chat(p_session_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.af_is_admin() then raise exception 'Admin access required.'; end if;
 update public.af_chat_sessions set status='active',started_at=now(),next_charge_at=now()+interval '1 minute'
 where id=p_session_id and status='pending';
 if not found then raise exception 'Chat request not found or already started.'; end if;
end; $$;

create or replace function public.af_charge_chat_minute(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare s public.af_chat_sessions%rowtype; b numeric;
begin
 select * into s from public.af_chat_sessions where id=p_session_id for update;
 if not found or (s.customer_id<>auth.uid() and not public.af_is_admin()) then raise exception 'Chat not found.'; end if;
 if s.status<>'active' or s.next_charge_at>now() then return jsonb_build_object('charged',false,'ended',s.status='ended'); end if;
 select balance into b from public.af_wallets where user_id=s.customer_id for update;
 if coalesce(b,0)<s.rate_per_minute then
   update public.af_chat_sessions set status='ended',ended_at=now() where id=s.id;
   return jsonb_build_object('charged',false,'ended',true,'balance',coalesce(b,0));
 end if;
 update public.af_wallets set balance=balance-s.rate_per_minute,updated_at=now() where user_id=s.customer_id returning balance into b;
 insert into public.af_wallet_transactions(user_id,amount,kind,description,session_id)
 values(s.customer_id,-s.rate_per_minute,'chat_debit','Chat charge · '||s.expert_name,s.id);
 update public.af_chat_sessions set next_charge_at=next_charge_at+interval '1 minute' where id=s.id;
 return jsonb_build_object('charged',true,'ended',false,'balance',b);
end; $$;

create or replace function public.af_end_chat(p_session_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 update public.af_chat_sessions set status='ended',ended_at=now()
 where id=p_session_id and (customer_id=auth.uid() or public.af_is_admin()) and status in ('pending','active');
 if not found then raise exception 'Chat not found.'; end if;
end; $$;

grant execute on function public.af_is_admin() to authenticated;
grant execute on function public.af_create_chat_request(text,numeric) to authenticated;
grant execute on function public.af_start_chat(uuid) to authenticated;
grant execute on function public.af_charge_chat_minute(uuid) to authenticated;
grant execute on function public.af_end_chat(uuid) to authenticated;
grant select on public.af_wallets,public.af_wallet_transactions,public.af_chat_sessions,public.af_chat_messages,public.af_admins to authenticated;
grant insert on public.af_chat_messages to authenticated;

-- IMPORTANT: After running this migration, add the admin account once:
-- insert into public.af_admins(user_id,email)
-- select id,email from auth.users where lower(email)=lower('YOUR_ADMIN_EMAIL')
-- on conflict(user_id) do nothing;


-- Consultation bookings with birth details
create table if not exists public.af_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  expert_name text not null,
  service_name text not null,
  customer_name text not null,
  customer_phone text,
  birth_date date not null,
  birth_place text not null,
  birth_time time not null,
  message text,
  consultation_price numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.af_bookings enable row level security;
drop policy if exists af_bookings_customer_select on public.af_bookings;
create policy af_bookings_customer_select on public.af_bookings
  for select to authenticated using (customer_id=auth.uid() or public.af_is_admin());
drop policy if exists af_bookings_customer_insert on public.af_bookings;
create policy af_bookings_customer_insert on public.af_bookings
  for insert to authenticated with check (customer_id=auth.uid());
grant select,insert on public.af_bookings to authenticated;


-- AstroFriend Consultation AI: ₹5 per started minute, charged from wallet.
create table if not exists public.af_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rate_per_minute numeric(8,2) not null default 5 check (rate_per_minute=5),
  status text not null default 'active' check (status in ('active','ended')),
  started_at timestamptz not null default now(),
  next_charge_at timestamptz not null default now()+interval '1 minute',
  ended_at timestamptz
);
create index if not exists af_ai_sessions_user_idx on public.af_ai_sessions(user_id,started_at desc);
alter table public.af_ai_sessions enable row level security;
drop policy if exists af_ai_sessions_own_read on public.af_ai_sessions;
create policy af_ai_sessions_own_read on public.af_ai_sessions for select to authenticated using(user_id=auth.uid() or public.af_is_admin());
grant select on public.af_ai_sessions to authenticated;

create or replace function public.af_start_ai_consultation()
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_balance numeric;
begin
 if auth.uid() is null then raise exception 'Please login first.'; end if;
 insert into public.af_wallets(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select balance into v_balance from public.af_wallets where user_id=auth.uid() for update;
 if coalesce(v_balance,0)<5 then raise exception 'AI Consultation ke liye wallet mein kam se kam ₹5 hone chahiye. Pehle wallet top up karein.'; end if;
 update public.af_wallets set balance=balance-5,updated_at=now() where user_id=auth.uid() returning balance into v_balance;
 insert into public.af_wallet_transactions(user_id,amount,kind,description)
 values(auth.uid(),-5,'chat_debit','AstroFriend Consultation AI · first minute');
 insert into public.af_ai_sessions(user_id) values(auth.uid()) returning id into v_id;
 return v_id;
end; $$;

create or replace function public.af_charge_ai_minute(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare s public.af_ai_sessions%rowtype; b numeric; v_charged integer:=0;
begin
 select * into s from public.af_ai_sessions where id=p_session_id for update;
 if not found or (s.user_id<>auth.uid() and not public.af_is_admin()) then raise exception 'AI consultation session not found.'; end if;
 if s.status<>'active' then
   select balance into b from public.af_wallets where user_id=s.user_id;
   return jsonb_build_object('charged',false,'ended',true,'balance',coalesce(b,0));
 end if;
 select balance into b from public.af_wallets where user_id=s.user_id for update;
 while s.next_charge_at<=now() loop
   if coalesce(b,0)<5 then
     update public.af_ai_sessions set status='ended',ended_at=now() where id=s.id;
     return jsonb_build_object('charged',v_charged>0,'ended',true,'balance',coalesce(b,0));
   end if;
   update public.af_wallets set balance=balance-5,updated_at=now() where user_id=s.user_id returning balance into b;
   insert into public.af_wallet_transactions(user_id,amount,kind,description)
   values(s.user_id,-5,'chat_debit','AstroFriend Consultation AI · minute charge');
   v_charged:=v_charged+1;
   s.next_charge_at:=s.next_charge_at+interval '1 minute';
 end loop;
 update public.af_ai_sessions set next_charge_at=s.next_charge_at where id=s.id;
 return jsonb_build_object('charged',v_charged>0,'ended',false,'balance',b,'minutes_charged',v_charged);
end; $$;

create or replace function public.af_end_ai_consultation(p_session_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 update public.af_ai_sessions set status='ended',ended_at=now()
 where id=p_session_id and user_id=auth.uid() and status='active';
 if not found then raise exception 'Active AI consultation not found.'; end if;
end; $$;

grant execute on function public.af_start_ai_consultation() to authenticated;
grant execute on function public.af_charge_ai_minute(uuid) to authenticated;
grant execute on function public.af_end_ai_consultation(uuid) to authenticated;
