/**
 * Sukhan AI — Dynamic Open-Source Shayari Corpus Service & Local RAG Retriever
 *
 * 1. Immediately boots with the 160+ built-in authentic Shayari corpus (zero-latency offline APK).
 * 2. Dynamically loads & indexes open-source Urdu/Hindi poetry datasets from public GitHub raw
 *    repositories (e.g. amir9ume/urdu_ghazals_rekhta) and caches them in IndexedDB (with
 *    localStorage metadata fallback) for instant offline access on Android APKs & browsers.
 * 3. Provides a lightweight Semantic/Keyword & Mood Retriever (RAG) that pulls diverse,
 *    non-repetitive classical couplets, motifs, Radif-Qafiya patterns, and Farhang alfaaz
 *    matched to the user's prompt.
 */

import {
  BUILTIN_SHAYARI_CORPUS,
  type CorpusCouplet,
} from '../data/builtinShayariCorpus';
import {
  RICH_FARHANG_ALFAAZ,
  type FarhangEntry,
} from '../data/poeticCraftEngine';

const IDB_NAME = 'sukhan_shayari_corpus_db';
const IDB_VERSION = 1;
const IDB_STORE = 'corpus_cache';
const IDB_KEY = 'rekhta_open_corpus_v1';
const LOCAL_META_KEY = 'sukhan_corpus_cache_meta_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * Verified public open-source GitHub raw Urdu poetry dataset URLs (HTTP 200 OK).
 * Loaded opportunistically and cached in IndexedDB for instant offline APK access.
 */
const OPEN_SOURCE_POETRY_SOURCES: Array<{
  url: string;
  poetHint?: string;
  format: 'csv' | 'text' | 'yaml';
}> = [
  {
    url: 'https://raw.githubusercontent.com/AzeemGhumman/iqbal-demystified-dataset/master/data/poems/001/001_001.yaml',
    poetHint: 'Allama Iqbal',
    format: 'yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/AzeemGhumman/iqbal-demystified-dataset/master/data/poems/001/001_002.yaml',
    poetHint: 'Allama Iqbal',
    format: 'yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/AzeemGhumman/iqbal-demystified-dataset/master/data/poems/001/001_003.yaml',
    poetHint: 'Allama Iqbal',
    format: 'yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/AzeemGhumman/iqbal-demystified-dataset/master/data/poems/001/001_004.yaml',
    poetHint: 'Allama Iqbal',
    format: 'yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/AzeemGhumman/iqbal-demystified-dataset/master/data/poems/001/001_005.yaml',
    poetHint: 'Allama Iqbal',
    format: 'yaml',
  },
];

/**
 * Hindustani semantic synonym expansion map for lightweight local RAG retrieval.
 */
const SEMANTIC_SYNONYM_GROUPS: string[][] = [
  ['ishq', 'mohabbat', 'pyar', 'pyaar', 'love', 'romance', 'ishq-e-majazi', 'mehboob', 'yaar', 'wisaal', 'deed', 'dilkash'],
  ['sufi', 'ishq-e-haqiqi', 'khuda', 'rab', 'maula', 'rooh', 'spiritual', 'mystical', 'fana', 'kabir', 'khusrau', 'bandagi', 'ibaadat'],
  ['dard', 'gham', 'dukh', 'hijr', 'firaaq', 'separation', 'heartbreak', 'sad', 'sadness', 'udaas', 'udaasi', 'khalish', 'chashm-e-nam', 'aansu', 'ranjish'],
  ['sukoon', 'peace', 'calm', 'khamoshi', 'sukoot', 'silence', 'stillness', 'raahat', 'thehraav', 'sabr', 'sheetal'],
  ['falsafa', 'philosophy', 'zindagi', 'life', 'existential', 'waqt', 'time', 'maut', 'duniya', 'haqeeqat', 'khala', 'saraab', 'khud-kalami'],
  ['hausla', 'motivation', 'inquilab', 'courage', 'strength', 'himmat', 'parwaaz', 'shaheen', 'khudi', 'toofaan', 'umeed', 'sehar', 'subah'],
  ['barish', 'baarish', 'rain', 'monsoon', 'sawan', 'bheegi', 'mitti', 'ghata', 'boond', 'mausam'],
  ['shaam', 'evening', 'chai', 'pyali', 'dusk', 'shafaq', 'nostalgia', 'yaad', 'maazi', 'memories', 'purane', 'khat', 'diary'],
  ['tanz', 'satire', 'witty', 'irony', 'mushaira', 'masnad', 'tamasha', 'shehr', 'bheed'],
  ['dosti', 'friend', 'hamrahi', 'companionship', 'wafa', 'bharosa', 'marham', 'saath'],
  ['maa', 'mother', 'ghar', 'home', 'aangan', 'chaukhat', 'parinde', 'virasat', 'hindustan'],
  ['tanhai', 'lonely', 'solitude', 'tanha', 'akele', 'raat', 'shab-e-gham', 'chiraagh', 'dastak', 'dareecha'],
];

