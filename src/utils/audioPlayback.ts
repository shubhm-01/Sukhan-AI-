import { detectLanguageAndScript } from './poetryLogic';
import { resolveApiUrl } from './apiClient';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export interface PlaybackSnapshot { id: string | null; status: PlaybackStatus; error?: string; }

const DB_NAME = 'sukhan-audio-cache';
const STORE_NAME = 'audio';
let current: PlaybackSnapshot = { id: null, status: 'idle' };
let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let activeController: AbortController | null = null;
const memoryCache = new Map<string, Blob>();
const subscribers = new Set<(snapshot: PlaybackSnapshot) => void>();

function publish(snapshot: PlaybackSnapshot) {
  current = snapshot;
  subscribers.forEach((listener) => listener(snapshot));
}
export function getPlaybackSnapshot() { return current; }
export function subscribePlayback(listener: (snapshot: PlaybackSnapshot) => void) {
  subscribers.add(listener);
  listener(current);
  return () => { subscribers.delete(listener); };
}

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function makeKey(id: string, text: string, voice: string) {
  return `${id}:${voice}:${fingerprint(text)}`;
}
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}
async function readCache(key: string): Promise<Blob | null> {
  const inMemory = memoryCache.get(key);
  if (inMemory) return inMemory;
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const result = request.result;
      db.close();
      resolve(result instanceof Blob ? result : null);
    };
    request.onerror = () => { db.close(); resolve(null); };
  });
}
async function writeCache(key: string, blob: Blob) {
  memoryCache.set(key, blob);
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(blob, key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); resolve(); };
  });
}
function releaseCurrent() {
  activeController?.abort();
  activeController = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}
function selectVoice(text: string, preferredVoice: string) {
  if (preferredVoice && preferredVoice !== 'auto') return preferredVoice;
  const language = detectLanguageAndScript(text).detected;
  if (language === 'hindi') return 'hi-IN-SwaraNeural';
  if (language === 'urdu' || language === 'roman_urdu') return 'ur-PK-UzmaNeural';
  return 'en-IN-NeerjaNeural';
}
async function getAudio(messageId: string, text: string, voice: string, signal: AbortSignal) {
  const key = makeKey(messageId, text, voice);
  const cached = await readCache(key);
  if (cached) return cached;
  const response = await fetch(resolveApiUrl('/api/poetry/recite'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
    signal,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Voice service returned HTTP ${response.status}. Check the backend URL in Settings.`);
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error('The speech service returned an empty audio file.');
  await writeCache(key, blob);
  return blob;
}

export async function toggleMessagePlayback(messageId: string, rawText: string, preferredVoice = 'auto') {
  if (current.id === messageId && current.status === 'playing' && activeAudio) {
    activeAudio.pause();
    publish({ id: messageId, status: 'paused' });
    return;
  }
  if (current.id === messageId && current.status === 'paused' && activeAudio) {
    try {
      await activeAudio.play();
      publish({ id: messageId, status: 'playing' });
    } catch {
      publish({ id: messageId, status: 'error', error: 'Tap Listen again to resume audio playback.' });
    }
    return;
  }

  releaseCurrent();
  const text = (rawText || '').replace(/\[\/?VERSE\]/gi, '').trim();
  if (!text) return;
  const voice = selectVoice(text, preferredVoice);
  const controller = new AbortController();
  activeController = controller;
  publish({ id: messageId, status: 'loading' });

  try {
    const blob = await getAudio(messageId, text, voice, controller.signal);
    if (controller.signal.aborted || activeController !== controller) return;
    const objectUrl = URL.createObjectURL(blob);
    activeUrl = objectUrl;
    const audio = new Audio(objectUrl);
    audio.preload = 'auto';
    activeAudio = audio;
    audio.onended = () => {
      releaseCurrent();
      publish({ id: messageId, status: 'ended' });
    };
    audio.onerror = () => {
      releaseCurrent();
      publish({ id: messageId, status: 'error', error: 'Audio could not be decoded by this device.' });
    };
    await audio.play();
    if (activeAudio === audio) publish({ id: messageId, status: 'playing' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    publish({ id: messageId, status: 'error', error: error instanceof Error ? error.message : 'Read-aloud failed.' });
    releaseCurrent();
  }
}

export function stopMessagePlayback() {
  const previousId = current.id;
  releaseCurrent();
  publish({ id: previousId, status: 'idle' });
}
