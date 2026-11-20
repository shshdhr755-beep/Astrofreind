-- AstroFriend: definitive chat booking -> admin details link
-- Safe migration: does not delete or alter wallet balances.
alter table public.af_bookings
  add column if not exists chat_session_id uuid references public.af_chat_sessions(id) on delete set null;
create unique index if not exists af_bookings_chat_session_uidx
  on public.af_bookings(chat_session_id) where chat_session_id is not null;

-- Backfill existing bookings to their nearest matching chat session (same customer/expert,
-- created within 15 minutes). Only fills sessions not already linked.
with matches as (
  select b.id booking_id, s.id session_id,
         row_number() over (partition by b.id order by abs(extract(epoch from (b.created_at-s.created_at)))) rn
  from public.af_bookings b
  join public.af_chat_sessions s
    on s.customer_id=b.customer_id
   and lower(trim(s.expert_name))=lower(trim(b.expert_name))
   and abs(extract(epoch from (b.created_at-s.created_at))) <= 900
  where b.chat_session_id is null
)
update public.af_bookings b
set chat_session_id=m.session_id
from matches m
where b.id=m.booking_id and m.rn=1
  and not exists (select 1 from public.af_bookings x where x.chat_session_id=m.session_id);

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
language plpgsql security definer set search_path=public,auth
as $$
declare v_id uuid; v_session public.af_chat_sessions%rowtype; v_balance numeric;
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  select * into v_session from public.af_chat_sessions
    where id=p_session_id and customer_id=auth.uid() and status='pending' for update;
  if not found then raise exception 'Chat request not found. Please submit again.'; end if;
  select balance into v_balance from public.af_wallets where user_id=auth.uid() for update;
  if coalesce(v_balance,0) < v_session.rate_per_minute then
    raise exception 'Error funds: wallet balance chat shuru karne ke liye paryapt nahi hai.';
  end if;
  insert into public.af_bookings(
    customer_id,chat_session_id,expert_name,service_name,customer_name,customer_phone,
    birth_date,birth_place,birth_time,message,consultation_price
  ) values (
    auth.uid(),p_session_id,p_expert_name,p_service_name,p_customer_name,null,
    p_birth_date,p_birth_place,p_birth_time,p_message,p_consultation_price
  ) returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.af_save_chat_booking(uuid,text,text,text,date,text,time,text,numeric) to authenticated;

drop function if exists public.af_admin_list_chats();
create function public.af_admin_list_chats()
returns table (
  id uuid, customer_id uuid, customer_email text, customer_name text,
  expert_name text, rate_per_minute numeric, status text,
  created_at timestamptz, started_at timestamptz, ended_at timestamptz,
  booking_id uuid, birth_date date, birth_place text, birth_time time,
  customer_message text, service_name text, booking_customer_name text,
  consultation_price numeric
)
language plpgsql security definer
set search_path=public,auth
as $$
begin
  if not public.af_is_admin() then raise exception 'Admin access required.'; end if;
  return query
  select s.id,s.customer_id,u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',b.customer_name,'Customer'),
    s.expert_name,s.rate_per_minute,s.status,s.created_at,s.started_at,s.ended_at,
    b.id,b.birth_date,b.birth_place,b.birth_time,b.message,b.service_name,b.customer_name,b.consultation_price
  from public.af_chat_sessions s
  join auth.users u on u.id=s.customer_id
  left join lateral (
    select ab.* from public.af_bookings ab
    where ab.chat_session_id=s.id
       or (ab.chat_session_id is null and ab.customer_id=s.customer_id
           and lower(trim(ab.expert_name))=lower(trim(s.expert_name))
           and abs(extract(epoch from (ab.created_at-s.created_at))) <= 900)
    order by (ab.chat_session_id=s.id) desc, abs(extract(epoch from (ab.created_at-s.created_at))) asc
    limit 1
  ) b on true
  order by case s.status when 'pending' then 0 when 'active' then 1 else 2 end,s.created_at desc;
end;
$$;
grant execute on function public.af_admin_list_chats() to authenticated;
