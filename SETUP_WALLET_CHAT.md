# AstroFriend Wallet + Chat Update

This update preserves the existing AstroFriend pages and styling and adds:
- Wallet balance and transaction history UI
- Add Money amount validation (₹20–₹1,00,000); real payment is intentionally disabled until Razorpay is configured
- Customer chat request, admin accept/reply inbox, chat timer
- Server-side minute charging through Supabase RPCs (no client-side balance editing)

## Setup (required before deploying)
1. In Supabase Dashboard → SQL Editor, run `supabase/astrofriend_wallet_chat.sql`.
2. In that SQL file, copy the final admin INSERT statement, replace `YOUR_ADMIN_EMAIL` with the exact email used in Netlify's `VITE_ADMIN_EMAIL`, and run it separately.
3. Make sure the same `VITE_ADMIN_EMAIL` is set in Netlify environment variables.
4. Deploy the project. Existing `.env` values and Supabase keys are not included in this ZIP; keep your current local `.env` and Netlify environment variables unchanged.

## Important limitations
- Razorpay payments are not active. Do not manually credit wallets from the browser. Add Money remains disabled until a verified server-side Razorpay order/payment flow is configured.
- Chat rates use existing 5-minute catalogue pricing: Senior experts ₹5/minute; Other experts ₹4/minute.
- The admin must be logged in with the configured admin email and be present in `public.af_admins`.
- Text chat only; no voice/video calling or push notifications.
- The first minute is charged one minute after the admin accepts the chat. Thereafter, one minute is charged at a time. The database controls the billing interval.
- This is an integration starter. Test with a separate customer account and a small test balance before public launch.
