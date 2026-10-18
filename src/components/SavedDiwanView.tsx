import React, { useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Trash2,
  Download,
  ArrowUpRight,
  BookMarked,
} from 'lucide-react';
import { GeneratedPoem, PoetryForm, ResolvedLanguage } from '../utils/poetryLogic';

interface SavedDiwanViewProps {
  savedPoems: GeneratedPoem[];
  onRemoveSaved: (poemId: string) => void;
  onOpenInStudio: (poem: GeneratedPoem) => void;
}

export const SavedDiwanView: React.FC<SavedDiwanViewProps> = ({
  savedPoems,
  onRemoveSaved,
  onOpenInStudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<'all' | ResolvedLanguage>('all');
  const [filterForm, setFilterForm] = useState<'all' | PoetryForm>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = savedPoems.filter((p) => {
    const matchesLang = filterLang === 'all' || p.language === filterLang;
    const matchesForm = filterForm === 'all' || p.form === filterForm;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.fullText.toLowerCase().includes(q) ||
      (p.radifUsed && p.radifUsed.toLowerCase().includes(q));
    return matchesLang && matchesForm && matchesSearch;
  });

  const handleCopy = async (poem: GeneratedPoem) => {
    const text = `${poem.title}\n\n${poem.fullText}\n\n— Sukhan AI Diwan`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    setCopiedId(poem.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadFolio = (poem: GeneratedPoem) => {
    const content = [
      `========================================`,
      `  ${poem.title}`,
      `  ${poem.subtitle || ''}`,
      `  Form: ${poem.form.toUpperCase()} · Language: ${poem.language} · Mood: ${poem.mood}`,
      poem.radifUsed ? `  Radif: "${poem.radifUsed}"` : '',
      `========================================\n`,
      poem.fullText,
      `\n----------------------------------------`,
      poem.bahrNote ? `Meter: ${poem.bahrNote}` : '',
      poem.craftCommentary ? `Notes: ${poem.craftCommentary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${poem.title.replace(/\s+/g, '-').toLowerCase()}-diwan.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Saved Diwan Anthology" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#D4AF6A]/15">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#D4AF6A]">
            Personal Anthology
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F5EFE6] mt-1">
            Bayaz &amp; Saved Diwan
          </h1>
          <p className="text-sm text-[#C8BDB0] mt-1 max-w-xl">
            Your curated notebook of preserved ghazals, nazms, and couplets. Re-open any manuscript in the Studio to continue refining its verses.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8E8276] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search saved poems"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verse, title, or radif..."
              className="pl-8 pr-3.5 py-2 text-xs rounded-lg bg-[#130D18] border border-[#D4AF6A]/20 text-[#F5EFE6] placeholder-[#8E8276] focus:outline-none focus:border-[#D4AF6A]"
            />
          </div>

          <select
            aria-label="Filter by language"
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-lg bg-[#130D18] border border-[#D4AF6A]/20 text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A]"
          >
            <option value="all">All Scripts</option>
            <option value="roman_urdu">Roman Urdu</option>
            <option value="urdu">Urdu (اردو)</option>
            <option value="hindi">Hindi (हिन्दी)</option>
          </select>

          <select
            aria-label="Filter by form"
            value={filterForm}
            onChange={(e) => setFilterForm(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-lg bg-[#130D18] border border-[#D4AF6A]/20 text-[#F5EFE6] focus:outline-none focus:border-[#D4AF6A]"
          >
            <option value="all">All Forms</option>
            <option value="ghazal">Ghazal</option>
            <option value="shayari">Shayari</option>
            <option value="nazm">Nazm</option>
            <option value="qita">Qita</option>
            <option value="caption">Caption</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#130D18] border border-[#D4AF6A]/15 rounded-xl p-12 text-center space-y-3">
          <BookMarked className="w-8 h-8 text-[#D4AF6A]/60 mx-auto" />
          <h2 className="font-display text-2xl text-[#F5EFE6]">
            No Manuscripts Found in Your Bayaz
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8276] max-w-md mx-auto">
            Save any generated ghazal, nazm, or couplet from the Studio to build your personal literary collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((poem) => (
            <article
              key={poem.id}
              className="bg-[#130D18] border border-[#D4AF6A]/20 rounded-xl p-6 flex flex-col justify-between space-y-6 diwan-page-shadow"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[#8E8276]">
                  <div>
                    <span className="uppercase tracking-wider text-[#D4AF6A]">
                      {poem.form}
                    </span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span>
                      {poem.language === 'urdu'
                        ? 'Urdu'
                        : poem.language === 'hindi'
                        ? 'Hindi'
                        : 'Roman Urdu'}
                    </span>
                    {poem.radifUsed && (
                      <>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        <span>Radif: &ldquo;{poem.radifUsed}&rdquo;</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono-tabular">
                    {poem.couplets.length} Ash’ar
                  </span>
                </div>

                <h2
                  dir={poem.scriptDirection}
                  className={`font-semibold text-[#F5EFE6] ${
                    poem.language === 'urdu'
                      ? 'font-urdu text-xl text-right'
                      : poem.language === 'hindi'
                      ? 'font-hindi text-xl'
                      : 'font-display text-2xl'
                  }`}
                >
                  {poem.title}
                </h2>

                <div
                  dir={poem.scriptDirection}
                  className={`space-y-3 pt-2 border-t border-[#D4AF6A]/10 ${
                    poem.scriptDirection === 'rtl' ? 'text-right' : 'text-left'
                  }`}
                >
                  {poem.couplets.slice(0, 3).map((c, idx) => (
                    <div key={idx} className="space-y-1">
                      {c.lines.map((line, lIdx) => (
                        <p
                          key={lIdx}
                          className={`text-[#F5EFE6]/95 ${
                            poem.language === 'urdu'
                              ? 'font-urdu text-lg leading-[2.3]'
                              : poem.language === 'hindi'
                              ? 'font-hindi text-base leading-relaxed'
                              : 'font-display text-lg leading-relaxed'
                          }`}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#D4AF6A]/12 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenInStudio(poem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#D4AF6A] hover:bg-[#E5C687] text-[#0B070E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Open &amp; Refine</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(poem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B1222] hover:bg-[#D4AF6A]/20 border border-[#D4AF6A]/20 text-[#F5EFE6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedId === poem.id ? (
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
                    onClick={() => handleDownloadFolio(poem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B1222] hover:bg-[#D4AF6A]/20 border border-[#D4AF6A]/20 text-[#F5EFE6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    aria-label={`Download ${poem.title}`}
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF6A]" />
                    <span>Export</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveSaved(poem.id)}
                  aria-label={`Remove ${poem.title} from Saved Diwan`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#8E8276] hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
