# Sukhan AI — Standalone Android APK & Optional Cloud Run Backend

The Sukhan AI Android APK works **out-of-the-box** with zero manual GitHub Actions variables required:
- By default, the packaged Android APK uses the built-in **5-Tier Live AI Engine** (`src/utils/apiClient.ts`), connecting directly to the live Cloud AI endpoint (`https://text.pollinations.ai/openai`) and on-device literary engine when no custom backend URL is set.
- Optionally, you may also set `GEMINI_API_KEY` in GitHub Secrets or `SUKHAN_API_BASE_URL` in GitHub Repository Variables if you deploy your own Cloud Run backend.
