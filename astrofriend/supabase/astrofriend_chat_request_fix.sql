-- AstroFriend: secure human-chat request + booking flow fix
-- Run this entire file once in Supabase SQL Editor.
-- This does NOT change wallet balances or delete existing data.

create or replace function public.af_create_chat_request(
  p_expert_name text,
  p_rate_per_minute numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'Please login first.';
  end if;

  if coalesce(trim(p_expert_name), '') = ''
     or p_rate_per_minute is null
     or p_rate_per_minute not in (4, 5) then
    raise exception 'Invalid expert or chat rate.';
  end if;

  insert into public.af_wallets(user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  -- Lock the wallet row so two simultaneous requests cannot both pass
  -- using the same available balance.
  select balance
    into v_balance
  from public.af_wallets
  where user_id = auth.uid()
  for update;

  if coalesce(v_balance, 0) < p_rate_per_minute then
    raise exception 'Wallet balance कम है। Chat request के लिए कम से कम ₹% चाहिए।',
      p_rate_per_minute;
  end if;

  if exists (
    select 1
    from public.af_chat_sessions
    where customer_id = auth.uid()
      and status in ('pending', 'active')
  ) then
    raise exception 'आपकी एक chat पहले से pending या active है.';
  end if;

  insert into public.af_chat_sessions(customer_id, expert_name, rate_per_minute)
  values (auth.uid(), trim(p_expert_name), p_rate_per_minute)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.af_create_chat_request(text, numeric) to authenticated;

-- A human-chat booking is valid only if the same customer already has
-- a pending session for the same expert. The session can only be created
-- through the wallet-checking RPC above (direct client inserts are not granted).
create or replace function public.af_require_valid_chat_session_for_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.service_name, '')) like '%chat%' then
    if not exists (
      select 1
      from public.af_chat_sessions s
      where s.customer_id = new.customer_id
        and lower(s.expert_name) = lower(new.expert_name)
        and s.status = 'pending'
        and s.created_at >= now() - interval '10 minutes'
    ) then
      raise exception 'Chat request reject hui: wallet balance check pass nahi hua. Pehle required wallet balance rakhein.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists af_bookings_require_chat_session on public.af_bookings;
create trigger af_bookings_require_chat_session
before insert on public.af_bookings
for each row
execute function public.af_require_valid_chat_session_for_booking();

-- Ensure the admin chat-list RPC is available to signed-in users;
-- the function itself still verifies af_admins membership.
grant execute on function public.af_admin_list_chats() to authenticated;

-- IMPORTANT ADMIN SETUP:
-- The email below must exactly match Netlify's VITE_ADMIN_EMAIL.
-- Uncomment the INSERT and replace YOUR_ADMIN_EMAIL before running if
-- your admin user is not already present in public.af_admins.
--
-- insert into public.af_admins(user_id, email)
-- select id, email
-- from auth.users
-- where lower(email) = lower('YOUR_ADMIN_EMAIL')
-- on conflict (user_id) do update set email = excluded.email;
