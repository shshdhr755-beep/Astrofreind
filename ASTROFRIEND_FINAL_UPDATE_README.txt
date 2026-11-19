ASTROFRIEND FINAL UPDATE

WHAT CHANGED
- Home now opens directly on the Meet Our Experts directory. The separate Experts navbar item is removed; /experts redirects to Home.
- Successful login and OTP verification return to Home.
- Fixed the Verify Email page's missing search-params variable that caused a client-side error after signup.
- Booking form button now says Send Information. Human chat requests open the customer's own Inbox conversation immediately after the request is saved.
- Date and time fields now use consistent full-width sizing.
- Website typography is simplified to Arial/Helvetica only. Existing theme colours, backgrounds, borders, buttons and layout styling are retained.
- Customer Inbox refreshes chat status/messages, shows a timer after admin acceptance, supports customer replies and file attachments.
- Admin chat shows a running timer, supports replies and file attachments.
- New expert replies show an in-site notification banner and browser notification when notification permission is granted.

IMPORTANT SUPABASE STEP
Run this new SQL file once in Supabase Dashboard > SQL Editor:
supabase/astrofriend_chat_attachments.sql

This creates the private chat attachment bucket and access policies and adds attachment metadata columns. Without running it, chat text will work but file uploads will fail.

DEPLOY
1. Keep your existing local .env file unchanged. This ZIP intentionally does not include secrets or .env.
2. Copy the contents of the astrofriend folder over your existing project folder. Do not replace your .git folder or .env file.
3. In Git Bash:
   git add .
   git commit -m "Complete AstroFriend chat and home updates"
   git push origin main
4. Wait for Netlify deploy status Published.

NOTIFICATIONS
The site can show in-app/browser notifications while the customer has AstroFriend open. Browser notifications require the customer to allow notifications in the browser. True push notifications when the site/browser is fully closed require a push service/service-worker setup and are not included in this front-end update.

TEST BEFORE LIVE USE
- Test signup + OTP verification and confirm it returns to Home.
- Test a paid chat request with wallet balance at least the first minute's rate.
- Confirm the request appears in Admin, accept it, and check that both sides see the chat and timer.
- Send a text reply and an attachment in both directions.
- Confirm wallet minute charges and automatic ending at insufficient balance.

BUILD NOTE
A production build could not be run in this environment because npm dependency installation timed out. The source changes are supplied, but run `npm ci` and `npm run build` locally before deployment if possible.
