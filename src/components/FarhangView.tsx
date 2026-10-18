import React, { useState } from 'react';
import { Feather, BookOpen } from 'lucide-react';
import { FARHANG_LEXICON, LexiconEntry } from '../utils/poetryLogic';

interface FarhangViewProps {
  onApplyLexiconTerm: (entry: LexiconEntry) => void;
}

const CATEGORIES = ['All', 'Emotion', 'Nature', 'Mysticism', 'Classical'] as const;

export const FarhangView: React.FC<FarhangViewProps> = ({ onApplyLexiconTerm }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filtered =
    selectedCategory === 'All'
      ? FARHANG_LEXICON
      : FARHANG_LEXICON.filter((item) => item.category === selectedCategory);

  return (
    <section aria-label="Farhang Lexicon and Poetic Craft" className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#D4AF6A]/15">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#D4AF6A]">
            Classical Diction &amp; Ilm-e-Arooz
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F5EFE6] mt-1">
            Farhang-e-Sukhan &amp; Craft Guide
          </h1>
          <p className="text-sm text-[#C8BDB0] mt-1 max-w-2xl">
            Explore classical Urdu and Hindustani poetic vocabulary, metaphors, and structural principles. Click any expression to weave it directly into your next composition.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="group"
          aria-label="Filter Lexicon by Category"
          className="flex flex-wrap items-center gap-1.5 bg-[#130D18] p-1.5 rounded-lg border border-[#D4AF6A]/20"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#D4AF6A] text-[#0B070E]'
                    : 'text-[#C8BDB0] hover:text-[#F5EFE6]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lexicon Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map((entry) => (
          <article
            key={entry.word}
            className="bg-[#130D18] border border-[#D4AF6A]/20 rounded-xl p-5 flex flex-col justify-between space-y-5 diwan-page-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8E8276]">
                <span>{entry.category}</span>
                <span aria-hidden="true">·</span>
                <span>Radif: &ldquo;{entry.sampleRadif}&rdquo;</span>
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold text-[#F5EFE6]">
                  {entry.word}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-[#D4AF6A]">
                  <span className="font-urdu">{entry.urduScript}</span>
                  <span aria-hidden="true" className="text-[#8E8276]">·</span>
                  <span className="font-hindi text-xs">{entry.hindiScript}</span>
                </div>
              </div>

              <p className="text-xs text-[#F5EFE6]/90 leading-relaxed">
                {entry.meaning}
              </p>
              <p className="text-xs text-[#8E8276] leading-relaxed">
                {entry.usageNote}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onApplyLexiconTerm(entry)}
              className="w-full py-2 px-3 rounded-lg bg-[#1B1222] hover:bg-[#D4AF6A] text-[#F5EFE6] hover:text-[#0B070E] border border-[#D4AF6A]/25 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Compose with &ldquo;{entry.word}&rdquo;</span>
            </button>
          </article>
        ))}
      </div>

      {/* Structural Guide to Ghazal Architecture */}
      <div className="bg-[#130D18] border border-[#D4AF6A]/20 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-[#D4AF6A]">
          <BookOpen className="w-4 h-4" />
          <h2 className="font-display text-2xl font-semibold text-[#F5EFE6]">
            The Architecture of a Classical Ghazal
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-[#D4AF6A]/12">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#D4AF6A]">
              01. Matla (مطلع)
            </h3>
            <p className="text-xs text-[#C8BDB0] leading-relaxed">
              The opening couplet where both lines (Misra-e-Oola and Misra-e-Sani) end with the rhyming Qafiya and identical Radif refrain.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#D4AF6A]">
              02. Radif (ردیف)
            </h3>
            <p className="text-xs text-[#C8BDB0] leading-relaxed">
              The exact repeating word or phrase at the end of the second line of every couplet (e.g., &ldquo;hai abhi&rdquo; or &ldquo;reh gayi&rdquo;), acting as the emotional anchor.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#D4AF6A]">
              03. Qafiya (قافیہ)
            </h3>
            <p className="text-xs text-[#C8BDB0] leading-relaxed">
              The rhyming words that immediately precede the Radif (e.g., safar, asar, sahar, nazar), giving the ghazal its musical symmetry.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#D4AF6A]">
              04. Maqta &amp; Takhallus (مقطع)
            </h3>
            <p className="text-xs text-[#C8BDB0] leading-relaxed">
              The concluding couplet in which the poet weaves their pen-name (Takhallus) into the verse as a personal signature.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
