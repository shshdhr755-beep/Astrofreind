ASTROFRIEND FINAL FIX - IMPORTANT SETUP

Included fixes:
1. Removed the Home page top Inbox / View conversations strip.
2. Fixed mobile booking form sizing, especially iPhone date/time inputs overflowing their card.
3. Admin chat request details now show customer name, selected service, date of birth, birth place, birth time, and message.
4. Improved AstroFriend Consultation API error handling. When opened through plain Vite, it now explains that Netlify Functions are not running instead of showing a confusing parser error.
5. Added a database migration that links each chat request to its exact booking details and returns those details in the admin chat list.

REQUIRED SUPABASE STEP:
Before testing the new Admin details, open Supabase Dashboard > SQL Editor, create a New query, paste the complete contents of:
supabase/astrofriend_final_fix.sql
Then click Run.

Do not skip this SQL step. The website needs the updated RPC response to retrieve the form details securely.

LOCAL DEVELOPMENT:
The AI Consultation server function is a Netlify Function. Plain `npm run dev` starts Vite only and does not run Netlify Functions.
For local testing, run `npx netlify dev` from the project folder (Netlify CLI must be installed and the required environment variables must be configured). On the live Netlify deployment, ensure the OPENAI_API_KEY, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY environment variables are configured.

SECURITY:
The uploaded ZIP contained a local .env file. This final ZIP intentionally excludes .env and Git history. Keep your existing environment variables private; do not share the anon/service keys or OpenAI key publicly.

WALLET:
The existing server-side wallet charging rules are retained. Test with a separate customer account and a small balance before launch. Never manually edit wallet balances in the browser.