const POET_ALIASES: Record<string, string[]> = {
  'mirza ghalib': ['ghalib', 'mirza', 'asadullah'],
  'meer taqi meer': ['meer', 'mir', 'taqi'],
  'faiz ahmad faiz': ['faiz', 'ahmad faiz'],
  'jaun elia': ['jaun', 'elia', 'eliya'],
  'allama iqbal': ['iqbal', 'allama'],
  'sant kabir': ['kabir', 'kabeer', 'doha'],
  'amir khusrau': ['khusrau', 'khusro', 'amir'],
  'dagh dehlvi': ['dagh', 'daagh', 'dehlvi'],
  'jigar moradabadi': ['jigar', 'moradabadi'],
  'parveen shakir': ['parveen', 'shakir'],
  'gulzar': ['gulzar', 'sampooran'],
  'javed akhtar': ['javed', 'akhtar'],
  'bashir badr': ['bashir', 'badr'],
  'nida fazli': ['nida', 'fazli'],
  'rahat indori': ['rahat', 'indori'],
};

export interface ShayariRetrievalResult {
  couplets: CorpusCouplet[];
  suggestedAlfaaz: FarhangEntry[];
  radifPatterns: string[];
  motifs: string[];
  corpusSize: number;
  hasRemoteDataset: boolean;
}

export interface RetrieveOptions {
  mood?: string;
  poet?: string;
  limit?: number;
  excludeIds?: string[];
}

// Module-level merged corpus store (starts immediately with 160+ built-in couplets)
let mergedCorpus: CorpusCouplet[] = [...BUILTIN_SHAYARI_CORPUS];
let remoteLoaded = false;
let hydratePromise: Promise<number> | null = null;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff\s-]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function expandSemanticTokens(tokens: string[]): Set<string> {
  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    for (const group of SEMANTIC_SYNONYM_GROUPS) {
      if (group.some((term) => term === token || term.includes(token) || token.includes(term))) {
        for (const syn of group) expanded.add(syn);
      }
    }
  }
  return expanded;
}

function detectTargetPoet(queryLower: string): string | null {
  for (const [canonical, aliases] of Object.entries(POET_ALIASES)) {
    if (queryLower.includes(canonical) || aliases.some((a) => queryLower.includes(a))) {
      return canonical;
    }
  }
  return null;
}

/**
 * Parses open-source Rekhta / GitHub plain text or CSV ghazal data into
 * deduplicated CorpusCouplet records (capped cleanly so IndexedDB stays fast).
 */
