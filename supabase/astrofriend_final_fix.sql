-- AstroFriend final patch: connect every customer chat request to its birth-details booking
-- Run this file once in Supabase Dashboard > SQL Editor.
-- Existing bookings and wallet balances are preserved.

alter table public.af_bookings
  add column if not exists chat_session_id uuid references public.af_chat_sessions(id) on delete set null;

create unique index if not exists af_bookings_chat_session_uidx
  on public.af_bookings(chat_session_id)
  where chat_session_id is not null;

-- Save the customer's form against the exact pending chat session.
create or replace function public.af_save_chat_booking(
  p_session_id uuid,
  p_expert_name text,
  p_service_name text,
  p_customer_name text,
  p_birth_date date,
  p_birth_place text,
  p_birth_time time,
  p_message text,
  p_consultation_price numeric
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_session public.af_chat_sessions%rowtype;
  v_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'Please login first.';
  end if;

  select * into v_session
  from public.af_chat_sessions
  where id=p_session_id
    and customer_id=auth.uid()
    and status='pending'
  for update;

  if not found then
    raise exception 'Chat request not found. Please submit again.';
  end if;

  if coalesce(trim(p_customer_name),'')='' or p_birth_date is null
     or coalesce(trim(p_birth_place),'')='' or p_birth_time is null then
    raise exception 'Name, Date of Birth, Place of Birth aur Time of Birth bharna zaroori hai.';
  end if;

  select balance into v_balance
  from public.af_wallets
  where user_id=auth.uid()
  for update;

  if coalesce(v_balance,0) < v_session.rate_per_minute then
    raise exception 'Wallet balance chat request ke liye paryapt nahi hai.';
  end if;

  insert into public.af_bookings(
    customer_id, expert_name, service_name, customer_name, customer_phone,
    birth_date, birth_place, birth_time, message, consultation_price, chat_session_id
  )
  values(
    auth.uid(), trim(p_expert_name), trim(p_service_name), trim(p_customer_name), null,
    p_birth_date, trim(p_birth_place), p_birth_time, nullif(trim(coalesce(p_message,'')),''),
    coalesce(p_consultation_price,0), p_session_id
  )
  on conflict (chat_session_id) where chat_session_id is not null
  do update set
    expert_name=excluded.expert_name,
    service_name=excluded.service_name,
    customer_name=excluded.customer_name,
    birth_date=excluded.birth_date,
    birth_place=excluded.birth_place,
    birth_time=excluded.birth_time,
    message=excluded.message,
    consultation_price=excluded.consultation_price
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.af_save_chat_booking(uuid,text,text,text,date,text,time,text,numeric) to authenticated;

-- Replace the old short admin list with a list that includes the customer's submitted form.
drop function if exists public.af_admin_list_chats();

create function public.af_admin_list_chats()
returns table (
  id uuid,
  customer_id uuid,
  customer_email text,
  customer_name text,
  expert_name text,
  rate_per_minute numeric,
  status text,
  created_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  service_name text,
  booking_customer_name text,
  birth_date text,
  birth_place text,
  birth_time text,
  booking_message text,
  consultation_price numeric
)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.af_is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    s.id,
    s.customer_id,
    u.email::text,
    coalesce(b.customer_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Customer')::text,
    s.expert_name,
    s.rate_per_minute,
    s.status,
    s.created_at,
    s.started_at,
    s.ended_at,
    b.service_name,
    b.customer_name,
    coalesce(to_char(b.birth_date,'YYYY-MM-DD'),''),
    coalesce(b.birth_place,''),
    coalesce(to_char(b.birth_time,'HH12:MI AM'),''),
    coalesce(b.message,''),
    b.consultation_price
  from public.af_chat_sessions s
  join auth.users u on u.id=s.customer_id
  left join lateral (
    select bk.*
    from public.af_bookings bk
    where bk.customer_id=s.customer_id
      and (
        bk.chat_session_id=s.id
        or (
          bk.chat_session_id is null
          and lower(bk.expert_name)=lower(s.expert_name)
          and bk.created_at between s.created_at - interval '1 minute' and s.created_at + interval '10 minutes'
        )
      )
    order by case when bk.chat_session_id=s.id then 0 else 1 end, bk.created_at desc
    limit 1
  ) b on true
  order by
    case s.status when 'pending' then 0 when 'active' then 1 else 2 end,
    s.created_at desc;
end;
$$;

grant execute on function public.af_admin_list_chats() to authenticated;
