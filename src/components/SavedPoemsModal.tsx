import React, { useCallback, useEffect, useState } from 'react';
import { BookMarked, Check, Copy, Trash2, X } from 'lucide-react';

interface SavedPoem {
  id: string;
  chatId?: string;
  content: string;
  createdAt: string;
}

interface SavedPoemsModalProps {
  onClose: () => void;
}

function readSavedPoems(): SavedPoem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('sukhan_saved_verses_v1') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedPoem =>
      Boolean(item && typeof item.id === 'string' && typeof item.content === 'string')
    );
  } catch {
    return [];
  }
}

export const SavedPoemsModal: React.FC<SavedPoemsModalProps> = ({ onClose }) => {
  const [poems, setPoems] = useState<SavedPoem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(() => setPoems(readSavedPoems()), []);

  useEffect(() => {
    reload();
    window.addEventListener('sukhan-saved-verses-changed', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('sukhan-saved-verses-changed', reload);
      window.removeEventListener('storage', reload);
    };
  }, [reload]);

  const removePoem = (id: string) => {
    const next = poems.filter((poem) => poem.id !== id);
    setPoems(next);
    try {
      localStorage.setItem('sukhan_saved_verses_v1', JSON.stringify(next));
      const deleted = JSON.parse(localStorage.getItem('sukhan_saved_verse_deletions_v1') || '[]');
      const pending = Array.isArray(deleted) ? deleted.filter((value): value is string => typeof value === 'string') : [];
      if (!pending.includes(id)) pending.push(id);
      localStorage.setItem('sukhan_saved_verse_deletions_v1', JSON.stringify(pending));
      window.dispatchEvent(new Event('sukhan-saved-verses-changed'));
    } catch {
      // Keep the modal usable even if device storage is full.
    }
  };

  const copyPoem = async (poem: SavedPoem) => {
    try {
      await navigator.clipboard.writeText(poem.content);
    } catch {
      const field = document.createElement('textarea');
      field.value = poem.content;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopiedId(poem.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-poems-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]">
              <BookMarked className="h-5 w-5 text-[var(--accent-gold)]" />
            </span>
            <div className="text-left">
              <h2 id="saved-poems-title" className="font-display text-2xl font-semibold text-[var(--text-primary)]">Saved Shayari &amp; Poems</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Your personal collection on this device</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close saved poems" className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
          {poems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <BookMarked className="h-8 w-8 text-[var(--accent-gold)]/60" />
              <p className="font-display text-2xl text-[var(--text-primary)]">Your Bayaz is waiting</p>
              <p className="max-w-sm text-xs leading-5 text-[var(--text-muted)]">Tap Save under any Sukhan AI response to keep its verses here.</p>
            </div>
          ) : (
            poems.map((poem, index) => (
              <article key={poem.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-verse)] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-gold)]">Folio {String(index + 1).padStart(2, '0')}</span>
                  <time className="text-[10px] text-[var(--text-muted)]">{poem.createdAt ? new Date(poem.createdAt).toLocaleDateString() : ''}</time>
                </div>
                <p dir="auto" className="whitespace-pre-wrap text-sm leading-8 text-[var(--text-primary)] sm:text-base">{poem.content}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                  <button type="button" onClick={() => void copyPoem(poem)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-gold)]">
                    {copiedId === poem.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === poem.id ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={() => removePoem(poem.id)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
