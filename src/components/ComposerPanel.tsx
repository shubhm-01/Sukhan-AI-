import React, { useState } from 'react';
import { apiUrl } from '../lib/api';
import {
  Feather,
  Globe,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  PoetryLanguage,
  PoetryForm,
  PoetryMood,
  PoetryLength,
  WritingStyle,
  detectLanguageAndScript,
} from '../utils/poetryLogic';

interface RadifSuggestion {
  radif: string;
  qafiya: string;
  mood: string;
}

interface ComposerPanelProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  language: PoetryLanguage;
  onChangeLanguage: (lang: PoetryLanguage) => void;
  form: PoetryForm;
  onChangeForm: (form: PoetryForm) => void;
  mood: PoetryMood;
  onChangeMood: (mood: PoetryMood) => void;
  length: PoetryLength;
  onChangeLength: (len: PoetryLength) => void;
  style: WritingStyle;
  onChangeStyle: (style: WritingStyle) => void;
  radif: string;
  onChangeRadif: (val: string) => void;
  qafiya: string;
  onChangeQafiya: (val: string) => void;
  takhallus: string;
  onChangeTakhallus: (val: string) => void;
  useWebResearch: boolean;
  onToggleWebResearch: (val: boolean) => void;
  isGenerating: boolean;
  validationError: string | null;
  onCompose: (e?: React.FormEvent) => void;
  onResetForm: () => void;
}

const LANGUAGE_OPTIONS: { id: PoetryLanguage; label: string }[] = [
  { id: 'auto', label: 'Auto-Detect' },
  { id: 'roman_urdu', label: 'Roman Urdu' },
  { id: 'urdu', label: 'Urdu (اردو)' },
  { id: 'hindi', label: 'Hindi (हिन्दी)' },
];

const FORM_OPTIONS: { id: PoetryForm; label: string; desc: string }[] = [
  { id: 'ghazal', label: 'Ghazal', desc: 'Matla, Qafiya & Radif couplets' },
  { id: 'shayari', label: 'Shayari (Sher)', desc: '2-line couplets' },
  { id: 'nazm', label: 'Nazm', desc: 'Unified thematic verse' },
  { id: 'qita', label: 'Qita', desc: 'Linked 4-line stanzas' },
  { id: 'caption', label: 'Caption', desc: 'Short literary couplet' },
];

const MOOD_OPTIONS: { id: PoetryMood; label: string }[] = [
  { id: 'ishq', label: 'Ishq & Longing' },
  { id: 'hijr', label: 'Hijr (Separation)' },
  { id: 'nostalgia', label: 'Nostalgia (Yaad)' },
  { id: 'tasawwuf', label: 'Sufi Tasawwuf' },
  { id: 'melancholy', label: 'Melancholy (Udaasi)' },
  { id: 'hope', label: 'Hope (Sahar)' },
  { id: 'inkilaab', label: 'Resilience (Azm)' },
];

const STYLE_OPTIONS: { id: WritingStyle; label: string }[] = [
  { id: 'classical', label: 'Classical Ustad (Mir & Ghalib)' },
  { id: 'modern_literary', label: 'Modern Literary (Faraz & Parveen)' },
  { id: 'minimal_contemporary', label: 'Minimal Contemporary' },
  { id: 'sufi_mystic', label: 'Sufi Mystic (Kafi & Qawwali)' },
  { id: 'revolutionary', label: 'Progressive (Faiz Tradition)' },
];

const LENGTH_OPTIONS: { id: PoetryLength; label: string }[] = [
  { id: 'short', label: 'Short (2–3 Ash’ar)' },
  { id: 'medium', label: 'Medium (4–5 Ash’ar)' },
  { id: 'long', label: 'Extended (6–7 Ash’ar)' },
];