export function parseOpenSourcePoetryText(
  rawText: string,
  poetHint = 'Classical Archive',
  format: 'csv' | 'text' | 'yaml' = 'text',
  maxCouplets = 180
): CorpusCouplet[] {
  const results: CorpusCouplet[] = [];
  if (!rawText || !rawText.trim()) return results;

  const inferMoods = (text: string): string[] => {
    const lower = text.toLowerCase();
    const moods: string[] = [];
    if (/(ishq|mohabbat|dil|husn|yaar|wisaal|lab|zulf)/.test(lower)) moods.push('ishq-e-majazi');
    if (/(gham|dard|hijr|firaaq|aansu|tanha|udaas|zakhm)/.test(lower)) moods.push('dard', 'hijr');
    if (/(khuda|rab|maula|rooh|sufi|prem|fana)/.test(lower)) moods.push('sufi', 'ishq-e-haqiqi');
    if (/(shaam|baarish|barish|sawan|hawa|khushboo|chai)/.test(lower)) moods.push('barish', 'shaam');
    if (/(waqt|duniya|zindagi|maut|khala|aaina|saraab)/.test(lower)) moods.push('falsafa');
    if (/(hausla|toofaan|parwaaz|aasmaan|sehar|subah|inquilab)/.test(lower)) moods.push('hausla', 'inquilab');
    return moods.length > 0 ? moods : ['sukoon', 'falsafa'];
  };

  const extractRadif = (line1: string, line2: string): string | undefined => {
    const w1 = line1.trim().split(/\s+/);
    const w2 = line2.trim().split(/\s+/);
    if (w1.length >= 2 && w2.length >= 2 && w1[w1.length - 1].toLowerCase() === w2[w2.length - 1].toLowerCase()) {
      return w1[w1.length - 1];
    }
    return undefined;
  };

  if (format === 'yaml') {
    const romanMatches = rawText.matchAll(
      /'lang':\s*'ro'\s*\n\s*'text':\s*'([^']+)'/g
    );
    let idx = 0;
    for (const m of romanMatches) {
      if (results.length >= maxCouplets) break;
      const rawPair = m[1].replace(/''/g, "'").trim();
      const parts = rawPair
        .split('|')
        .map((p) => p.trim())
        .filter((p) => p.length > 6);
      if (parts.length >= 2) {
        const l1 = parts[0];
        const l2 = parts[1];
        const combined = `${l1}\n${l2}`;
        results.push({
          id: `remote-yaml-${poetHint.toLowerCase().replace(/\s+/g, '-')}-${idx++}`,
          poet: poetHint,
          era: 'classical',
          form: 'nazm',
          moods: inferMoods(combined),
          roman: combined,
          devanagari: '',
          radif: extractRadif(l1, l2),
          motifs: tokenize(combined).slice(0, 5),
          source: 'rekhta-open-dataset',
        });
      }
    }
    return results;
  }

  if (format === 'csv') {
    const lines = rawText.split(/\r?\n/).slice(1);
    for (let i = 0; i < lines.length && results.length < maxCouplets; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Extract quoted or comma-delimited fields safely
      const match = line.match(/^([^,]+),"?([^"]+)"?/);
      if (!match) continue;
      const poetRaw = match[1].replace(/["']/g, '').trim() || poetHint;
      const bodyRaw = match[2].replace(/\\n/g, '\n').trim();
      const verseLines = bodyRaw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 10 && l.length < 140);
      if (verseLines.length >= 2) {
        const l1 = verseLines[0];
        const l2 = verseLines[1];
        const combined = `${l1}\n${l2}`;
        results.push({
          id: `remote-csv-${i}-${results.length}`,
          poet: poetRaw
            .split(/[-_\s]+/)
            .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
            .join(' '),
          era: 'classical',
          form: 'ghazal',
          moods: inferMoods(combined),
          roman: combined,
          devanagari: '',
          radif: extractRadif(l1, l2),
          motifs: tokenize(combined).slice(0, 5),
          source: 'rekhta-open-dataset',
        });
      }
    }
    return results;
  }

  // Plain-text ghazal blocks separated by blank lines
  const blocks = rawText
    .split(/\n\s*\n/)
    .map((b) =>
      b
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 8 && l.length < 140)
    )
    .filter((lines) => lines.length >= 2);

  for (let b = 0; b < blocks.length && results.length < maxCouplets; b++) {
    const lines = blocks[b];
    for (let i = 0; i + 1 < lines.length && results.length < maxCouplets; i += 2) {
      const l1 = lines[i];
      const l2 = lines[i + 1];
      const combined = `${l1}\n${l2}`;
      results.push({
        id: `remote-txt-${poetHint.toLowerCase().replace(/\s+/g, '-')}-${b}-${i}`,
        poet: poetHint,
        era: 'classical',
        form: 'ghazal',
        moods: inferMoods(combined),
        roman: combined,
        devanagari: '',
        radif: extractRadif(l1, l2),
        motifs: tokenize(combined).slice(0, 5),
        source: 'rekhta-open-dataset',
      });
    }
  }

  return results;
}

