import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { gsap } from 'gsap';
import { toggleMessagePlayback, subscribePlayback, PlaybackSnapshot } from '../utils/audioPlayback';
import {
  Copy,
  Check,
  Edit3,
  RefreshCw,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Pause,
  Loader2,
  Bookmark,
  Share2,
  ExternalLink,
  Feather,
} from 'lucide-react';
import {
  ChatMessageItem,
  MessageFeedback,
  segmentMessageContent,
  detectLanguageAndScript,
} from '../utils/poetryLogic';

interface ChatMessageBubbleProps {
  message: ChatMessageItem;
  isStreaming: boolean;
  onEditAndResend: (messageId: string, newContent: string) => void;
  onRegenerate: (messageId: string) => void;
  onContinue: (messageId: string) => void;
  onFeedback: (messageId: string, feedback: MessageFeedback) => void;
  voice: string;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isStreaming,
  onEditAndResend,
  onRegenerate,
  onContinue,
  onFeedback,
  voice,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedBlockIdx, setCopiedBlockIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [playback, setPlayback] = useState<PlaybackSnapshot>({ id: null, status: 'idle' });
  const [recitationError, setRecitationError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setEditValue(message.content);
  }, [message.content]);

  useEffect(() => subscribePlayback(setPlayback), []);

  // Reveal couplet lines with transform-only GSAP motion; never animate for reduced-motion users.
  useEffect(() => {
    if (message.isStreaming) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const lines = articleRef.current?.querySelectorAll<HTMLElement>('[data-poetry-line]');
      if (!lines?.length) return;
      const tween = gsap.fromTo(
        lines,
        { y: 10, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.075, ease: 'power2.out', overwrite: 'auto' }
      );
      return () => tween.kill();
    });
    return () => media.revert();
  }, [message.id, message.isStreaming]);


  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sukhan_saved_verses_v1') || '[]');
      setIsSaved(Array.isArray(saved) && saved.some((item) => item.id === message.id));
    } catch {
      setIsSaved(false);
    }
  }, [message.id]);

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

  const handleReadAloud = () => {
    void toggleMessagePlayback(message.id, message.content, voice);
  };

  const handleSaveVerse = () => {
    try {
      const raw = JSON.parse(localStorage.getItem('sukhan_saved_verses_v1') || '[]');
      const saved = Array.isArray(raw) ? raw : [];
      const alreadySaved = saved.some((item) => item.id === message.id);
      const next = alreadySaved
        ? saved.filter((item) => item.id !== message.id)
        : [{
            id: message.id,
            chatId: message.chatId,
            content: message.content.replace(/\[\/?VERSE\]/gi, '').trim(),
            createdAt: new Date().toISOString(),
          }, ...saved];
      localStorage.setItem('sukhan_saved_verses_v1', JSON.stringify(next.slice(0, 250)));
      setIsSaved(!alreadySaved);
      window.dispatchEvent(new Event('sukhan-saved-verses-changed'));
    } catch {
      setRecitationError('Could not save this poem on this device.');
    }
  };

  const handleShareAsImage = async () => {
    const card = articleRef.current?.querySelector<HTMLElement>('[data-testid="chat-poetry-card"]');
    if (!card) {
      setRecitationError('This reply does not contain a formatted poem card to share yet.');
      return;
    }
    try {
      const dataUrl = await toPng(card, { cacheBust: true, pixelRatio: 2 });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'sukhan-ai-poem.png', { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: 'Sukhan AI Shayari' });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'sukhan-ai-poem.png';
        link.click();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setRecitationError('Could not create the share card. Try again on this device.');
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
      ref={articleRef}
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

        {playback.id === message.id && playback.status === 'error' && <p role="status" className="text-xs text-rose-400">{playback.error}</p>}
        {recitationError && <p role="status" className="text-xs text-rose-400">{recitationError}</p>}

        {/* Structured poem actions: one global speaker state prevents overlapping playback. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
          <button
            type="button"
            onClick={handleReadAloud}
            aria-label={playback.id === message.id && playback.status === 'playing' ? 'Pause recitation' : 'Read poem aloud'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
          >
            {playback.id === message.id && playback.status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playback.id === message.id && playback.status === 'playing' ? <Pause className="h-3.5 w-3.5" /> : playback.id === message.id && playback.status === 'paused' ? <Volume2 className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{playback.id === message.id && playback.status === 'loading' ? 'Preparing voice…' : playback.id === message.id && playback.status === 'playing' ? 'Pause' : playback.id === message.id && playback.status === 'paused' ? 'Resume' : 'Listen'}</span>
            {playback.id === message.id && playback.status === 'playing' && <span className="sukhan-wave ml-1 flex h-3 items-center gap-0.5" aria-hidden="true">{Array.from({length:5},(_,i)=><span key={i} style={{height:`${5+(i%3)*3}px`}} />)}</span>}
          </button>
          <button type="button" onClick={() => copyToClipboard(message.content)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--accent-gold)]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button type="button" onClick={handleSaveVerse} aria-pressed={isSaved} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--accent-gold)]">
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-[var(--accent-gold)] text-[var(--accent-gold)]' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
          <button type="button" onClick={() => void handleShareAsImage()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--accent-gold)]">
            <Share2 className="h-3.5 w-3.5" />
            <span>Share card</span>
          </button>
          <span aria-hidden="true" className="mx-0.5">·</span>
          <button type="button" onClick={() => onRegenerate(message.id)} disabled={isStreaming} aria-label="Regenerate response" className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onContinue(message.id)} disabled={isStreaming} aria-label="Continue response" className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-40"><ArrowRight className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onFeedback(message.id, message.feedback === 'up' ? 'none' : 'up')} aria-label="Helpful response" aria-pressed={message.feedback === 'up'} className={`rounded-lg p-2 transition-colors ${message.feedback === 'up' ? 'text-[var(--accent-gold)]' : 'hover:text-[var(--text-primary)]'}`}><ThumbsUp className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onFeedback(message.id, message.feedback === 'down' ? 'none' : 'down')} aria-label="Unhelpful response" aria-pressed={message.feedback === 'down'} className={`rounded-lg p-2 transition-colors ${message.feedback === 'down' ? 'text-rose-400' : 'hover:text-[var(--text-primary)]'}`}><ThumbsDown className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </article>
  );
};
