# Deploy Sukhan AI backend to Google Cloud Run

The Android APK needs a live HTTPS backend. The Cloud Run URL previously used in the APK returned 404 at both `/` and `/api/health`, so it is not currently serving this repository's Express app. Do not use that URL for a new APK until it has been verified.

## 1. Configure Google Cloud

In the Google Cloud project that should host Sukhan AI:

1. Enable Cloud Run, Cloud Build, and Secret Manager.
2. Create a Secret Manager secret named `gemini-api-key` and add your Gemini API key as its value. Do not put the key in source code, GitHub Actions variables, or the APK.
3. Make sure the Cloud Run runtime service account can access that secret.

## 2. Deploy from this repository

With the Google Cloud CLI installed and the correct project selected, run from the repository root:

```bash
gcloud run deploy sukhan-ai \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

The repository's `Dockerfile` builds the React app and starts the Express server. The server listens on Cloud Run's assigned `PORT`.

## 3. Verify the deployment

Copy the HTTPS service URL printed by Cloud Run and open:

```
https://YOUR-CLOUD-RUN-URL/api/health
```

Expected JSON includes `"ok": true` and `"aiConfigured": true`. If `aiConfigured` is false, fix the Secret Manager binding before testing chat.

The APK and website use these server routes, including `POST /api/chat/stream` and `POST /api/chat/message`. Test a real message in the deployed app before distributing an APK.

## 4. Configure the APK build

In GitHub, open **Settings → Secrets and variables → Actions → Variables**, create a repository variable named `SUKHAN_API_BASE_URL`, and set its value to the new Cloud Run service URL (the origin only; no `/api` suffix).

Then run **Actions → Build Sukhan AI Android APK → Run workflow**. The build intentionally fails if this variable is missing or is not HTTPS, instead of producing an APK that points at an invalid backend.

The Gemini API key must remain a server-side Cloud Run secret. Do not set `VITE_GEMINI_API_KEY`: Vite variables are compiled into the APK and are not secret.
