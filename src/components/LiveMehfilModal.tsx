import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  X,
  ScrollText,
  Copy,
  Check,
  BookmarkPlus,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  LIVE_VOICE_OPTIONS,
  type LiveVoiceName,
  type LiveMehfilMood,
} from '../data/shayariKnowledgeVault';
import { LiveAudioEngine } from '../utils/liveAudioEngine';
import {
  resolveWebSocketUrl,
  getBundledApkGeminiKey,
} from '../utils/apiClient';
import { retrieveRelevantShayari } from '../services/shayariCorpusService';
import { buildGeminiLiveAdaayegiInstruction } from '../data/poeticCraftEngine';
import {
  detectLanguageAndScript,
  type UserSettings,
  type GroundingSource,
} from '../utils/poetryLogic';

export interface MehfilTranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: GroundingSource[];
  saved?: boolean;
}

interface LiveMehfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveRecitationToChat: (coupletText: string, mood: LiveMehfilMood) => void;
}

type LivePhase = 'idle' | 'connecting' | 'live' | 'error';

const VOICE_STORAGE_KEY = 'sukhan_gemini_live_voice_v3';

export const LiveMehfilModal: React.FC<LiveMehfilModalProps> = ({
  isOpen,
  onClose,
  onSaveRecitationToChat,
}) => {
  const [voiceName, setVoiceName] = useState<LiveVoiceName>(() => {
    try {
      const saved = localStorage.getItem(VOICE_STORAGE_KEY) as LiveVoiceName | null;
      if (saved && LIVE_VOICE_OPTIONS.some((v) => v.id === saved)) return saved;
    } catch {
      // Ignore storage error
    }
    return 'Aoede';
  });

  const [phase, setPhase] = useState<LivePhase>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Connecting to Sukhan Live...'
  );
  const [errorText, setErrorText] = useState<string>('');
  const [transcript, setTranscript] = useState<MehfilTranscriptEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const directSessionRef = useRef<{
    sendRealtimeInput: (params: {
      audio: { data: string; mimeType: string };
    }) => void;
    close: () => void;
  } | null>(null);
  const audioEngineRef = useRef<LiveAudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<LivePhase>('idle');
  const isMutedRef = useRef<boolean>(false);
  const isAiSpeakingRef = useRef<boolean>(false);
  const voiceRef = useRef<LiveVoiceName>(voiceName);
  const activeAssistantEntryIdRef = useRef<string | null>(null);
  const activeUserEntryIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    audioEngineRef.current?.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  useEffect(() => {
    voiceRef.current = voiceName;
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, voiceName);
    } catch {
      // Ignore storage error
    }
  }, [voiceName]);

  const appendOrUpdateTranscript = useCallback(
    (
      role: 'user' | 'assistant',
      chunk: string,
      sources?: GroundingSource[]
    ) => {
      const trimmed = chunk.trim();
      if (!trimmed && !sources?.length) return;

      const targetRef =
        role === 'assistant' ? activeAssistantEntryIdRef : activeUserEntryIdRef;

      if (!targetRef.current) {
        targetRef.current = `live-${role}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
      }
      const entryId = targetRef.current;
      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      setTranscript((prev) => {
        const idx = prev.findIndex((item) => item.id === entryId);
        if (idx !== -1) {
          const copy = [...prev];
          const existing = copy[idx];
          const mergedSources = sources?.length
            ? [
                ...(existing.sources || []),
                ...sources.filter(
                  (s) => !(existing.sources || []).some((e) => e.uri === s.uri)
                ),
              ]
            : existing.sources;
          copy[idx] = {
            ...existing,
            text: trimmed
              ? existing.text
                ? `${existing.text}${chunk.startsWith(' ') ? '' : ' '}${chunk}`.trim()
                : trimmed
              : existing.text,
            sources: mergedSources,
          };
          return copy;
        }
        return [
          ...prev,
          {
            id: entryId,
            role,
            text: trimmed,
            timestamp,
            sources,
          },
        ];
      });
    },
    []
  );

  const teardownSession = useCallback(async () => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch {
        // Ignore close errors
      }
      wsRef.current = null;
    }

    if (directSessionRef.current) {
      try {
        directSessionRef.current.close();
      } catch {
        // Ignore close errors
      }
      directSessionRef.current = null;
    }

    if (audioEngineRef.current) {
      await audioEngineRef.current.destroy();
      audioEngineRef.current = null;
    }

    activeAssistantEntryIdRef.current = null;
    activeUserEntryIdRef.current = null;
    setIsAiSpeaking(false);
    setPhase('idle');
  }, []);

  const startLiveSession = useCallback(
    async (targetVoice: LiveVoiceName = voiceRef.current) => {
      await teardownSession();
      setErrorText('');
      setPhase('connecting');
      setStatusMessage(`Connecting to ${targetVoice}...`);

      const wsUrl = resolveWebSocketUrl('/api/live-mehfil');
      const apkGeminiKey = !wsUrl ? getBundledApkGeminiKey() : '';

      if (!wsUrl && !apkGeminiKey) {
        setPhase('error');
        setErrorText(
          'Standalone APK Live Voice requires GEMINI_API_KEY (or VITE_API_BASE_URL) in GitHub Repository Secrets → Actions before building the APK.'
        );
        setStatusMessage('APK Live Voice not configured.');
        return;
      }

      const engine = new LiveAudioEngine({
        onMicPcmChunk: (base64Pcm16k) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({ type: 'audio', audio: base64Pcm16k })
            );
          } else if (directSessionRef.current) {
            try {
              directSessionRef.current.sendRealtimeInput({
                audio: {
                  data: base64Pcm16k,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } catch {
              // Ignore closed direct session send
            }
          }
        },
        onPlaybackStateChange: (playing) => {
          setIsAiSpeaking(playing);
          if (phaseRef.current === 'live') {
            setStatusMessage(
              playing
                ? `${voiceRef.current} is speaking...`
                : isMutedRef.current
                ? 'Microphone muted'
                : 'Listening...'
            );
          }
        },
      });
      engine.setMuted(isMutedRef.current);
      audioEngineRef.current = engine;

      // Initialize dedicated 24kHz ring-buffer AudioWorklet playback + 16kHz mic AudioWorklet
      let micReady = false;
      try {
        await engine.startCapture();
        micReady = true;
      } catch (micErr) {
        try {
          await engine.initPlayback();
        } catch (playErr) {
          setPhase('error');
          setErrorText(
            playErr instanceof Error
              ? playErr.message
              : 'AudioWorklet playback could not initialize in this browser.'
          );
          setStatusMessage('Audio engine unavailable.');
          return;
        }
        const msg =
          micErr instanceof Error
            ? micErr.message
            : 'Microphone permission was not granted.';
        setErrorText(
          `${msg.replace(/\.?$/, '.')} Please allow microphone access to talk.`
        );
      }

      // Path B: Direct Standalone Android APK Gemini Live connection (when built with VITE_GEMINI_API_KEY)
      if (!wsUrl && apkGeminiKey) {
        try {
          const { GoogleGenAI, Modality } = await import('@google/genai');
          const ai = new GoogleGenAI({
            apiKey: apkGeminiKey,
            httpOptions: { apiVersion: 'v1beta' },
          });
          const ragInspirations = retrieveRelevantShayari(
            `ghazal ishq sukoon sufi falsafa ${targetVoice}`,
            { limit: 5 }
          );
          const liveInstruction = buildGeminiLiveAdaayegiInstruction(
            targetVoice,
            ragInspirations.couplets
          );

          const modelProfiles: Array<{ model: string; googleSearch: boolean }> = [
            { model: 'gemini-3.8-live', googleSearch: true },
            { model: 'gemini-3.8-live', googleSearch: false },
            { model: 'gemini-2.5-flash-native-audio-preview-12-2025', googleSearch: true },
            { model: 'gemini-2.5-flash-native-audio-preview-12-2025', googleSearch: false },
            { model: 'gemini-2.5-flash-native-audio-preview-09-2025', googleSearch: false },
          ];

          let connectedDirect = false;
          let lastDirectErr: unknown = null;

          for (const profile of modelProfiles) {
            let activeDirect = false;
            let setupSettled = false;
            let resolveSetup!: () => void;
            let rejectSetup!: (reason: Error) => void;
            const setupPromise = new Promise<void>((resolve, reject) => {
              resolveSetup = resolve;
              rejectSetup = reject;
            });
            setupPromise.catch(() => {});

            const setupTimer = window.setTimeout(() => {
              if (!setupSettled) {
                setupSettled = true;
                rejectSetup(new Error(`Timeout connecting to ${profile.model}`));
              }
            }, 5500);

            try {
              const liveConfig: Record<string, unknown> = {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: targetVoice },
                  },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: liveInstruction,
              };
              if (profile.googleSearch) {
                liveConfig.tools = [{ googleSearch: {} }];
              }

              const session = await ai.live.connect({
                model: profile.model,
                config: liveConfig as Parameters<typeof ai.live.connect>[0]['config'],
                callbacks: {
                  onmessage: (message) => {
                    if (message.setupComplete && !setupSettled) {
                      setupSettled = true;
                      window.clearTimeout(setupTimer);
                      resolveSetup();
                    }
                    const content = message.serverContent;
                    if (content?.interrupted) {
                      audioEngineRef.current?.clearPlayback();
                      activeAssistantEntryIdRef.current = null;
                      setStatusMessage('Listening...');
                    }
                    if (content?.inputTranscription?.text) {
                      activeAssistantEntryIdRef.current = null;
                      appendOrUpdateTranscript('user', content.inputTranscription.text);
                    }
                    if (content?.outputTranscription?.text) {
                      activeUserEntryIdRef.current = null;
                      appendOrUpdateTranscript('assistant', content.outputTranscription.text);
                    }
                    const parts = content?.modelTurn?.parts ?? [];
                    for (const part of parts) {
                      if (part.inlineData?.data) {
                        audioEngineRef.current?.enqueuePcm24kBase64(part.inlineData.data);
                      }
                    }
                    const groundingChunks = (
                      content as {
                        groundingMetadata?: {
                          groundingChunks?: Array<{
                            web?: { uri?: string; title?: string };
                          }>;
                        };
                      }
                    )?.groundingMetadata?.groundingChunks;
                    if (Array.isArray(groundingChunks) && groundingChunks.length > 0) {
                      const sources: GroundingSource[] = [];
                      for (const chunk of groundingChunks) {
                        if (chunk?.web?.uri && chunk?.web?.title) {
                          if (!sources.some((s) => s.uri === chunk.web?.uri)) {
                            sources.push({
                              title: chunk.web.title,
                              uri: chunk.web.uri,
                            });
                          }
                        }
                      }
                      if (sources.length > 0) {
                        appendOrUpdateTranscript('assistant', '', sources);
                      }
                    }
                    if (content?.turnComplete) {
                      activeAssistantEntryIdRef.current = null;
                      activeUserEntryIdRef.current = null;
                      if (!audioEngineRef.current?.getIsPlaying()) {
                        setStatusMessage(
                          isMutedRef.current ? 'Microphone muted' : 'Listening...'
                        );
                      }
                    }
                  },
                  onerror: (errEvent) => {
                    const errMsg =
                      errEvent?.message || 'Gemini Live audio stream interrupted.';
                    if (!setupSettled) {
                      setupSettled = true;
                      window.clearTimeout(setupTimer);
                      rejectSetup(new Error(errMsg));
                      return;
                    }
                    if (activeDirect) {
                      setPhase('error');
                      setErrorText(errMsg);
                      setStatusMessage('Live voice session paused.');
                    }
                  },
                  onclose: (closeEvent) => {
                    if (!setupSettled) {
                      setupSettled = true;
                      window.clearTimeout(setupTimer);
                      rejectSetup(
                        new Error(
                          (closeEvent as { reason?: string } | undefined)?.reason ||
                            'Closed before setupComplete'
                        )
                      );
                      return;
                    }
                    if (activeDirect && phaseRef.current === 'live') {
                      setPhase('idle');
                      setStatusMessage('Live session ended.');
                    }
                  },
                },
              });

              await setupPromise;
              activeDirect = true;
              directSessionRef.current = session;
              connectedDirect = true;
              setPhase('live');
              setStatusMessage(
                micReady
                  ? isMutedRef.current
                    ? 'Microphone muted'
                    : 'Listening...'
                  : 'Connected — enable microphone to speak.'
              );
              break;
            } catch (profileErr) {
              window.clearTimeout(setupTimer);
              lastDirectErr = profileErr;
            }
          }

          if (!connectedDirect) {
            await engine.destroy();
            audioEngineRef.current = null;
            setPhase('error');
            setErrorText(
              lastDirectErr instanceof Error
                ? lastDirectErr.message
                : 'Unable to connect directly to Gemini Live from APK.'
            );
            setStatusMessage('Connection failed.');
          }
          return;
        } catch (err) {
          await engine.destroy();
          audioEngineRef.current = null;
          setPhase('error');
          setErrorText(
            err instanceof Error
              ? err.message
              : 'Unable to initialize Gemini Live SDK in APK.'
          );
          setStatusMessage('Connection failed.');
          return;
        }
      }

      // Path A: Web App / Remote Server WebSocket bridge (/api/live-mehfil)
      try {
        const ws = new WebSocket(wsUrl!);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'start',
              voiceName: targetVoice,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data as string) as {
              type?: string;
              data?: string;
              text?: string;
              message?: string;
              sources?: GroundingSource[];
            };

            if (payload.type === 'ready') {
              setPhase('live');
              setStatusMessage(
                micReady
                  ? isMutedRef.current
                    ? 'Microphone muted'
                    : 'Listening...'
                  : 'Connected — enable microphone to speak.'
              );
              return;
            }

            if (payload.type === 'audio' && payload.data) {
              audioEngineRef.current?.enqueuePcm24kBase64(payload.data);
              return;
            }

            if (payload.type === 'interrupted') {
              audioEngineRef.current?.clearPlayback();
              activeAssistantEntryIdRef.current = null;
              setStatusMessage('Listening...');
              return;
            }

            if (payload.type === 'inputTranscript' && payload.text) {
              activeAssistantEntryIdRef.current = null;
              appendOrUpdateTranscript('user', payload.text);
              return;
            }

            if (payload.type === 'outputTranscript' && payload.text) {
              activeUserEntryIdRef.current = null;
              appendOrUpdateTranscript('assistant', payload.text);
              return;
            }

            if (payload.type === 'grounding' && payload.sources?.length) {
              appendOrUpdateTranscript('assistant', '', payload.sources);
              return;
            }

            if (payload.type === 'turnComplete') {
              activeAssistantEntryIdRef.current = null;
              activeUserEntryIdRef.current = null;
              if (!audioEngineRef.current?.getIsPlaying()) {
                setStatusMessage(
                  isMutedRef.current ? 'Microphone muted' : 'Listening...'
                );
              }
              return;
            }

            if (payload.type === 'error') {
              setPhase('error');
              setErrorText(
                payload.message || 'Unable to connect to Gemini Live.'
              );
              setStatusMessage('Live voice session paused.');
              return;
            }

            if (payload.type === 'closed') {
              if (phaseRef.current === 'live') {
                setPhase('idle');
                setStatusMessage('Live session ended.');
              }
            }
          } catch {
            // Ignore malformed socket frames
          }
        };

        ws.onerror = () => {
          setPhase('error');
          setErrorText('Could not reach Gemini Live WebSocket server.');
          setStatusMessage('Connection interrupted.');
        };

        ws.onclose = () => {
          if (phaseRef.current === 'live' || phaseRef.current === 'connecting') {
            setPhase('idle');
            setStatusMessage('Live session ended.');
          }
        };
      } catch (err) {
        await engine.destroy();
        audioEngineRef.current = null;
        setPhase('error');
        setErrorText(
          err instanceof Error
            ? err.message
            : 'Unable to open Gemini Live connection.'
        );
        setStatusMessage('Connection failed.');
      }
    },
    [appendOrUpdateTranscript, teardownSession]
  );

  // Auto-start Live session when modal opens (inside user's click gesture), clean up on close
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      void startLiveSession(voiceRef.current);
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      void teardownSession();
    }
  }, [isOpen, startLiveSession, teardownSession]);

  useEffect(() => {
    return () => {
      void teardownSession();
    };
  }, [teardownSession]);

  const handleVoiceSwitch = (nextVoice: LiveVoiceName) => {
    if (nextVoice === voiceName) return;
    setVoiceName(nextVoice);
    voiceRef.current = nextVoice;
    void startLiveSession(nextVoice);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (phaseRef.current === 'live' && !isAiSpeakingRef.current) {
        setStatusMessage(next ? 'Microphone muted' : 'Listening...');
      }
      return next;
    });
  };

  const handleEndSession = async () => {
    await teardownSession();
    onClose();
  };

  const handleCopyEntry = async (entry: MehfilTranscriptEntry) => {
    const clean = entry.text.replace(/\[\/?VERSE\]/gi, '').trim();
    try {
      await navigator.clipboard.writeText(clean);
    } catch {
      const el = document.createElement('textarea');
      el.value = clean;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveEntry = (entry: MehfilTranscriptEntry) => {
    const clean = entry.text.replace(/\[\/?VERSE\]/gi, '').trim();
    onSaveRecitationToChat(clean, 'ishq');
    setTranscript((prev) =>
      prev.map((item) =>
        item.id === entry.id ? { ...item, saved: true } : item
      )
    );
  };

  // Minimal Gemini-Live breathing gradient wave & orb visualizer reacting gently to amplitude
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const dpr = isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const width = 320;
    const height = 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let smoothAmp = 0.04;
    let t = 0;
    let lastRender = 0;
    const minFrameMs = isHeadless ? 66 : 16;

    const render = (now: number) => {
      rafRef.current = window.requestAnimationFrame(render);
      if (now - lastRender < minFrameMs) return;
      lastRender = now;

      const levels = audioEngineRef.current?.getLevels() || {
        input: 0,
        output: 0,
      };
      const targetAmp = Math.max(levels.output * 1.15, levels.input * 0.9);
      smoothAmp += (targetAmp - smoothAmp) * 0.14;

      if (!prefersReducedMotion) {
        t += 0.018 + smoothAmp * 0.045;
      }

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const breathe = Math.sin(t * 0.9) * 5;
      const orbRadius = 68 + breathe + smoothAmp * 32;

      // Soft Gemini-Live style ambient halo
      const halo = ctx.createRadialGradient(
        cx,
        cy,
        orbRadius * 0.25,
        cx,
        cy,
        orbRadius * 2.0
      );
      const speaking = isAiSpeakingRef.current || levels.output > 0.03;
      halo.addColorStop(
        0,
        speaking ? 'rgba(245, 211, 128, 0.36)' : 'rgba(212, 175, 55, 0.20)'
      );
      halo.addColorStop(
        0.5,
        speaking ? 'rgba(191, 146, 62, 0.12)' : 'rgba(138, 108, 45, 0.07)'
      );
      halo.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, orbRadius * 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Two fluid sine wave rings reacting gently to voice amplitude
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        const rBase = orbRadius + 13 + layer * 17 + smoothAmp * (10 + layer * 8);
        const steps = 72;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const wave =
            Math.sin(angle * (3 + layer) + t * (1.1 + layer * 0.45)) *
            (2 + smoothAmp * 11);
          const r = rBase + wave;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle =
          layer === 0
            ? `rgba(246, 218, 148, ${0.28 + smoothAmp * 0.45})`
            : `rgba(212, 175, 55, ${0.14 + smoothAmp * 0.25})`;
        ctx.lineWidth = layer === 0 ? 1.5 : 1;
        ctx.stroke();
      }

      // Smooth luminous champagne-obsidian gradient orb
      const grad = ctx.createRadialGradient(
        cx - 20,
        cy - 22,
        9,
        cx,
        cy,
        orbRadius
      );
      grad.addColorStop(0, '#FFF5D6');
      grad.addColorStop(0.36, '#E2BE60');
      grad.addColorStop(0.78, '#7A591A');
      grad.addColorStop(1, '#1A140B');

      ctx.beginPath();
      ctx.arc(cx, cy, orbRadius * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, orbRadius * 0.86, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 243, 200, 0.42)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    };

    rafRef.current = window.requestAnimationFrame(render);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeVoiceObj =
    LIVE_VOICE_OPTIONS.find((v) => v.id === voiceName) || LIVE_VOICE_OPTIONS[0];
  const isActive = phase === 'live' || phase === 'connecting';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sukhan AI Live Voice"
      className="fixed inset-0 z-50 bg-[#09090B] text-[#F5EFE6] flex flex-col overflow-hidden"
    >
      {/* Subtle warm radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_46%,_rgba(212,175,55,0.11),_transparent_58%)]"
      />

      {/* Minimal Top Bar */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[#D4AF37]/10 shrink-0">
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-[#F5EFE6] tracking-tight">
            Sukhan Live
          </h2>
          <p className="text-xs text-[#A89E91] truncate">
            {activeVoiceObj.label} · {activeVoiceObj.descriptor}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen((v) => !v)}
            aria-expanded={isDrawerOpen}
            aria-label="Toggle Live Transcript"
            className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              isDrawerOpen
                ? 'bg-[#D4AF37] text-[#09090B] border-[#D4AF37]'
                : 'bg-[#121215]/90 border-[#D4AF37]/20 text-[#E6DDD0] hover:border-[#D4AF37]/45'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span>Transcript ({transcript.length})</span>
          </button>

          <button
            type="button"
            onClick={() => void handleEndSession()}
            aria-label="Close Live Voice"
            className="min-h-[42px] min-w-[42px] rounded-xl bg-[#121215]/90 border border-[#D4AF37]/20 text-[#C8BDB0] hover:text-[#F5EFE6] hover:border-[#D4AF37]/45 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Stage + Optional Transcript Side Drawer */}
      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-between px-4 sm:px-8 pt-4 pb-7 sm:pb-9 min-w-0">
          {/* Sleek Scrollable 8-Voice HD Selector */}
          <div className="w-full max-w-6xl">
            <div
              role="radiogroup"
              aria-label="Select Gemini HD Voice"
              className="flex items-stretch gap-2 overflow-x-auto lg:flex-wrap lg:justify-center lg:overflow-visible pb-2 lg:pb-1 snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:#D4AF3740_transparent]"
            >
              {LIVE_VOICE_OPTIONS.map((v) => {
                const selected = voiceName === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={(e) => {
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'center',
                        block: 'nearest',
                      });
                      handleVoiceSwitch(v.id);
                    }}
                    title={v.bestFor}
                    className={`snap-center shrink-0 min-h-[52px] px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
                      selected
                        ? 'bg-[#D4AF37] text-[#09090B] border-[#D4AF37] shadow-md shadow-[#D4AF37]/20'
                        : 'bg-[#121215]/95 border-[#D4AF37]/20 text-[#F5EFE6] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold leading-tight whitespace-nowrap">
                      {v.label}
                    </span>
                    <span
                      className={`text-[11px] leading-tight whitespace-nowrap mt-0.5 ${
                        selected ? 'text-[#09090B]/80 font-medium' : 'text-[#A89E91]'
                      }`}
                    >
                      {v.descriptor}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#A89E91] text-center mt-1 truncate">
              {activeVoiceObj.bestFor}
            </p>
          </div>

          {/* Center Breathing Gradient Wave & Orb */}
          <div className="flex flex-col items-center text-center space-y-3 my-auto">
            <canvas
              ref={canvasRef}
              data-testid="live-mehfil-orb"
              className="w-[240px] h-[240px] sm:w-[290px] sm:h-[290px]"
            />

            <div className="space-y-2 max-w-md px-2">
              <p
                aria-live="polite"
                className="text-base sm:text-lg font-medium text-[#F5EFE6] tracking-tight"
              >
                {statusMessage}
              </p>

              {errorText && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-950/60 border border-rose-500/40 px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2 text-left"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Minimal Gemini-Live Bottom Control Dock */}
          <div className="flex items-center justify-center gap-4">
            {isActive ? (
              <>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-pressed={isMuted}
                  className={`min-h-[56px] min-w-[56px] px-5 rounded-full border text-sm font-medium inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isMuted
                      ? 'bg-[#F5EFE6] text-[#09090B] border-[#F5EFE6]'
                      : 'bg-[#17171B] border-[#D4AF37]/25 text-[#F5EFE6] hover:border-[#D4AF37]/55'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5 text-[#D4AF37]" />
                  )}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleEndSession()}
                  aria-label="End Live Voice Call"
                  className="min-h-[56px] px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>End</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void startLiveSession(voiceName)}
                className="min-h-[56px] px-8 rounded-full bg-[#D4AF37] hover:bg-[#E5C55B] text-[#09090B] font-semibold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg shadow-[#D4AF37]/20 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <Phone className="w-5 h-5" />
                <span>Reconnect Live</span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Live Transcript Drawer */}
        {isDrawerOpen && (
          <aside
            aria-label="Live Voice Transcript"
            className="fixed inset-x-0 bottom-0 top-16 lg:static lg:inset-auto lg:w-96 z-20 bg-[#121215] border-t lg:border-t-0 lg:border-l border-[#D4AF37]/15 flex flex-col"
          >
            <div className="px-4 py-3.5 border-b border-[#D4AF37]/15 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F5EFE6]">
                  Live Transcript
                </h3>
                <p className="text-[11px] text-[#A89E91]">
                  Copy or save recited Shayari to chat
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close Transcript"
                className="lg:hidden min-h-[40px] min-w-[40px] rounded-lg bg-[#1A1820] text-[#C8BDB0] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcript.length === 0 ? (
                <div className="py-12 text-center space-y-1.5">
                  <p className="font-display text-sm text-[#D4AF37]">
                    Start speaking naturally
                  </p>
                  <p className="text-xs text-[#A89E91]">
                    Your live conversation, recited couplets, and literary references appear here.
                  </p>
                </div>
              ) : (
                transcript.map((entry) => {
                  const det = detectLanguageAndScript(entry.text);
                  const isRtl = det.scriptDirection === 'rtl';
                  const cleanText = entry.text
                    .replace(/\[\/?VERSE\]/gi, '')
                    .trim();
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-xl p-3.5 border space-y-2 ${
                        entry.role === 'assistant'
                          ? 'bg-[#0D0C10] border-[#D4AF37]/20'
                          : 'bg-[#19171E] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#A89E91]">
                        <span className="font-medium text-[#D4AF37]">
                          {entry.role === 'assistant'
                            ? `Sukhan · ${voiceName}`
                            : 'You'}
                        </span>
                        <span className="tabular-nums">{entry.timestamp}</span>
                      </div>

                      {cleanText && (
                        <p
                          dir={isRtl ? 'rtl' : 'ltr'}
                          className={`whitespace-pre-line text-sm leading-relaxed text-[#F5EFE6] ${
                            isRtl
                              ? 'font-urdu text-right text-base leading-loose'
                              : det.detected === 'hindi'
                              ? 'font-hindi'
                              : ''
                          }`}
                        >
                          {cleanText}
                        </p>
                      )}

                      {entry.sources && entry.sources.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          {entry.sources.map((src) => (
                            <a
                              key={src.uri}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}

                      {entry.role === 'assistant' && cleanText && (
                        <div className="pt-1 flex items-center gap-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => void handleCopyEntry(entry)}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#1A1820] hover:bg-[#23202A] text-[11px] text-[#C8BDB0] hover:text-[#F5EFE6] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedId === entry.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {copiedId === entry.id ? 'Copied' : 'Copy'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveEntry(entry)}
                            disabled={entry.saved}
                            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                              entry.saved
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                : 'bg-[#1A1820] hover:bg-[#23202A] text-[#D4AF37]'
                            }`}
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>
                              {entry.saved ? 'Saved to Chat' : 'Save'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