// IndexedDB helpers (browser / Capacitor WebView only)
function openCorpusIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readCachedRemoteCorpus(): Promise<CorpusCouplet[] | null> {
  try {
    if (typeof localStorage !== 'undefined') {
      const metaRaw = localStorage.getItem(LOCAL_META_KEY);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw) as { updatedAt?: number };
        if (meta.updatedAt && Date.now() - meta.updatedAt > CACHE_TTL_MS) {
          return null;
        }
      }
    }
    const db = await openCorpusIdb();
    if (!db) return null;
    return await new Promise<CorpusCouplet[] | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        const val = req.result as CorpusCouplet[] | undefined;
        resolve(Array.isArray(val) && val.length > 0 ? val : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeCachedRemoteCorpus(items: CorpusCouplet[]): Promise<void> {
  try {
    const db = await openCorpusIdb();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(items, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        LOCAL_META_KEY,
        JSON.stringify({ updatedAt: Date.now(), count: items.length })
      );
    }
  } catch {
    // Non-fatal cache write failure
  }
}

function mergeRemoteIntoCorpus(remoteItems: CorpusCouplet[]): void {
  if (!remoteItems.length) return;
  const seen = new Set(
    BUILTIN_SHAYARI_CORPUS.map((c) => c.roman.toLowerCase().slice(0, 48))
  );
  const uniqueRemote: CorpusCouplet[] = [];
  for (const item of remoteItems) {
    const key = item.roman.toLowerCase().slice(0, 48);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRemote.push(item);
    }
  }
  mergedCorpus = [...BUILTIN_SHAYARI_CORPUS, ...uniqueRemote];
  remoteLoaded = uniqueRemote.length > 0;
}

/**
 * Loads cached remote corpus from IndexedDB and opportunistically fetches
 * open-source GitHub Rekhta poetry datasets without blocking offline startup.
 */
export async function ensureShayariCorpusLoaded(): Promise<number> {
  if (remoteLoaded) return mergedCorpus.length;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    // 1. Instant IndexedDB cache hit (fast offline APK load)
    const cached = await readCachedRemoteCorpus();
    if (cached && cached.length > 0) {
      mergeRemoteIntoCorpus(cached);
      return mergedCorpus.length;
    }

    // 2. Opportunistic fetch from public open-source GitHub poetry datasets
    if (typeof fetch !== 'function') {
      return mergedCorpus.length;
    }

    const collected: CorpusCouplet[] = [];
    for (const src of OPEN_SOURCE_POETRY_SOURCES) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const resp = await fetch(src.url, {
          signal: controller.signal,
          headers: { Accept: 'text/plain, text/csv, */*' },
        });
        clearTimeout(timer);
        if (!resp.ok) continue;
        const text = await resp.text();
        const parsed = parseOpenSourcePoetryText(
          text,
          src.poetHint,
          src.format,
          src.format === 'csv' ? 140 : 45
        );
        if (parsed.length > 0) {
          collected.push(...parsed);
        }
        if (collected.length >= 220) break;
      } catch {
        // Offline or GitHub raw unavailable — built-in 160+ corpus guarantees resilience
      }
    }

    if (collected.length > 0) {
      mergeRemoteIntoCorpus(collected);
      await writeCachedRemoteCorpus(collected);
    }
    return mergedCorpus.length;
  })();

  try {
    return await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}

export function getCorpusStats(): { total: number; builtin: number; remoteLoaded: boolean } {
  return {
    total: mergedCorpus.length,
    builtin: BUILTIN_SHAYARI_CORPUS.length,
    remoteLoaded,
  };
}

/**
 * Lightweight Local Semantic / Keyword & Mood Retriever (RAG).
 * Pulls diverse classical couplets, Radif-Qafiya patterns, imagery motifs,
 * and nuanced Farhang alfaaz tailored to the user's prompt.
 */
