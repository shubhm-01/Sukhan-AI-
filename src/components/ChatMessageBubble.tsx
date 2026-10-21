import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Edit3,
  RefreshCw,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Square,
  ExternalLink,
  Feather,
} from 'lucide-react';
import {
  ChatMessageItem,
  MessageFeedback,
  segmentMessageContent,
  detectLanguageAndScript,
} from '../utils/poetryLogic';
import { resolveApiUrl, hasBackendApiAvailable } from '../utils/apiClient';

interface ChatMessageBubbleProps {
  message: ChatMessageItem;
  isStreaming: boolean;
  onEditAndResend: (messageId: string, newContent: string) => void;
  onRegenerate: (messageId: string) => void;
  onContinue: (messageId: string) => void;
  onFeedback: (messageId: string, feedback: MessageFeedback) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isStreaming,
  onEditAndResend,
  onRegenerate,
  onContinue,
  onFeedback,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedBlockIdx, setCopiedBlockIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [isReciting, setIsReciting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setEditValue(message.content);
  }, [message.content]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const copyToClipboard = async (text: string, blockIdx?: number) => {
    const cleanText = text.replace(/\[\/?VERSE\]/gi, '').trim();
    try {
      await navigator.clipboard.writeText(cleanText);
    } catch {
      const el = document.createElement('textarea');
      el.value = cleanText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    if (typeof blockIdx === 'number') {
      setCopiedBlockIdx(blockIdx);
      setTimeout(() => setCopiedBlockIdx(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReciteText = async (textToRecite: string) => {
    const cleanText = textToRecite.replace(/\[\/?VERSE\]/gi, '').trim();
    if (!cleanText) return;

    if (isReciting) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsReciting(false);
      return;
    }

    setIsReciting(true);
    try {
      // Prefer server-generated recitation when a configured backend is available.
      if (hasBackendApiAvailable()) {
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 12000);
          const res = await fetch(resolveApiUrl('/api/poetry/recite'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
            signal: controller.signal,
          }).finally(() => window.clearTimeout(timeoutId));
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const data = await res.json();
            if (typeof data.audioBase64 === 'string' && data.audioBase64.length > 0) {
              const audio = new Audio(
                `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
              );
              audioRef.current = audio;
              audio.onended = () => {
                audioRef.current = null;
                setIsReciting(false);
              };
              audio.onerror = () => {
                audioRef.current = null;
                setIsReciting(false);
              };
              try {
                await audio.play();
                return;
              } catch {
                audioRef.current = null;
              }
            }
          }
        } catch {
          // Network, timeout, or unsupported audio: try device speech synthesis.
        }
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window &&
          typeof SpeechSynthesisUtterance !== 'undefined') {
        const synthesis = window.speechSynthesis;
        synthesis.cancel();
        const det = detectLanguageAndScript(cleanText);
        const hasUrduScript = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleanText);
        const hasHindiScript = /[\u0900-\u097F]/.test(cleanText);
        const isRomanUrdu = det.detected === 'roman_urdu' && det.confidence === 'high';
        const lang = hasUrduScript || isRomanUrdu ? 'ur-PK' : hasHindiScript ? 'hi-IN' : 'en-US';
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.rate = 0.9;
        utter.lang = lang;
        const voices = synthesis.getVoices();
        const languagePrefix = lang.toLowerCase().split('-')[0];
        const matchingVoice = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase()) ||
          voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
        if (matchingVoice) utter.voice = matchingVoice;
        utter.onend = () => setIsReciting(false);
        utter.onerror = () => setIsReciting(false);
        synthesis.speak(utter);
        // Some WebViews fail silently when the speech service has no voice available.
        window.setTimeout(() => {
          if (synthesis.speaking || synthesis.pending) return;
          setIsReciting(false);
        }, 1500);
      } else {
        setIsReciting(false);
      }
    } catch {
      setIsReciting(false);
    }
  };

  const handleCommitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setIsEditing(false);
    onEditAndResend(message.id, trimmed);
  };

  if (message.role === 'user') {
    const userDet = detectLanguageAndScript(message.content);
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl w-full sm:w-auto space-y-1.5">
          {isEditing ? (
            <form
              onSubmit={handleCommitEdit}
              className="bg-[var(--bg-surface)] border border-[var(--accent-gold)] rounded-xl p-3.5 space-y-3 min-w-[280px] sm:min-w-[420px]"
            >
              <textarea
                rows={3}
                aria-label="Edit your message"
                dir={userDet.scriptDirection}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(message.content);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStreaming || !editValue.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[var(--accent-fg)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save &amp; Resend
                </button>
              </div>
            </form>
          ) : (
            <div className="group space-y-1">
              <div
                dir={userDet.scriptDirection}
                className={`rounded-2xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] ${
                  userDet.detected === 'urdu'
                    ? 'font-urdu text-lg text-right leading-[2.3]'
                    : userDet.detected === 'hindi'
                    ? 'font-hindi text-base'
                    : 'text-sm sm:text-[15px] leading-relaxed'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              <div className="flex items-center justify-end gap-2 px-1">
                <button
                  type="button"
                  onClick={() => copyToClipboard(message.content)}
                  aria-label="Copy prompt"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[var(--accent-gold)]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={isStreaming}
                  aria-label="Edit and resend message"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant Message
  const segments = segmentMessageContent(message.content);

  const renderFormattedInline = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*|\*[^*]+?\*|`[^`]+?`)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[var(--text-primary)]">
            {p.slice(2, -2)}
          </strong>
        );
      }
      if (p.startsWith('*') && p.endsWith('*')) {
        return (
          <em key={i} className="italic text-[var(--text-secondary)]">
            {p.slice(1, -1)}
          </em>
        );
      }
      if (p.startsWith('`') && p.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs text-[var(--accent-gold)]"
          >
            {p.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={i}>{p}</React.Fragment>;
    });
  };

  return (
    <article
      aria-label="Sukhan AI Response"
      className="flex items-start gap-3 sm:gap-4"
    >
      {/* Poet Emblem */}
      <div
        aria-hidden="true"
        className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center shrink-0 mt-0.5"
      >
        <Feather className="w-4 h-4 text-[var(--accent-gold)]" />
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        {/* Content Segments (Prose + Typeset Diwan Poetry Cards) */}
        <div className="space-y-4">
          {segments.map((seg, idx) => {
            if (seg.type === 'poetry') {
              return (
                <div
                  key={idx}
                  data-testid="chat-poetry-card"
                  className="rounded-xl bg-[var(--bg-verse)] border border-[var(--border-strong)] p-5 sm:p-7 space-y-4 diwan-page-shadow"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)] pb-2 border-b border-[var(--border-subtle)]">
                    <span className="uppercase tracking-widest text-[var(--accent-gold)] font-medium">
                      {seg.detectedLang === 'urdu'
                        ? 'Urdu Verse · کلام'
                        : seg.detectedLang === 'hindi'
                        ? 'Hindi Kavita · काव्य'
                        : 'Sukhan Verse · شعر'}
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(seg.text, idx)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
                      >
                        {copiedBlockIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--accent-gold)]" />
                            <span>Copied Verse</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Verse</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReciteText(seg.text)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Recite</span>
                      </button>
                    </div>
                  </div>

                  <div
                    dir={seg.scriptDirection}
                    className={`space-y-1.5 ${
                      seg.scriptDirection === 'rtl' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {seg.text.split('\n').map((line, lIdx) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) {
                        return <div key={lIdx} className="h-3" />;
                      }
                      return (
                        <p
                          key={lIdx}
                          className={`text-[var(--text-primary)] ${
                            seg.detectedLang === 'urdu'
                              ? 'font-urdu text-xl sm:text-2xl leading-[2.4]'
                              : seg.detectedLang === 'hindi'
                              ? 'font-hindi text-lg sm:text-xl leading-[1.95]'
                              : 'font-display text-xl sm:text-[23px] leading-[1.6] tracking-wide'
                          }`}
                        >
                          {trimmedLine}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Prose block
            return (
              <div
                key={idx}
                dir={seg.scriptDirection}
                className={`space-y-1.5 text-sm sm:text-[15px] leading-relaxed text-[var(--text-primary)] ${
                  seg.scriptDirection === 'rtl'
                    ? 'font-urdu text-lg text-right leading-[2.25]'
                    : ''
                }`}
              >
                {seg.lines.map((line, lIdx) => {
                  if (/^#{1,3}\s+/.test(line)) {
                    return (
                      <h3
                        key={lIdx}
                        className="font-display text-xl font-semibold text-[var(--text-primary)] pt-1"
                      >
                        {renderFormattedInline(line.replace(/^#{1,3}\s+/, ''))}
                      </h3>
                    );
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-1 text-[var(--text-secondary)]">
                        <span className="text-[var(--accent-gold)] mt-0.5">•</span>
                        <span>{renderFormattedInline(line.slice(2))}</span>
                      </div>
                    );
                  }
                  const numMatch = line.match(/^(\d+)\.\s+(.*)/);
                  if (numMatch) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-1 text-[var(--text-secondary)]">
                        <span className="text-[var(--accent-gold)] font-semibold shrink-0">
                          {numMatch[1]}.
                        </span>
                        <span>{renderFormattedInline(numMatch[2])}</span>
                      </div>
                    );
                  }
                  return (
                    <p key={lIdx} className="text-[var(--text-secondary)]">
                      {renderFormattedInline(line)}
                    </p>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Grounding Citations if present */}
        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="text-[var(--accent-gold)] font-medium">Sources:</span>
            {message.groundingSources.map((src, i) => (
              <a
                key={i}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-[var(--accent-gold)] underline underline-offset-2"
              >
                <span>{src.title}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}

        {/* Message Actions Bar: Copy, Regenerate, Continue, Recite, Feedback */}
        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => copyToClipboard(message.content)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onRegenerate(message.id)}
            disabled={isStreaming}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            onClick={() => onContinue(message.id)}
            disabled={isStreaming}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Continue</span>
          </button>

          <button
            type="button"
            onClick={() => handleReciteText(message.content)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {isReciting ? (
              <>
                <Square className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen</span>
              </>
            )}
          </button>

          <span aria-hidden="true" className="mx-0.5">·</span>

          <button
            type="button"
            onClick={() =>
              onFeedback(
                message.id,
                message.feedback === 'up' ? 'none' : 'up'
              )
            }
            aria-label="Helpful response"
            aria-pressed={message.feedback === 'up'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              message.feedback === 'up'
                ? 'text-[var(--accent-gold)] bg-[var(--bg-surface)]'
                : 'hover:text-[var(--text-primary)]'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() =>
              onFeedback(
                message.id,
                message.feedback === 'down' ? 'none' : 'down'
              )
            }
            aria-label="Unhelpful response"
            aria-pressed={message.feedback === 'down'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              message.feedback === 'down'
                ? 'text-rose-400 bg-[var(--bg-surface)]'
                : 'hover:text-[var(--text-primary)]'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
