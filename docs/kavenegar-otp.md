# Kavenegar OTP setup (HiEvent)

## Where does the API key go?

**Not in the React app.** Never put it in `VITE_*` or commit it.

Put it only as a **Supabase Edge Function secret**:

```bash
supabase secrets set KAVENEGAR_API_KEY=YOUR_KEY_HERE
supabase secrets set KAVENEGAR_TEMPLATE=verify
```

Or in Supabase Dashboard → Project → Edge Functions → Secrets.

## One-time setup

1. In [Kavenegar](https://panel.kavenegar.com/) create a **Verify** template:
   - English name, e.g. `verify` (must match `KAVENEGAR_TEMPLATE`)
   - Body must include `%token`, e.g. `کد ورود های‌ایونت: %token`
2. Run SQL from `supabase/migrations/20260726_otp_challenges.sql` in the SQL editor.
3. Deploy:

```bash
supabase functions deploy otp-send
supabase functions deploy otp-verify
```

## Flow

- Login / signup → `otp-send` → Kavenegar SMS → user enters code → `otp-verify` → Supabase session
- Profile phone change → same, with `purpose: phone_change` (requires logged-in user)
