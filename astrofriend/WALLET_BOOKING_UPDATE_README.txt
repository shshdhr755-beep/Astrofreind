AstroFriend wallet/booking update

1. Replace the existing project files with this ZIP contents.
2. In Supabase SQL Editor, run supabase/astrofriend_wallet_booking_enforcement.sql once.
3. Commit and push the project to GitHub main; Netlify should deploy automatically.
4. Test using two separate customer accounts:
   - zero wallet: paid booking/chat request must show "Error funds" and create no booking/request.
   - enough wallet: request/booking can be created.
   - human chat: no charge on request; charges begin after admin accepts and chat starts, one minute at a time.
   - AI consultation: first minute is charged when the consultation starts, then each subsequent minute.
   - fixed-price AI report: charged only after the report is successfully generated and saved.
5. Admin chat requests are shown through af_admin_list_chats; the admin account must be present in public.af_admins and match Netlify VITE_ADMIN_EMAIL.

Notes:
- Add Money remains disabled until secure Razorpay payment verification is configured.
- Existing customer wallet balances are not merged; each wallet remains tied to its own Supabase user_id.
- This ZIP was not built or deployed in this environment. Verify after deployment.