const PROMPT_PRESETS = [
  {
    label: 'Roman Urdu · Monsoon Dusk',
    text: 'Shaam-e-firaq mein purane aangan ki barish aur adhoori guftagu',
    lang: 'auto' as PoetryLanguage,
    form: 'ghazal' as PoetryForm,
    radif: 'reh gayi',
  },
  {
    label: 'اردو · چراغ اور ہوا',
    text: 'شام کے سناٹے میں جلتا ہوا مٹی کا چراغ اور تیز ہوا سے گفتگو',
    lang: 'urdu' as PoetryLanguage,
    form: 'ghazal' as PoetryForm,
    radif: 'ہے ابھی',
  },
  {
    label: 'हिन्दी · स्मृति और चाँदनी',
    text: 'रात के सन्नाटे में खिड़की से आती चाँदनी और अनकहे शब्दों की स्मृति',
    lang: 'hindi' as PoetryLanguage,
    form: 'nazm' as PoetryForm,
    radif: 'अभी बाकी है',
  },
];

export const ComposerPanel: React.FC<ComposerPanelProps> = ({
  prompt,
  onChangePrompt,
  language,
  onChangeLanguage,
  form,
  onChangeForm,
  mood,
  onChangeMood,
  length,
  onChangeLength,
  style,
  onChangeStyle,
  radif,
  onChangeRadif,
  qafiya,
  onChangeQafiya,
  takhallus,
  onChangeTakhallus,
  useWebResearch,
  onToggleWebResearch,
  isGenerating,
  validationError,
  onCompose,
  onResetForm,
}) => {
  const [showCraftOptions, setShowCraftOptions] = useState(true);
  const [suggestions, setSuggestions] = useState<RadifSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const detectedInfo = detectLanguageAndScript(`${prompt} ${radif}`);

  const handleSuggestRadif = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(apiUrl('/api/poetry/suggest-radif'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || 'ishq aur shaam',
          language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      }
    } catch {
      // Quietly ignore network error
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <section
      aria-label="Poetry Composition Controls"
      className="bg-[#130D18] border border-[#D4AF6A]/20 rounded-xl p-5 sm:p-7 diwan-page-shadow"
    >
      <form onSubmit={onCompose} className="space-y-6">
        {/* Header & Live Script Detection */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#D4AF6A]/12">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5EFE6] tracking-tight">
              Majlis-e-Sukhan
            </h1>
            <p className="text-xs text-[#8E8276] mt-0.5">
              Urdu, Roman Urdu &amp; Hindi Literary Composition Studio
            </p>
          </div>
          <div className="text-xs text-[#C8BDB0]">
            <span>Script: {detectedInfo.label}</span>
            <span aria-hidden="true" className="mx-1.5 text-[#8E8276]">
              ·
            </span>
            <span className="text-[#D4AF6A]">
              {detectedInfo.scriptDirection === 'rtl' ? 'Right-to-Left' : 'Left-to-Right'}
            </span>
          </div>
        </div>

        {/* Prominent Prompt Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sukhan-prompt-input"
              className="block text-xs font-medium text-[#C8BDB0]"
            >
              Poetic Theme, Couplet Idea, or Emotion (Khayal / Mauzoo)
            </label>
            <button
              type="button"
              onClick={onResetForm}
              className="inline-flex items-center gap-1 text-xs text-[#8E8276] hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Clear composer fields"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <textarea
            id="sukhan-prompt-input"
            rows={4}
            dir={detectedInfo.scriptDirection}
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            placeholder="Write in Urdu (محبت کی شام), Roman Urdu (shaam-e-firaq ki khamoshi), Hindi (चाँदनी रात और यादें), or English..."
            className={`w-full rounded-lg bg-[#0B070E] border px-4 py-3.5 text-sm sm:text-base text-[#F5EFE6] placeholder-[#8E8276]/65 transition-colors focus:outline-none focus:border-[#D4AF6A] ${
              validationError ? 'border-rose-400/70' : 'border-[#D4AF6A]/25'
            } ${
              detectedInfo.detected === 'urdu'
                ? 'font-urdu text-lg'
                : detectedInfo.detected === 'hindi'
                ? 'font-hindi text-base'
                : 'font-sans'
            }`}
          />

          {validationError && (
            <p role="alert" className="text-xs text-rose-300">
              {validationError}
            </p>
          )}

          {/* Quick Starters */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#8E8276]">Try theme:</span>
            {PROMPT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onChangePrompt(preset.text);
                  onChangeLanguage(preset.lang);
                  onChangeForm(preset.form);
                  onChangeRadif(preset.radif);
                }}
                className="px-2.5 py-1 text-xs text-[#C8BDB0] hover:text-[#F5EFE6] bg-[#1B1222] hover:bg-[#D4AF6A]/15 border border-[#D4AF6A]/15 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language & Script Selector */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-[#C8BDB0]">
            Language &amp; Script (Zabaan)
          </span>
          <div
            role="group"
            aria-label="Select Language and Script"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = language === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeLanguage(opt.id)}
                  aria-pressed={active}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#D4AF6A]/20 border-[#D4AF6A] text-[#F5EFE6]'
                      : 'bg-[#0B070E] border-[#D4AF6A]/15 text-[#C8BDB0] hover:text-[#F5EFE6] hover:border-[#D4AF6A]/35'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Poetry Form Selector */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-[#C8BDB0]">
            Poetic Form (Sinf-e-Sukhan)
          </span>
          <div
            role="group"
            aria-label="Select Poetic Form"
            className="grid grid-cols-2 sm:grid-cols-5 gap-2"
          >
            {FORM_OPTIONS.map((item) => {
              const active = form === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeForm(item.id)}
                  aria-pressed={active}
                  title={item.desc}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#D4AF6A]/20 border-[#D4AF6A] text-[#F5EFE6]'
                      : 'bg-[#0B070E] border-[#D4AF6A]/15 text-[#C8BDB0] hover:text-[#F5EFE6] hover:border-[#D4AF6A]/35'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood & Length Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="sukhan-mood-select"
              className="block text-xs font-medium text-[#C8BDB0] mb-1.5"
            >
              Mood &amp; Tone (Kaifiyat)
            </label>
            <select
              id="sukhan-mood-select"
              value={mood}
              onChange={(e) => onChangeMood(e.target.value as PoetryMood)}
              className="w-full rounded-lg bg-[#0B070E] border border-[#D4AF6A]/25 px-3.5 py-2.5 text-xs sm:text-sm text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A]"
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#130D18] text-[#F5EFE6]">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sukhan-length-select"
              className="block text-xs font-medium text-[#C8BDB0] mb-1.5"
            >
              Length (Tawaalat)
            </label>
            <select
              id="sukhan-length-select"
              value={length}
              onChange={(e) => onChangeLength(e.target.value as PoetryLength)}
              className="w-full rounded-lg bg-[#0B070E] border border-[#D4AF6A]/25 px-3.5 py-2.5 text-xs sm:text-sm text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A]"
            >
              {LENGTH_OPTIONS.map((l) => (
                <option key={l.id} value={l.id} className="bg-[#130D18] text-[#F5EFE6]">
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Writing Style / Tradition */}
        <div>
          <label
            htmlFor="sukhan-style-select"
            className="block text-xs font-medium text-[#C8BDB0] mb-1.5"
          >
            Literary Style &amp; Diction (Andaaz-e-Bayaan)
          </label>
          <select
            id="sukhan-style-select"
            value={style}
            onChange={(e) => onChangeStyle(e.target.value as WritingStyle)}
            className="w-full rounded-lg bg-[#0B070E] border border-[#D4AF6A]/25 px-3.5 py-2.5 text-xs sm:text-sm text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A]"
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#130D18] text-[#F5EFE6]">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Poetic Craft Parameters: Radif, Qafiya, Takhallus & Grounding */}
        <div className="pt-2 border-t border-[#D4AF6A]/12 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCraftOptions(!showCraftOptions)}
              aria-expanded={showCraftOptions}
              className="inline-flex items-center gap-2 text-xs font-medium text-[#D4AF6A] hover:text-[#E5C687] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Radif, Qafiya &amp; Cultural Grounding</span>
              {showCraftOptions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleSuggestRadif}
              disabled={loadingSuggestions}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#D4AF6A] bg-[#D4AF6A]/10 hover:bg-[#D4AF6A]/20 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>{loadingSuggestions ? 'Suggesting...' : 'Suggest Radif'}</span>
            </button>
          </div>

          {showCraftOptions && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="sukhan-radif-input"
                    className="block text-xs text-[#C8BDB0] mb-1"
                  >
                    Radif (Refrain Ending)
                  </label>
                  <input
                    id="sukhan-radif-input"
                    type="text"
                    value={radif}
                    onChange={(e) => onChangeRadif(e.target.value)}
                    placeholder="e.g. hai abhi / ہے ابھی"
                    className="w-full rounded-lg bg-[#0B070E] border border-[#D4AF6A]/20 px-3 py-2 text-xs sm:text-sm text-[#F5EFE6] placeholder-[#8E8276]/60 focus:outline-none focus:border-[#D4AF6A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sukhan-qafiya-input"
                    className="block text-xs text-[#C8BDB0] mb-1"
                  >
                    Qafiya (Rhyme Words)
                  </label>
                  <input
                    id="sukhan-qafiya-input"
                    type="text"
                    value={qafiya}
                    onChange={(e) => onChangeQafiya(e.target.value)}
                    placeholder="e.g. safar, asar, sahar"
                    className="w-full rounded-lg bg-[#0B070E] border border-[#D4AF6A]/20 px-3 py-2 text-xs sm:text-sm text-[#F5EFE6] placeholder-[#8E8276]/60 focus:outline-none focus:border-[#D4AF6A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sukhan-takhallus-input"
                    className="block text-xs text-[#C8BDB0] mb-1"
                  >
                    Takhallus (Pen Name)
                  </label>
                  <input
                    id="sukhan-takhallus-input"
                    type="text"
                    value={takhallus}
                    onChange={(e) => onChangeTakhallus(e.target.value)}
                    placeholder="e.g. Sukhan / سخن"
                    className="w-full rounded-lg bg-[#0B070E] border border-[#D4AF6A]/20 px-3 py-2 text-xs sm:text-sm text-[#F5EFE6] placeholder-[#8E8276]/60 focus:outline-none focus:border-[#D4AF6A]"
                  />
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="p-3 rounded-lg bg-[#0B070E] border border-[#D4AF6A]/15 space-y-2">
                  <div className="text-[11px] text-[#8E8276]">
                    Click a suggested Radif &amp; Qafiya pairing to apply:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onChangeRadif(sug.radif);
                          onChangeQafiya(sug.qafiya);
                        }}
                        className="text-left p-2 rounded bg-[#130D18] hover:bg-[#1B1222] border border-[#D4AF6A]/15 transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-medium text-[#D4AF6A]">
                          Radif: &ldquo;{sug.radif}&rdquo;
                        </div>
                        <div className="text-[11px] text-[#C8BDB0] truncate">
                          Qafiya: {sug.qafiya} · {sug.mood}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Web Research Grounding */}
              <div className="flex items-center justify-between pt-1">
                <label
                  htmlFor="sukhan-web-grounding"
                  className="flex items-center gap-2.5 text-xs text-[#C8BDB0] cursor-pointer select-none"
                >
                  <input
                    id="sukhan-web-grounding"
                    type="checkbox"
                    checked={useWebResearch}
                    onChange={(e) => onToggleWebResearch(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D4AF6A]/40 bg-[#0B070E] text-[#D4AF6A] focus:ring-[#D4AF6A]"
                  />
                  <Globe className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  <span>
                    Cultural &amp; Historical Web Grounding (Google Search context for places, poets &amp; history)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit / Generate Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-lg bg-[#D4AF6A] hover:bg-[#E5C687] text-[#0B070E] font-semibold text-sm tracking-wide transition-colors flex items-center justify-center gap-2.5 shadow-lg cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <Feather className="w-4 h-4" />
            <span>
              {isGenerating ? 'Composing in Bahr & Radif...' : 'Compose Verse'}
            </span>
          </button>
        </div>
      </form>
    </section>
  );
};
