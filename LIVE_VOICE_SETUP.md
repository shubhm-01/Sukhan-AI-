# Sukhan AI — Android, Supabase Auth, read-aloud and Live Voice

## Current app framework

React 19 + Vite + Tailwind CSS 4 wrapped as an Android app by Capacitor. It is not React Native, Expo or Flutter. GitHub Actions generates the Android project, patches the Android manifest and builds the APK.

## Supabase Auth and offline-first sync

The Firebase Auth / Firestore integration has been replaced in this branch with `@supabase/supabase-js`.

- Sign in: email + password inside an in-app modal; no `signInWithPopup`.
- Sign up: email + password, followed by a six-digit email verification code.
- OTP confirmation: `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
- Chats, messages and Saved Shayari: remain in localStorage when signed out; on sign-in, local history is upserted into the user's Supabase account and cloud history/poems are restored to the device.
- Postgres RLS ties each row to `auth.uid()`. The Android client uses only a public anon/publishable key.

Create a dedicated Supabase project and run `supabase/schema.sql`; see `SUPABASE_SETUP.md`. Do not use the unrelated family-guardian project.

## Required Supabase configuration

**Android APK build (GitHub Actions repository variables):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` — public anon key or publishable key
- `VITE_API_BASE_URL` — HTTPS API origin, no trailing slash

**Node backend secrets:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — public anon/publishable key used only to validate bearer access tokens with Auth
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GEMINI_API_KEY` — optional, for the existing poetry generation endpoint

Never put a Supabase service-role key, Supabase secret key, Groq key or LiveKit API secret into a `VITE_*` variable or the APK.

## Six-digit email OTP delivery

Set the Supabase Auth confirmation email template to include `{{ .Token }}`. The Free-plan default Supabase SMTP currently does not allow custom Auth email templates on newly created projects; configure your own SMTP provider to send the six-digit code template. See the Supabase setup guide for the example template.

## Live Voice architecture

The Node API `server.ts` issues short-lived LiveKit room tokens after verifying the caller's Supabase access token with `auth.getUser(accessToken)`.

The Python worker `livekit-agent/agent.py` uses:
- LiveKit Agents
- Groq Whisper STT: `whisper-large-v3-turbo`
- Groq LLM: `openai/gpt-oss-120b`
- Silero VAD for turn detection / interruption
- Edge TTS neural voices for Urdu, Hindi and English

Required worker secrets:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GROQ_API_KEY`

Optional:
- `LIVEKIT_AGENT_NAME=sukhan-live`
- `GROQ_STT_MODEL=whisper-large-v3-turbo`
- `GROQ_LLM_MODEL=openai/gpt-oss-120b`
- `EDGE_TTS_VOICE_URDU`, `EDGE_TTS_VOICE_HINDI`, `EDGE_TTS_VOICE_ENGLISH`

## Hugging Face Docker deployment

The repository root now contains:
- `README.md` with Hugging Face Space metadata: `sdk: docker`, `app_port: 7860`
- `Dockerfile` that installs Node, Python, FFmpeg and worker dependencies
- `start.sh` that supervises the Node API and the LiveKit worker together

For a Space deployment, add these as Hugging Face Space secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GROQ_API_KEY`
- `GEMINI_API_KEY` if using the poetry generation API

To upload this branch to `hfexplorer2634/sukhan-ai-backend`, add a repository secret named `HF_TOKEN` in GitHub with a Hugging Face token that can contribute to repositories, then manually run the GitHub Actions workflow `Deploy backend to Hugging Face Space`.

**Hosting limitation:** Hugging Face currently requires a PRO personal plan (or Team/Enterprise for organizations) to create/run compute-backed Docker Spaces on CPU Basic. Static Spaces are free, and eligible free personal accounts can use up to two ZeroGPU Gradio Spaces; those cannot run this combined Node + LiveKit Docker service. The Docker deployment files are prepared, but the existing free Gradio Space is not converted or deployed by this branch workflow. Do not assume a live `hf.space` API URL until the Docker Space starts successfully.

## Android networking

The app's backend URL is configurable in Settings and can also be provided as `VITE_API_BASE_URL` during the build. The Android manifest patch includes INTERNET, ACCESS_NETWORK_STATE, RECORD_AUDIO and MODIFY_AUDIO_SETTINGS permissions and blocks cleartext HTTP. Use HTTPS URLs for the API and Supabase.

## Free/open-source scope

The frontend libraries, Supabase client, Postgres schema, pgvector, LiveKit Agents/SDK and Silero VAD are open-source. Groq and LiveKit Cloud are hosted services with quotas; Edge TTS is an open-source client to Microsoft's hosted speech endpoint, not an offline open model. This is a free-tier-friendly setup, not an unlimited, always-on or fully self-hosted guarantee.

## Build checks

```bash
npm run lint
npm test
npm run build
python -m compileall livekit-agent scripts/edge-tts.py
```

The GitHub Actions Android workflow is the authoritative generated Android / Gradle APK check.
