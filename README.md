---
title: Sukhan AI Backend
emoji: 💬
colorFrom: yellow
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: Sukhan AI API and LiveKit voice worker
---

# Sukhan AI backend

This Docker Space runs the Sukhan AI Node API and, when LiveKit/Groq secrets are configured, the LiveKit voice worker in the same container.

Required Space secrets:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable / legacy anon key)
- `GEMINI_API_KEY` (only if using the poetry generation route)

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) and [LIVE_VOICE_SETUP.md](LIVE_VOICE_SETUP.md) in the GitHub repository for setup notes.

Note: Hugging Face Spaces compute for Docker requires a PRO personal account or an eligible Team/Enterprise organization; free personal accounts can use eligible ZeroGPU Gradio Spaces, not this combined Docker service.
