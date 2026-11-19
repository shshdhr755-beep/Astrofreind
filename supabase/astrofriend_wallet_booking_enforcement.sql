-- AstroFriend wallet enforcement + booking flow

create or replace function public.af_create_chat_request(p_expert_name text,p_rate_per_minute numeric)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_balance numeric;
begin
 if auth.uid() is null then raise exception 'Please login first.'; end if;
 if coalesce(trim(p_expert_name),'')='' or p_rate_per_minute not in (4,5) then
   raise exception 'Invalid expert or chat rate.';
 end if;
 insert into public.af_wallets(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select balance into v_balance from public.af_wallets where user_id=auth.uid() for update;
 if coalesce(v_balance,0)<p_rate_per_minute then
   raise exception 'Error funds: chat request ke liye wallet mein kam se kam ₹% chahiye.',p_rate_per_minute;
 end if;
 if exists(select 1 from public.af_chat_sessions where customer_id=auth.uid() and status in ('pending','active')) then
   raise exception 'Aapki ek chat pehle se pending ya active hai.';
 end if;
 insert into public.af_chat_sessions(customer_id,expert_name,rate_per_minute)
 values(auth.uid(),trim(p_expert_name),p_rate_per_minute) returning id into v_id;
 return v_id;
end;
$$;
grant execute on function public.af_create_chat_request(text,numeric) to authenticated;

-- Run once in Supabase SQL Editor after the updated website is deployed.

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
language plpgsql security definer set search_path=public
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
  insert into public.af_bookings(customer_id,expert_name,service_name,customer_name,customer_phone,birth_date,birth_place,birth_time,message,consultation_price)
  values(auth.uid(),p_expert_name,p_service_name,p_customer_name,null,p_birth_date,p_birth_place,p_birth_time,p_message,p_consultation_price)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.af_save_paid_booking(
  p_expert_name text,
  p_service_name text,
  p_customer_name text,
  p_birth_date date,
  p_birth_place text,
  p_birth_time time,
  p_message text,
  p_consultation_price numeric,
  p_charge_now boolean
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_balance numeric;
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  if coalesce(p_consultation_price,0)<0 then raise exception 'Invalid consultation price.'; end if;
  if coalesce(p_charge_now,false) and p_consultation_price>0 then
    select balance into v_balance from public.af_wallets where user_id=auth.uid() for update;
    if coalesce(v_balance,0)<p_consultation_price then
      raise exception 'Error funds: wallet mein paryapt balance nahi hai. Report generate nahi hui aur paise nahi kate.';
    end if;
    update public.af_wallets set balance=balance-p_consultation_price,updated_at=now()
      where user_id=auth.uid();
    insert into public.af_wallet_transactions(user_id,amount,kind,description)
      values(auth.uid(),-p_consultation_price,'chat_debit','Astrology report · '||p_service_name);
  end if;
  insert into public.af_bookings(customer_id,expert_name,service_name,customer_name,customer_phone,birth_date,birth_place,birth_time,message,consultation_price)
  values(auth.uid(),p_expert_name,p_service_name,p_customer_name,null,p_birth_date,p_birth_place,p_birth_time,p_message,p_consultation_price)
  returning id into v_id;
  return v_id;
end;
$$;

-- Prevent direct client inserts that could bypass the wallet checks.
drop policy if exists af_bookings_customer_insert on public.af_bookings;
grant execute on function public.af_save_chat_booking(uuid,text,text,text,date,text,time,text,numeric) to authenticated;
grant execute on function public.af_save_paid_booking(text,text,text,date,text,time,text,numeric,boolean) to authenticated;

