#!/usr/bin/env python3
"""Generate one neural speech clip using the edge-tts open-source client.

The client is open source; the speech endpoint itself is Microsoft's hosted
Edge speech service. Keep the endpoint server-side, not in the Android app.
"""
import asyncio
import json
import re
import sys

import edge_tts

ALLOWED_VOICES = {
    "ur-PK-UzmaNeural", "ur-PK-AsadNeural", "ur-IN-GulNeural", "ur-IN-SalmanNeural",
    "hi-IN-SwaraNeural", "hi-IN-MadhurNeural",
    "en-IN-NeerjaNeural", "en-IN-PrabhatNeural",
}

async def main() -> int:
    payload = json.loads(sys.stdin.read() or "{}")
    text = re.sub(r"\[/?VERSE\]", "", str(payload.get("text", "")), flags=re.IGNORECASE).strip()
    voice = str(payload.get("voice", "ur-PK-UzmaNeural"))
    if not text or len(text) > 6000:
        raise ValueError("Text must contain 1–6000 characters.")
    if voice not in ALLOWED_VOICES:
        voice = "ur-PK-UzmaNeural"

    communicator = edge_tts.Communicate(text, voice=voice, rate="-8%", pitch="+0Hz", volume="+0%")
    audio = bytearray()
    async for chunk in communicator.stream():
        if chunk.get("type") == "audio":
            audio.extend(chunk.get("data", b""))
    if not audio:
        raise RuntimeError("The speech provider returned an empty audio stream.")
    sys.stdout.buffer.write(audio)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except Exception as exc:
        print(f"edge-tts: {exc}", file=sys.stderr)
        raise SystemExit(1)
