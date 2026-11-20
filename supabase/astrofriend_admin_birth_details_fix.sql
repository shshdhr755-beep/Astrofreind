-- AstroFriend: link each human chat request to its booking and expose birth details to Admin.
-- Safe migration: adds a nullable link; does not delete or change wallet balances.

ALTER TABLE public.af_bookings
  ADD COLUMN IF NOT EXISTS chat_session_id uuid REFERENCES public.af_chat_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS af_bookings_chat_session_id_idx
  ON public.af_bookings(chat_session_id);

-- Replace the booking RPC so the booking is tied to the exact chat session.
CREATE OR REPLACE FUNCTION public.af_save_chat_booking(
  p_session_id uuid,
  p_expert_name text,
  p_service_name text,
  p_customer_name text,
  p_birth_date date,
  p_birth_place text,
  p_birth_time time,
  p_message text,
  p_consultation_price numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_id uuid;
  v_session public.af_chat_sessions%rowtype;
  v_balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please login first.'; END IF;
  SELECT * INTO v_session
  FROM public.af_chat_sessions
  WHERE id=p_session_id AND customer_id=auth.uid() AND status='pending'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chat request not found. Please submit again.'; END IF;

  SELECT balance INTO v_balance
  FROM public.af_wallets WHERE user_id=auth.uid() FOR UPDATE;
  IF COALESCE(v_balance,0) < v_session.rate_per_minute THEN
    RAISE EXCEPTION 'Error funds: wallet balance chat shuru karne ke liye paryapt nahi hai.';
  END IF;

  INSERT INTO public.af_bookings(
    customer_id, expert_name, service_name, customer_name, customer_phone,
    birth_date, birth_place, birth_time, message, consultation_price, chat_session_id
  ) VALUES (
    auth.uid(), p_expert_name, p_service_name, p_customer_name, NULL,
    p_birth_date, p_birth_place, p_birth_time, p_message, p_consultation_price, p_session_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.af_save_chat_booking(uuid,text,text,text,date,text,time,text,numeric) TO authenticated;

-- PostgreSQL requires DROP before changing a RETURNS TABLE row shape.
DROP FUNCTION IF EXISTS public.af_admin_list_chats();
CREATE FUNCTION public.af_admin_list_chats()
RETURNS TABLE (
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
  birth_date date,
  birth_place text,
  birth_time time,
  booking_message text,
  booking_id uuid
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth
AS $$
BEGIN
  IF NOT public.af_is_admin() THEN RAISE EXCEPTION 'Admin access required.'; END IF;
  RETURN QUERY
  SELECT
    s.id, s.customer_id, u.email::text,
    COALESCE(b.customer_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Customer'),
    s.expert_name, s.rate_per_minute, s.status, s.created_at, s.started_at, s.ended_at,
    b.birth_date, b.birth_place, b.birth_time, b.message, b.id
  FROM public.af_chat_sessions s
  JOIN auth.users u ON u.id=s.customer_id
  LEFT JOIN LATERAL (
    SELECT ab.id, ab.customer_name, ab.birth_date, ab.birth_place, ab.birth_time, ab.message
    FROM public.af_bookings ab
    WHERE ab.chat_session_id=s.id
       OR (ab.chat_session_id IS NULL
           AND ab.customer_id=s.customer_id
           AND lower(ab.expert_name)=lower(s.expert_name)
           AND lower(ab.service_name) LIKE '%chat%'
           AND ab.created_at BETWEEN s.created_at - interval '2 minutes' AND s.created_at + interval '10 minutes')
    ORDER BY (ab.chat_session_id=s.id) DESC, ab.created_at DESC
    LIMIT 1
  ) b ON true
  ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, s.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.af_admin_list_chats() TO authenticated;
