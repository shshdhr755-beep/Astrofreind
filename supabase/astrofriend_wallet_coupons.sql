-- AstroFriend secure wallet coupon system
-- Run once in Supabase Dashboard > SQL Editor > New query.
create table if not exists public.af_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  max_uses integer not null check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.af_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.af_coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  redeemed_at timestamptz not null default now(),
  unique(coupon_id,user_id)
);
create index if not exists af_coupon_redemptions_user_idx on public.af_coupon_redemptions(user_id,redeemed_at desc);
alter table public.af_coupons enable row level security;
alter table public.af_coupon_redemptions enable row level security;
revoke all on public.af_coupons, public.af_coupon_redemptions from anon, authenticated;

create or replace function public.af_admin_create_coupon(
  p_code text, p_amount numeric, p_max_uses integer, p_expires_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_code text;
begin
  if not public.af_is_admin() then raise exception 'Admin access required.'; end if;
  v_code := upper(regexp_replace(trim(coalesce(p_code,'')), '\s+', '', 'g'));
  if v_code !~ '^[A-Z0-9_-]{4,40}$' then raise exception 'Coupon code 4-40 characters ka ho; sirf letters, numbers, _ ya - use karein.'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'Coupon amount ₹1 se ₹1,00,000 ke beech hona chahiye.'; end if;
  if p_max_uses is null or p_max_uses < 1 or p_max_uses > 100000 then raise exception 'Max uses 1 se 100000 ke beech hona chahiye.'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Expiry future date/time hona chahiye.'; end if;
  insert into public.af_coupons(code,amount,max_uses,expires_at,created_by)
  values(v_code,round(p_amount,2),p_max_uses,p_expires_at,auth.uid());
  return jsonb_build_object('code',v_code,'amount',round(p_amount,2),'max_uses',p_max_uses,'expires_at',p_expires_at);
exception when unique_violation then raise exception 'Ye coupon code pehle se maujood hai. Naya code use karein.';
end; $$;

create or replace function public.af_redeem_coupon(p_code text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.af_coupons%rowtype; v_code text; v_balance numeric;
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  v_code := upper(regexp_replace(trim(coalesce(p_code,'')), '\s+', '', 'g'));
  if v_code = '' then raise exception 'Coupon code enter karein.'; end if;
  select * into c from public.af_coupons where code=v_code for update;
  if not found or not c.active then raise exception 'Coupon code invalid ya inactive hai.'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'Coupon expire ho chuka hai.'; end if;
  if c.uses >= c.max_uses then raise exception 'Coupon ki maximum usage limit poori ho gayi hai.'; end if;
  if exists(select 1 from public.af_coupon_redemptions where coupon_id=c.id and user_id=auth.uid()) then raise exception 'Aap ye coupon pehle hi use kar chuke hain.'; end if;
  insert into public.af_wallets(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  insert into public.af_coupon_redemptions(coupon_id,user_id,amount) values(c.id,auth.uid(),c.amount);
  update public.af_coupons set uses=uses+1 where id=c.id;
  update public.af_wallets set balance=balance+c.amount,updated_at=now() where user_id=auth.uid() returning balance into v_balance;
  insert into public.af_wallet_transactions(user_id,amount,kind,description)
  values(auth.uid(),c.amount,'adjustment','Coupon redeemed · '||c.code);
  return jsonb_build_object('credited',c.amount,'balance',v_balance,'code',c.code);
end; $$;

grant execute on function public.af_admin_create_coupon(text,numeric,integer,timestamptz) to authenticated;
grant execute on function public.af_redeem_coupon(text) to authenticated;

-- Enforce wallet minimum at the database layer for human chat requests as well.
-- Existing af_create_chat_request already checks balance and remains authoritative.
