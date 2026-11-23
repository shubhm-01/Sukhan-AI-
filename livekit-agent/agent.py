"""Sukhan AI's LiveKit Agents worker.

Groq supplies multilingual Whisper STT and GPT-OSS chat inference. Silero VAD
runs locally in this process. Edge TTS is an online neural voice adapter:
the Python client is open source, while Microsoft's speech endpoint is hosted.
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import re
from typing import AsyncGenerator, AsyncIterable

import av
import edge_tts
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentServer, AgentSession, ModelSettings
from livekit.plugins import groq, silero

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("sukhan-live")

VOICE_BY_LANGUAGE = {
    "ur": os.getenv("EDGE_TTS_VOICE_URDU", "ur-PK-UzmaNeural"),
    "hi": os.getenv("EDGE_TTS_VOICE_HINDI", "hi-IN-SwaraNeural"),
    "en": os.getenv("EDGE_TTS_VOICE_ENGLISH", "en-IN-NeerjaNeural"),
}
ALLOWED_VOICES = {
    "ur-PK-UzmaNeural", "ur-PK-AsadNeural", "ur-IN-GulNeural", "ur-IN-SalmanNeural",
    "hi-IN-SwaraNeural", "hi-IN-MadhurNeural",
    "en-IN-NeerjaNeural", "en-IN-PrabhatNeural",
}
SYSTEM_PROMPT = """You are Sukhan AI, a warm multilingual conversational poet.
Speak naturally in Urdu, Roman Urdu/Hinglish, Hindi, or English, matching the
user's language. Do not compose poetry unless asked. When asked, understand
Beher/Bahr, Qafiya, Radif, Matla, Maqta, Nazm and Sher. Preserve metre and the
exact requested Radif. Keep normal conversation concise and friendly. When
speaking poetry, pause naturally between couplets and pronounce Urdu/Hindi
words carefully. The user may interrupt at any moment; yield immediately."""

def detect_language(text: str, fallback: str = "ur") -> str:
    if re.search(r"[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff]", text):
        return "ur"
    if re.search(r"[\u0900-\u097f]", text):
        return "hi"
    roman_markers = ("ishq", "ghazal", "shayari", "dil", "yaad", "khamoshi", "safar", "hijr")
    if any(re.search(rf"\b{word}\b", text.lower()) for word in roman_markers):
        return "ur"
    return fallback if fallback in ("ur", "hi", "en") else "en"

async def sentence_segments(text_stream: AsyncIterable[str]) -> AsyncGenerator[str, None]:
    """Buffer model deltas to sentence-sized clips rather than speaking token-by-token."""
    buffer = ""
    boundary = re.compile(r"[.!?؟۔।\n]")
    async for delta in text_stream:
        buffer += str(delta)
        while True:
            match = boundary.search(buffer)
            if not match and len(buffer) < 180:
                break
            end = match.end() if match else 140
            segment, buffer = buffer[:end].strip(), buffer[end:].lstrip()
            if segment:
                yield segment
    if buffer.strip():
        yield buffer.strip()

def mp3_to_livekit_frames(audio_bytes: bytes) -> list[rtc.AudioFrame]:
    """Decode Edge TTS MP3 output into 24 kHz mono PCM for LiveKit."""
    frames: list[rtc.AudioFrame] = []
    container = av.open(io.BytesIO(audio_bytes), format="mp3")
    resampler = av.AudioResampler(format="s16", layout="mono", rate=24000)
    for source_frame in container.decode(audio=0):
        for frame in resampler.resample(source_frame):
            pcm = frame.to_ndarray().tobytes()
            if pcm:
                frames.append(
                    rtc.AudioFrame(
                        data=pcm,
                        sample_rate=24000,
                        num_channels=1,
                        samples_per_channel=len(pcm) // 2,
                    )
                )
    return frames

class SukhanAgent(Agent):
    def __init__(self, requested_voice: str = "auto", language: str = "ur") -> None:
        self.requested_voice = requested_voice if requested_voice in ALLOWED_VOICES else "auto"
        self.language = language if language in ("ur", "hi", "en") else "ur"
        super().__init__(instructions=SYSTEM_PROMPT)

    async def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: ModelSettings,
    ) -> AsyncGenerator[rtc.AudioFrame, None]:
        """Custom sentence TTS. LiveKit cancels this generator on barge-in."""
        first_segment = True
        async for segment in sentence_segments(text):
            if asyncio.current_task() and asyncio.current_task().cancelling():
                raise asyncio.CancelledError
            language = detect_language(segment, self.language)
            voice = self.requested_voice if self.requested_voice != "auto" else VOICE_BY_LANGUAGE[language]
            try:
                communicator = edge_tts.Communicate(
                    segment, voice=voice, rate="-8%", pitch="+0Hz", volume="+0%"
                )
                mp3 = bytearray()
                async for packet in communicator.stream():
                    if packet.get("type") == "audio":
                        mp3.extend(packet.get("data", b""))
                if not mp3:
                    logger.warning("TTS returned no audio for a sentence segment")
                    continue
                for frame in mp3_to_livekit_frames(bytes(mp3)):
                    yield frame
                # A brief inter-sentence pause lends spoken couplets a more natural cadence.
                if not first_segment:
                    silence_samples = 3600  # 150 ms at 24 kHz between spoken phrases
                    yield rtc.AudioFrame(
                        data=bytes(silence_samples * 2),
                        sample_rate=24000,
                        num_channels=1,
                        samples_per_channel=silence_samples,
                    )
                first_segment = False
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Edge TTS synthesis failed")
                # Keep the voice session alive; the next spoken segment can still succeed.

server = AgentServer()

@server.rtc_session(agent_name=os.getenv("LIVEKIT_AGENT_NAME", "sukhan-live"))
async def entrypoint(ctx: agents.JobContext) -> None:
    metadata: dict = {}
    try:
        metadata = json.loads(ctx.job.metadata or "{}")
    except (TypeError, json.JSONDecodeError):
        logger.warning("Agent job metadata was malformed")

    requested_voice = str(metadata.get("voice", "auto"))
    language = str(metadata.get("language", "ur"))
    if language == "roman_urdu":
        language = "ur"
    if language not in ("ur", "hi", "en"):
        language = "ur"

    session = AgentSession(
        stt=groq.STT(model=os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")),
        llm=groq.LLM(model=os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-120b")),
        vad=silero.VAD.load(),
    )
    await session.start(room=ctx.room, agent=SukhanAgent(requested_voice, language))
    await session.generate_reply(
        instructions="Greet the user briefly in their preferred language and invite them to speak."
    )

if __name__ == "__main__":
    agents.cli.run_app(server)