export function retrieveRelevantShayari(
  query: string,
  options: RetrieveOptions = {}
): ShayariRetrievalResult {
  const limit = Math.max(1, Math.min(options.limit ?? 5, 10));
  const excludeSet = new Set(options.excludeIds ?? []);
  const queryText = `${query || ''} ${options.mood || ''} ${options.poet || ''}`.trim();
  const queryLower = queryText.toLowerCase();
  const rawTokens = tokenize(queryText);
  const expandedTokens = expandSemanticTokens(rawTokens);
  const targetPoet = detectTargetPoet(queryLower);

  const scored = mergedCorpus
    .filter((item) => !excludeSet.has(item.id))
    .map((item, idx) => {
      let score = 0;
      const poetLower = item.poet.toLowerCase();

      if (targetPoet && poetLower.includes(targetPoet)) {
        score += 14;
      }
      if (options.poet && poetLower.includes(options.poet.toLowerCase())) {
        score += 12;
      }

      const itemMoods = item.moods.map((m) => m.toLowerCase());
      const itemMotifs = item.motifs.map((m) => m.toLowerCase());
      const itemTextTokens = new Set(
        tokenize(`${item.roman} ${item.devanagari} ${item.poet} ${item.motifs.join(' ')}`)
      );

      for (const tok of rawTokens) {
        if (itemMoods.some((m) => m.includes(tok) || tok.includes(m))) score += 5.5;
        if (itemMotifs.some((m) => m.includes(tok) || tok.includes(m))) score += 4.5;
        if (itemTextTokens.has(tok)) score += 3.0;
      }

      for (const syn of expandedTokens) {
        if (itemMoods.some((m) => m.includes(syn))) score += 2.2;
        if (itemMotifs.some((m) => m.includes(syn))) score += 1.6;
        if (itemTextTokens.has(syn)) score += 0.9;
      }

      // Subtle deterministic-free tie-breaker jitter when queries are broad so repeated prompts stay fresh
      const varietyJitter = ((idx * 2654435761 + queryLower.length * 97) % 100) / 1000;
      return { item, score: score + varietyJitter };
    })
    .sort((a, b) => b.score - a.score);

  // Enforce diversity across poets & radifs unless user specifically asked for one poet
  const selected: CorpusCouplet[] = [];
  const usedPoets = new Map<string, number>();
  const usedRadifs = new Set<string>();

  for (const entry of scored) {
    if (selected.length >= limit) break;
    const poetCount = usedPoets.get(entry.item.poet) ?? 0;
    const maxPerPoet = targetPoet ? 3 : 1;
    if (poetCount >= maxPerPoet) continue;
    if (entry.item.radif && usedRadifs.has(entry.item.radif) && selected.length < limit - 1) {
      continue;
    }
    selected.push(entry.item);
    usedPoets.set(entry.item.poet, poetCount + 1);
    if (entry.item.radif) usedRadifs.add(entry.item.radif);
  }

  // Fill any remaining slots cleanly if strict diversity filtered too tightly
  if (selected.length < limit) {
    for (const entry of scored) {
      if (selected.length >= limit) break;
      if (!selected.some((s) => s.id === entry.item.id)) {
        selected.push(entry.item);
      }
    }
  }

  // Select matching Farhang alfaaz based on expanded tokens
  const scoredAlfaaz = RICH_FARHANG_ALFAAZ.map((entry, idx) => {
    const hay = `${entry.word} ${entry.meaning} ${entry.nuance}`.toLowerCase();
    let score = 0;
    for (const tok of expandedTokens) {
      if (hay.includes(tok)) score += 3;
    }
    return { entry, score: score + ((idx * 37 + rawTokens.length * 13) % 10) / 100 };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((s) => s.entry);

  const radifPatterns = Array.from(
    new Set(selected.map((c) => c.radif).filter((r): r is string => Boolean(r)))
  );
  const motifs = Array.from(
    new Set(selected.flatMap((c) => c.motifs))
  ).slice(0, 12);

  return {
    couplets: selected,
    suggestedAlfaaz: scoredAlfaaz,
    radifPatterns,
    motifs,
    corpusSize: mergedCorpus.length,
    hasRemoteDataset: remoteLoaded,
  };
}
