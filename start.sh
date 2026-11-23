#!/usr/bin/env bash
set -Eeuo pipefail

export PORT="${PORT:-7860}"
NODE_PID=""
AGENT_PID=""

cleanup() {
  [[ -z "$NODE_PID" ]] || kill "$NODE_PID" 2>/dev/null || true
  [[ -z "$AGENT_PID" ]] || kill "$AGENT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[Sukhan] Starting Node API on port $PORT"
npm start &
NODE_PID=$!

if [[ -n "${LIVEKIT_URL:-}" && -n "${LIVEKIT_API_KEY:-}" && -n "${LIVEKIT_API_SECRET:-}" && -n "${GROQ_API_KEY:-}" ]]; then
  echo "[Sukhan] Starting LiveKit voice worker"
  python livekit-agent/agent.py start &
  AGENT_PID=$!
else
  echo "[Sukhan] Live voice worker not started: LIVEKIT_URL/API_KEY/API_SECRET and GROQ_API_KEY must be set as Space secrets."
fi

if [[ -n "$AGENT_PID" ]]; then
  wait -n "$NODE_PID" "$AGENT_PID"
else
  wait "$NODE_PID"
fi
