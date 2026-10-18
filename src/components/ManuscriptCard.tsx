import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Edit3,
  Bookmark,
  Wand2,
  Volume2,
  Square,
  Send,
  BookOpen,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  GeneratedPoem,
  ConversationTurn,
  parseRawPoemText,
} from '../utils/poetryLogic';

interface ManuscriptCardProps {
  poem: GeneratedPoem;
  turns: ConversationTurn[];
  isSaved: boolean;
  isGenerating: boolean;
  onToggleSave: (poem: GeneratedPoem) => void;
  onRegenerate: () => void;
  onUpdatePoem: (updated: GeneratedPoem) => void;
  onRefine: (instruction: string) => void;
  onSelectTurnPoem: (poem: GeneratedPoem) => void;
}

const QUICK_REFINEMENTS = [
  'Add 2 more couplets continuing the same Radif',
  'Deepen classical Persianate imagery (Ghalib style)',
  'Make the diction simpler and more conversational',
  'Transliterate this poem into Urdu Script (اردو)',
  'Transliterate this poem into Roman Urdu',
];

export const ManuscriptCard: React.FC<ManuscriptCardProps> = ({
  poem,
  turns,
  isSaved,
  isGenerating,
  onToggleSave,
  onRegenerate,
  onUpdatePoem,
  onRefine,
  onSelectTurnPoem,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(poem.title);
  const [editBody, setEditBody] = useState(poem.fullText);
  const [showTranslations, setShowTranslations] = useState(true);
  const [refinementInput, setRefinementInput] = useState('');
  const [isReciting, setIsReciting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refineInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditTitle(poem.title);
    setEditBody(poem.fullText);
    setIsEditing(false);
  }, [poem.id, poem.title, poem.fullText]);

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

  const handleCopy = async () => {
    const formatted = `${poem.title}\n\n${poem.fullText}\n\n— Composed on Sukhan AI`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const el = document.createElement('textarea');
      el.value = formatted;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = () => {
    const parsed = parseRawPoemText(editBody);
    const updated: GeneratedPoem = {
      ...poem,
      title: editTitle.trim() || poem.title,
      couplets: parsed.couplets.map((c, idx) => ({
        ...c,
        translation: poem.couplets[idx]?.translation,
        transliteration: poem.couplets[idx]?.transliteration,
      })),
      fullText: parsed.fullText,
    };
    onUpdatePoem(updated);
    setIsEditing(false);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementInput.trim() || isGenerating) return;
    const instruction = refinementInput.trim();
    setRefinementInput('');
    onRefine(instruction);
  };

  const handleRecite = async () => {
    if (isReciting) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsReciting(false);
      return;
    }

    setIsReciting(true);
    try {
      const res = await fetch('/api/poetry/recite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: poem.fullText }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audioRef.current = audio;
          audio.onended = () => setIsReciting(false);
          audio.onerror = () => setIsReciting(false);
          await audio.play();
          return;
        }
      }
    } catch {
      // Fall through to browser speech synthesis
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(poem.fullText);
      utter.rate = 0.88;
      utter.lang =
        poem.language === 'urdu'
          ? 'ur-PK'
          : poem.language === 'hindi'
          ? 'hi-IN'
          : 'hi-IN';
      utter.onend = () => setIsReciting(false);
      utter.onerror = () => setIsReciting(false);
      window.speechSynthesis.speak(utter);
    } else {
      setIsReciting(false);
    }
  };

  const poemTurns = turns.filter((t) => t.role === 'poet' && t.poem);

  return (
    <article
      aria-label="Typeset Poetry Manuscript"
      className="bg-[#130D18] border border-[#D4AF6A]/25 rounded-xl p-6 sm:p-10 diwan-page-shadow relative overflow-hidden space-y-8"
    >
      {/* Top Ornamental Folio Header & Unboxed Metadata */}
      <div className="space-y-4 border-b border-[#D4AF6A]/15 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8E8276]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="uppercase tracking-widest text-[#D4AF6A]">
              {poem.form}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {poem.language === 'urdu'
                ? 'Urdu Script'
                : poem.language === 'hindi'
                ? 'Hindi Devanagari'
                : 'Roman Urdu'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{poem.mood}</span>
            {poem.radifUsed && (
              <>
                <span aria-hidden="true">·</span>
                <span>Radif: &ldquo;{poem.radifUsed}&rdquo;</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {poem.couplets.length} {poem.couplets.length === 1 ? 'Sher' : 'Ash’ar'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTranslations(!showTranslations)}
            className="text-xs text-[#C8BDB0] hover:text-[#D4AF6A] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showTranslations ? 'Hide English Translation' : 'Show English Translation'}
          </button>
        </div>

        {/* Title & Subtitle */}
        <div
          dir={poem.scriptDirection}
          className={poem.scriptDirection === 'rtl' ? 'text-right' : 'text-left'}
        >
          <h2
            className={`font-semibold text-[#F5EFE6] tracking-tight ${
              poem.language === 'urdu'
                ? 'font-urdu text-2xl sm:text-3xl leading-[2.2]'
                : poem.language === 'hindi'
                ? 'font-hindi text-2xl sm:text-3xl'
                : 'font-display text-3xl sm:text-4xl'
            }`}
          >
            {poem.title}
          </h2>
          {poem.subtitle && (
            <p className="text-xs sm:text-sm text-[#C8BDB0] mt-1">
              {poem.subtitle}
            </p>
          )}
        </div>

        {/* Action Bar: Copy, Regenerate, Edit, Refine, Save, Recite */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1B1222] hover:bg-[#D4AF6A]/20 border border-[#D4AF6A]/20 text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#D4AF6A]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#D4AF6A]" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1B1222] hover:bg-[#D4AF6A]/20 border border-[#D4AF6A]/20 text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF6A] ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            aria-pressed={isEditing}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isEditing
                ? 'bg-[#D4AF6A] text-[#0B070E] border-[#D4AF6A]'
                : 'bg-[#1B1222] hover:bg-[#D4AF6A]/20 border-[#D4AF6A]/20 text-[#F5EFE6]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              refineInputRef.current?.focus();
              refineInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1B1222] hover:bg-[#D4AF6A]/20 border border-[#D4AF6A]/20 text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-[#D4AF6A]" />
            <span>Refine</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(poem)}
            aria-pressed={isSaved}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSaved
                ? 'bg-[#D4AF6A]/25 border-[#D4AF6A] text-[#D4AF6A]'
                : 'bg-[#1B1222] hover:bg-[#D4AF6A]/20 border-[#D4AF6A]/20 text-[#F5EFE6]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#D4AF6A] text-[#D4AF6A]' : 'text-[#D4AF6A]'}`} />
            <span>{isSaved ? 'Saved in Diwan' : 'Save to Diwan'}</span>
          </button>

          <button
            type="button"
            onClick={handleRecite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1B1222] hover:bg-[#D4AF6A]/20 border border-[#D4AF6A]/20 text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isReciting ? (
              <>
                <Square className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Recitation</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#D4AF6A]" />
                <span>Recite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Manuscript Editor OR Typeset Verse Canvas */}
      {isEditing ? (
        <div className="space-y-4 bg-[#0B070E] border border-[#D4AF6A]/30 rounded-lg p-5">
          <div>
            <label
              htmlFor="edit-poem-title"
              className="block text-xs font-medium text-[#C8BDB0] mb-1"
            >
              Poem Title
            </label>
            <input
              id="edit-poem-title"
              type="text"
              dir={poem.scriptDirection}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg bg-[#130D18] border border-[#D4AF6A]/25 px-3.5 py-2 text-sm text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="edit-poem-body"
                className="block text-xs font-medium text-[#C8BDB0]"
              >
                Verses (Separate couplets with a blank line)
              </label>
              <button
                type="button"
                onClick={() =>
                  setEditBody((prev) => `${prev.trim()}\n\nNew misra one,\nNew misra two ${poem.radifUsed || ''}`)
                }
                className="inline-flex items-center gap-1 text-xs text-[#D4AF6A] hover:text-[#E5C687] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Couplet</span>
              </button>
            </div>
            <textarea
              id="edit-poem-body"
              rows={10}
              dir={poem.scriptDirection}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className={`w-full rounded-lg bg-[#130D18] border border-[#D4AF6A]/25 p-4 text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A] ${
                poem.language === 'urdu'
                  ? 'font-urdu text-xl leading-[2.4]'
                  : poem.language === 'hindi'
                  ? 'font-hindi text-lg leading-relaxed'
                  : 'font-display text-xl leading-relaxed'
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-medium text-[#C8BDB0] hover:text-[#F5EFE6] cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-2 text-xs font-semibold bg-[#D4AF6A] hover:bg-[#E5C687] text-[#0B070E] rounded-lg transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div
          data-testid="poem-couplets-container"
          className="py-2 space-y-8 max-w-2xl mx-auto"
        >
          {poem.couplets.map((couplet, idx) => (
            <div
              key={couplet.id || idx}
              className="space-y-2.5 pb-6 border-b border-[#D4AF6A]/10 last:border-b-0 last:pb-0"
            >
              {/* Primary Misras with preserved line breaks */}
              <div
                dir={poem.scriptDirection}
                className={`space-y-1.5 ${
                  poem.scriptDirection === 'rtl' ? 'text-right' : 'text-left'
                }`}
              >
                {couplet.lines.map((line, lIdx) => (
                  <p
                    key={lIdx}
                    className={`text-[#F5EFE6] whitespace-pre-wrap ${
                      poem.language === 'urdu'
                        ? 'font-urdu text-xl sm:text-2xl leading-[2.45]'
                        : poem.language === 'hindi'
                        ? 'font-hindi text-lg sm:text-xl leading-[1.95]'
                        : 'font-display text-xl sm:text-[23px] leading-[1.65] tracking-wide'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {/* Interlinear Transliteration & Translation */}
              {showTranslations && (couplet.transliteration || couplet.translation) && (
                <div className="pt-1.5 space-y-1 text-left">
                  {couplet.transliteration && poem.language !== 'roman_urdu' && (
                    <p className="text-xs italic text-[#C8BDB0]/90 font-display whitespace-pre-line">
                      {couplet.transliteration}
                    </p>
                  )}
                  {couplet.translation && (
                    <p className="text-xs sm:text-[13px] text-[#8E8276] leading-relaxed">
                      {couplet.translation}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Poetic Craft Analysis & Farhang Glossary */}
      <div className="pt-4 border-t border-[#D4AF6A]/15 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bahr & Craft Notes */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF6A]">
              Ilm-e-Arooz &amp; Craft Notes
            </h3>
            {poem.bahrNote && (
              <p className="text-xs text-[#F5EFE6] font-medium">
                Meter: {poem.bahrNote}
              </p>
            )}
            {poem.qafiyaUsed && poem.qafiyaUsed.length > 0 && (
              <p className="text-xs text-[#C8BDB0]">
                Qafiya Chain: {poem.qafiyaUsed.join(' · ')}
              </p>
            )}
            {poem.craftCommentary && (
              <p className="text-xs text-[#8E8276] leading-relaxed">
                {poem.craftCommentary}
              </p>
            )}
          </div>

          {/* Glossary */}
          {poem.glossary && poem.glossary.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D4AF6A] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Farhang (Lexicon Notes)</span>
              </h3>
              <dl className="space-y-1.5">
                {poem.glossary.map((item, idx) => (
                  <div key={idx} className="text-xs leading-relaxed">
                    <dt className="inline font-semibold text-[#F5EFE6]">
                      {item.word}
                    </dt>
                    {item.origin && (
                      <span className="text-[#8E8276] mx-1">
                        ({item.origin})
                      </span>
                    )}
                    <span className="text-[#8E8276] mx-1">—</span>
                    <dd className="inline text-[#C8BDB0]">{item.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Web Grounding Sources if used */}
        {poem.groundingSources && poem.groundingSources.length > 0 && (
          <div className="pt-3 border-t border-[#D4AF6A]/10 space-y-1.5">
            <div className="text-xs font-medium text-[#D4AF6A]">
              Cultural &amp; Historical References Grounded via Search:
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#C8BDB0]">
              {poem.groundingSources.map((src, i) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#D4AF6A] underline underline-offset-2"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contextual Follow-up & Iterative Refinement Studio */}
      <div className="pt-5 border-t border-[#D4AF6A]/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="sukhan-refine-input"
            className="text-xs font-semibold text-[#F5EFE6]"
          >
            Continue Refining This Poem (Islah &amp; Follow-up)
          </label>
          <span className="text-[11px] text-[#8E8276]">
            Context preserved across revisions
          </span>
        </div>

        {/* Quick Refinement Prompts */}
        <div className="flex flex-wrap gap-2">
          {QUICK_REFINEMENTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isGenerating}
              onClick={() => onRefine(q)}
              className="px-2.5 py-1 text-xs text-[#C8BDB0] hover:text-[#F5EFE6] bg-[#0B070E] hover:bg-[#D4AF6A]/15 border border-[#D4AF6A]/15 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleRefineSubmit} className="flex gap-2">
          <input
            ref={refineInputRef}
            id="sukhan-refine-input"
            type="text"
            value={refinementInput}
            onChange={(e) => setRefinementInput(e.target.value)}
            placeholder="Ask for changes—e.g. 'Add a maqta with takhallus Asad' or 'Make the second sher about rain'..."
            className="flex-1 rounded-lg bg-[#0B070E] border border-[#D4AF6A]/25 px-3.5 py-2.5 text-xs sm:text-sm text-[#F5EFE6] placeholder-[#8E8276]/65 focus:outline-none focus:border-[#D4AF6A]"
          />
          <button
            type="submit"
            disabled={isGenerating || !refinementInput.trim()}
            className="px-4 py-2.5 rounded-lg bg-[#D4AF6A] hover:bg-[#E5C687] text-[#0B070E] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Refining...' : 'Refine Verse'}</span>
          </button>
        </form>

        {/* Revision History in Current Session */}
        {poemTurns.length > 1 && (
          <div className="pt-2 space-y-2">
            <div className="text-xs text-[#8E8276]">
              Session Revisions ({poemTurns.length} drafts):
            </div>
            <div className="flex flex-wrap gap-2">
              {poemTurns.map((turn, idx) => {
                if (!turn.poem) return null;
                const active = turn.poem.id === poem.id;
                return (
                  <button
                    key={turn.id}
                    type="button"
                    onClick={() => onSelectTurnPoem(turn.poem!)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#D4AF6A]/20 border-[#D4AF6A] text-[#F5EFE6]'
                        : 'bg-[#0B070E] border-[#D4AF6A]/15 text-[#C8BDB0] hover:text-[#F5EFE6]'
                    }`}
                  >
                    <span>Draft {idx + 1}: {turn.poem.title.slice(0, 24)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
