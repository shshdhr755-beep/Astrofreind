# AstroFriend Chat Request Fix

## What changed
1. Human chat requests now call the secure Supabase `af_create_chat_request` RPC BEFORE inserting a booking row.
2. If the wallet has less than one minute of the selected expert's rate (₹4 or ₹5), the RPC rejects the request and no booking row is created.
3. If booking details fail to save after a session is created, the app ends that pending session to avoid leaving an orphan request.
4. A database trigger blocks direct insertion of human-chat bookings unless the same customer already has a pending chat session for that expert.
5. The wallet row is locked during the request check to reduce race-condition bypasses.

## Required Supabase step
Run `supabase/astrofriend_chat_request_fix.sql` in Supabase Dashboard → SQL Editor → New query.

This SQL does not alter wallet balances and does not delete existing data.

## Admin access check
The admin panel lists `af_chat_sessions` through `af_admin_list_chats()`. The signed-in admin must:
- have the same email as Netlify's `VITE_ADMIN_EMAIL`; and
- exist in `public.af_admins`.

If the admin row is missing, uncomment the INSERT block at the bottom of the SQL file, replace `YOUR_ADMIN_EMAIL` with the exact `VITE_ADMIN_EMAIL`, and run that block. Do not add a customer email as admin.

## Deploy
Replace the project files with this ZIP and deploy through the existing GitHub/Netlify workflow. Keep your existing `.env` and Netlify environment variables unchanged.

## Validation status
The source changes were inspected, but a production build and live Supabase/Netlify test were not run in this environment. Test with a zero-balance customer and a customer with at least ₹4/₹5 before opening the feature to customers.
