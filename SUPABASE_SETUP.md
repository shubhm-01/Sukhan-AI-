# Sukhan AI — Supabase setup

## Account / project status

Create a dedicated project named `sukhan-ai` in the Supabase Dashboard. The connected account has already reached the two-active-Free-project limit, so the project API refused to create a third project. Do not reuse the unrelated `family-guardian` project. Pause an unused Free project in the Dashboard or use another organization/account before creating Sukhan AI.

## 1. Create the project

1. Open https://supabase.com/dashboard and create a project named `sukhan-ai`.
2. Choose the nearest region (for India, `ap-south-1` / Mumbai when offered).
3. Use the Free plan if its limits are acceptable.
4. In SQL Editor, paste and run all of `supabase/schema.sql`.

The schema creates `chats`, `messages`, `saved_poems`, and `poem_embeddings`, enables pgvector, and adds owner-scoped RLS policies. Embedding dimension is 384; generate vectors with a matching 384-dimensional model.

## 2. Auth settings (email + six-digit code)

In Authentication → Providers → Email, enable the Email provider, password sign-in, and email confirmations. Keep email confirmation enabled so the app requires verification before it treats an account as verified. In Authentication → Email Templates, update the confirmation / Magic Link template to display the numeric token, for example:

```html
<h2>Verify your Sukhan AI account</h2>
<p>Your six-digit verification code is: <strong>{{ .Token }}</strong></p>
<p>This code expires soon. If you did not request it, ignore this email.</p>
```

The in-app flow uses `signUp({ email, password })`, then `verifyOtp({ email, token, type: 'signup' })`; no browser popup or OAuth redirect is used. When this setting and the numeric-token email template are configured, the app accepts the six-digit code directly in its own modal.

Important: new Supabase Free projects currently cannot customise Auth email templates with the default SMTP service. To deliver a numeric code using the custom template, configure your own SMTP provider under Authentication → SMTP Settings. Without custom SMTP/template support, the confirmation email may contain a link instead of the six-digit code.

## 3. Configure GitHub Actions

Add these repository Actions variables (not service secrets):
- `VITE_SUPABASE_URL` = Project URL from Project Settings → API.
- `VITE_SUPABASE_ANON_KEY` = legacy anon key, or put the modern publishable key in this same variable. This is a public client key and is protected by RLS.

Add:
- `VITE_API_BASE_URL` = the HTTPS URL of the deployed Node API.

Never put a `service_role` key or Supabase secret key into a `VITE_*` variable or an Android APK. Those keys bypass RLS.

## 4. RAG embeddings

Use a 384-dimensional embedding model and store each chunk in `public.poem_embeddings`. Keep one row per poem chunk, set `user_id` to the authenticated user, `poem_id` to the user's saved poem, `chunk_index` to its position, and store the embedding as a pgvector vector. RLS prevents users from reading or writing another user's poems or vectors.

## 5. Verify

After running the SQL:
- Confirm all four tables exist in the public schema.
- Confirm the `vector` extension is installed.
- Run Supabase Security Advisor and resolve any warnings before production use.
- Test signup, email verification, password sign-in, local-to-cloud chat sync, and sign-out from an Android APK.

Free-plan projects may pause after a week of low activity and have quota limits; this is a free-tier setup, not an uptime guarantee.
