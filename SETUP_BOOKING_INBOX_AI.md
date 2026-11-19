# AstroFriend — Booking, Inbox & AI update

## Included
- Booking form hides the duplicate expert selector and uses the expert passed from the Experts page URL.
- Booking form collects date of birth, place of birth, and time of birth, and saves requests to `public.af_bookings`.
- Customer Inbox shows previous, pending, and active expert chat sessions.
- AstroFriend AI page is restricted to astrology, kundli, numerology, horoscope, and related traditional future guidance.
- Existing wallet, expert chat, account, services, and styling are retained.

## Supabase
The updated `supabase/astrofriend_wallet_chat.sql` includes the `af_bookings` table and policies. Run the full SQL file again in Supabase SQL Editor; it is written with `IF NOT EXISTS` and policy replacements for repeat setup.

## AI key (required)
AI chat requires an OpenAI API key. Add it in Netlify:
1. Netlify Dashboard → your AstroFriend site → Site configuration → Environment variables.
2. Add `OPENAI_API_KEY` with your private API key as the value.
3. Optionally add `OPENAI_MODEL` = `gpt-4o-mini`.
4. Trigger a new deploy.

Never put the OpenAI key in `src`, `.env` with a `VITE_` prefix, GitHub, or browser code. Keep it only in Netlify environment variables. API usage may incur charges.

## Existing setup
Keep your existing Supabase URL, anon key, `VITE_ADMIN_EMAIL`, and `.env` settings. Do not replace them with new keys. Razorpay payments are still disabled until a verified payment gateway setup is completed.

## Test checklist
- Open an expert card and use Book Now: the selected expert should appear as fixed text, not a dropdown.
- Submit a test booking with birth details; verify it appears in `public.af_bookings`.
- Sign in as customer and open Inbox; old conversations should appear.
- Add the OpenAI key in Netlify and test AstroFriend AI with an astrology question and an unrelated question.
- Test wallet/chat using a separate customer account and a small test balance before public launch.
