import { GoogleGenAI } from '@google/genai';
import {
  buildContextualChatReply,
  detectUserIntent,
} from './poetryLogic.ts';
import type { UserSettings, GroundingSource } from './poetryLogic.ts';

/**
 * Detects whether the app is executing inside a packaged Capacitor Android APK
 * WebView (where origin is https://localhost or capacitor://localhost with no local Express server)
 * vs. standard web browser hosting where relative /api/* routes are served by Express.
 */
export function isNativeApkEnvironment(
  loc?: { protocol?: string; hostname?: string; port?: string },
  hasCapacitorGlobal?: boolean
): boolean {
  if (hasCapacitorGlobal) return true;
  if (
    typeof window !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.()
  ) {
    return true;
  }

  const currentLoc =
    loc ||
    (typeof window !== 'undefined'
      ? {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          port: window.location.port,
        }
      : { protocol: 'http:', hostname: 'localhost', port: '3000' });

  if (
    currentLoc.protocol === 'capacitor:' ||
    currentLoc.protocol === 'file:'
  ) {
    return true;
  }

  // Capacitor Android serves bundled assets from https://localhost (port '') or http://localhost (port '')
  if (currentLoc.hostname === 'localhost' && !currentLoc.port) {
    return true;
  }

  return false;
}

/**
 * Returns true if an Express backend API is reachable in the current environment:
 * - Always true on Web (where Express serves the app on the same origin)
 * - True on Android APK only when VITE_API_BASE_URL is configured to an http(s) URL
 */
export function hasBackendApiAvailable(
  envBaseUrl?: string,
  loc?: { protocol?: string; hostname?: string; port?: string },
  hasCapacitorGlobal?: boolean
): boolean {
  const rawEnvBase =
    typeof envBaseUrl === 'string'
      ? envBaseUrl
      : typeof import.meta !== 'undefined' && import.meta.env
      ? String(import.meta.env.VITE_API_BASE_URL || '')
      : '';

  const trimmedBase = rawEnvBase.trim().replace(/\/+$/, '');
  if (isNativeApkEnvironment(loc, hasCapacitorGlobal)) {
    return /^https?:\/\//i.test(trimmedBase);
  }
  return true;
}

/**
 * Resolves an API path (e.g. '/api/chat/stream') for both Web and Android APK runtimes.
 */
export function resolveApiUrl(
  endpointPath: string,
  envBaseUrl?: string,
  loc?: { protocol?: string; hostname?: string; port?: string },
  hasCapacitorGlobal?: boolean
): string {
  const cleanPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`;

  const rawEnvBase =
    typeof envBaseUrl === 'string'
      ? envBaseUrl
      : typeof import.meta !== 'undefined' && import.meta.env
      ? String(import.meta.env.VITE_API_BASE_URL || '')
      : '';

  const trimmedBase = rawEnvBase.trim().replace(/\/+$/, '');

  if (isNativeApkEnvironment(loc, hasCapacitorGlobal)) {
    return trimmedBase ? `${trimmedBase}${cleanPath}` : cleanPath;
  }

  return cleanPath;
}

export function buildClientChatSystemInstruction(
  settings?: Partial<UserSettings>,
  userIntent?: string
): string {
  const scriptPref =
    settings?.defaultScript === 'urdu'
      ? 'When the user asks for poetry, prefer authentic Urdu script (Nastaliq/Perso-Arabic) unless they specify another script.'
      : settings?.defaultScript === 'hindi'
      ? 'When the user asks for poetry, prefer Hindi Devanagari script unless they specify another script.'
      : settings?.defaultScript === 'roman_urdu'
      ? 'When the user asks for poetry, prefer Roman Urdu unless they specify another script.'
      : 'Match the language and script of the user naturally (Urdu script, Roman Urdu, Hindi Devanagari, or English).';

  const stylePref = settings?.poeticStyle
    ? `When composing poetry, use this poetic sensibility: ${settings.poeticStyle.replace('_', ' ')}.`
    : 'When composing poetry, balance Classical Ustad & Modern Literary sensibility.';

  const intentDirective =
    userIntent === 'greeting'
      ? 'IMMEDIATE TURN RULE: The user just sent a casual greeting ("hi", "hii", "hello", "kaise ho", "salam", etc.). Reply ONLY with a natural, warm, friendly conversational greeting in 1-3 sentences. DO NOT write any poem, couplet, sher, ghazal, shayari, or [VERSE] block in this response.'
      : userIntent === 'general_chat'
      ? 'IMMEDIATE TURN RULE: The user is having a normal conversation or asking a general question—NOT asking for a poem. Answer naturally and directly like ChatGPT. DO NOT generate unsolicited poetry or [VERSE] blocks unless the user explicitly asked for verses.'
      : 'IMMEDIATE TURN RULE: The user is requesting poetry, literary explanation, or refinement. Provide a rich literary response and wrap verse lines inside [VERSE] and [/VERSE] tags.';

  return [
    'You are Sukhan AI — an intelligent, warm, ChatGPT-style conversational AI assistant with deep mastery of Urdu poetry, Roman Urdu shayari, Hindi kavita, ghazals, nazms, and literary culture.',
    'CRITICAL RULE — DO NOT AUTO-GENERATE POETRY UNLESS ASKED:',
    '- Behave like ChatGPT first and foremost. If the user says "hi", "hello", "hii", "assalamu alaikum", "kaise ho", or asks a normal question, respond naturally in warm, conversational prose WITHOUT writing any unsolicited ghazal, shayari, or [VERSE] block.',
    '- ONLY compose poetry, shayari, ghazals, nazms, or couplets when the user EXPLICITLY asks you to write/compose poetry or refine an existing poem in the conversation.',
    '- When (and ONLY when) you output poetry verses, wrap the verse lines inside [VERSE] and [/VERSE] tags with preserved line breaks (2 lines per couplet, blank line between couplets).',
    '- Do not prefix your response with tags like [ANSWER].',
    '- Maintain full multi-turn context across the conversation.',
    intentDirective,
    scriptPref,
    stylePref,
    settings?.showTranslations !== false
      ? 'When you do write Urdu, Roman Urdu, or Hindi poetry, include brief English meanings or vocabulary notes below the [VERSE] block when helpful.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface ChatTurnOptions {
  messages: { role: 'user' | 'assistant'; content: string }[];
  settings: UserSettings;
  useWebResearch: boolean;
  signal: AbortSignal;
  onChunk: (accumulatedText: string) => void;
  onComplete: (
    finalText: string,
    groundingSources?: GroundingSource[]
  ) => Promise<void> | void;
}

function sanitizeAiOutput(raw: string, userIntent: string): string {
  let cleaned = raw
    .replace(/^\[ANSWER\]\s*/i, '')
    .replace(/\[\/ANSWER\]\s*$/i, '')
    .trim();
  if (userIntent === 'greeting') {
    cleaned = cleaned.replace(/\[\/?VERSE\]/gi, '').trim();
  }
  return cleaned;
}

async function streamTextIncrementally(
  fullText: string,
  signal: AbortSignal,
  onChunk: (accumulatedText: string) => void,
  onComplete: (
    finalText: string,
    groundingSources?: GroundingSource[]
  ) => Promise<void> | void,
  groundingSources?: GroundingSource[]
): Promise<void> {
  const words = fullText.split(/(?<=\s)/);
  let accumulated = '';
  for (let i = 0; i < words.length; i += 6) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    accumulated += words.slice(i, i + 6).join('');
    onChunk(accumulated);
    await new Promise((r) => setTimeout(r, 16));
  }
  await onComplete(fullText, groundingSources);
}

/**
 * Executes a conversational turn across 5 resilient tiers so that both the Web App
 * and the installed Android APK work identically under all conditions:
 *  1. Backend SSE Stream (/api/chat/stream — when web server or VITE_API_BASE_URL is active)
 *  2. Backend Unary JSON (/api/chat/message — when web server or VITE_API_BASE_URL is active)
 *  3. Direct Gemini HTTPS REST & SDK (when VITE_GEMINI_API_KEY or GEMINI_API_KEY is bundled)
 *  4. Live Cloud AI Endpoints (https://text.pollinations.ai/openai + GET fallback — zero-key live LLM for standalone APK)
 *  5. Built-in On-Device Sukhan Conversational & Literary Engine (offline fallback)
 */
export async function executeResilientChatTurn(
  options: ChatTurnOptions
): Promise<void> {
  const { messages, settings, useWebResearch, signal, onChunk, onComplete } =
    options;

  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const prevAssistantMsg =
    [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';
  const hasPrevPoem = /\[VERSE\]/i.test(prevAssistantMsg);
  const userIntent = detectUserIntent(String(lastUserMsg), hasPrevPoem ? prevAssistantMsg : undefined);
  const systemInstruction = buildClientChatSystemInstruction(
    settings,
    userIntent
  );

  const backendReachable = hasBackendApiAvailable();

  // Tier 1 & Tier 2: Backend SSE Stream & Unary JSON
  if (backendReachable) {
    try {
      const streamUrl = resolveApiUrl('/api/chat/stream');
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          messages,
          settings,
          useWebResearch,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (
        response.ok &&
        response.body &&
        contentType.includes('text/event-stream')
      ) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let completed = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.replace(/^data:\s*/, '');
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.text) {
                accumulatedText += payload.text;
                onChunk(accumulatedText);
              }
              if (payload.done) {
                const finalContent = payload.fullText || accumulatedText;
                if (finalContent.trim()) {
                  completed = true;
                  await onComplete(finalContent, payload.groundingSources);
                  return;
                }
              }
            } catch {
              // Ignore partial SSE chunk parse error
            }
          }
        }

        if (!completed && accumulatedText.trim()) {
          await onComplete(accumulatedText);
          return;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      // Proceed to Tier 2
    }

    try {
      const messageUrl = resolveApiUrl('/api/chat/message');
      const fallbackRes = await fetch(messageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          messages,
          settings,
          useWebResearch,
        }),
      });

      const contentType = fallbackRes.headers.get('content-type') || '';
      if (fallbackRes.ok && contentType.includes('application/json')) {
        const data = await fallbackRes.json();
        if (data && typeof data.reply === 'string' && data.reply.trim()) {
          await streamTextIncrementally(
            data.reply.trim(),
            signal,
            onChunk,
            onComplete,
            data.groundingSources
          );
          return;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      // Proceed to Tier 3
    }
  }

  // Tier 3: Direct Gemini API (REST fetch + SDK fallback when VITE_GEMINI_API_KEY is bundled)
  const clientApiKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()
      : '';

  if (
    clientApiKey &&
    clientApiKey !== 'MY_GEMINI_API_KEY' &&
    !clientApiKey.startsWith('AQ.')
  ) {
    const formattedContents = messages.slice(-16).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
    ];

    // 3A. Pure HTTPS REST fetch (immune to SDK minification/obfuscation in APK builds)
    for (const modelId of modelsToTry) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(
          clientApiKey
        )}`;
        const restRes = await fetch(restUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: formattedContents,
            generationConfig: { temperature: 0.75 },
          }),
        });

        if (restRes.ok) {
          const restJson = await restRes.json();
          const parts = restJson?.candidates?.[0]?.content?.parts;
          const rawText = Array.isArray(parts)
            ? parts.map((p: any) => p?.text || '').join('').trim()
            : '';
          if (rawText) {
            const cleanedText = sanitizeAiOutput(rawText, userIntent);
            await streamTextIncrementally(
              cleanedText,
              signal,
              onChunk,
              onComplete
            );
            return;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw err;
        }
        // Try next model
      }
    }

    // 3B. GoogleGenAI SDK fallback
    try {
      const ai = new GoogleGenAI({ apiKey: clientApiKey });
      for (const modelId of modelsToTry) {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        try {
          const response = await ai.models.generateContent({
            model: modelId,
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.75,
              ...(useWebResearch ? { tools: [{ googleSearch: {} }] } : {}),
            },
          });

          const rawText = response.text?.trim();
          if (rawText) {
            const cleanedText = sanitizeAiOutput(rawText, userIntent);
            await streamTextIncrementally(
              cleanedText,
              signal,
              onChunk,
              onComplete
            );
            return;
          }
        } catch {
          // Try next model
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      // Proceed to Tier 4
    }
  }

  // Tier 4A: Live Cloud AI POST Endpoint (Works inside the installed Android APK with zero API key setup!)
  try {
    const openAiMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.slice(-14).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const cloudRes = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        model: 'openai',
        messages: openAiMessages,
        temperature: 0.75,
      }),
    });

    if (cloudRes.ok) {
      const cloudData = await cloudRes.json();
      const cloudText =
        cloudData?.choices?.[0]?.message?.content?.trim() || '';
      if (cloudText) {
        const cleanedCloudText = sanitizeAiOutput(cloudText, userIntent);
        await streamTextIncrementally(
          cleanedCloudText,
          signal,
          onChunk,
          onComplete
        );
        return;
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    // Proceed to Tier 4B
  }

  // Tier 4B: Live Cloud AI GET Endpoint Fallback
  try {
    const promptUrl = `https://text.pollinations.ai/${encodeURIComponent(
      lastUserMsg
    )}?system=${encodeURIComponent(
      'You are Sukhan AI, a helpful conversational AI and Urdu/Hindi poetry expert. Do not write poetry on casual greetings. Wrap poetry in [VERSE] and [/VERSE].'
    )}`;
    const getRes = await fetch(promptUrl, {
      method: 'GET',
      signal,
    });
    if (getRes.ok) {
      const getText = (await getRes.text()).trim();
      if (getText && !getText.startsWith('<!DOCTYPE')) {
        const cleanedGetText = sanitizeAiOutput(getText, userIntent);
        await streamTextIncrementally(
          cleanedGetText,
          signal,
          onChunk,
          onComplete
        );
        return;
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    // Proceed to Tier 5
  }

  // Tier 5: On-Device Sukhan Conversational & Literary Engine (Offline Fallback)
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const localReply = buildContextualChatReply(messages, settings);
  await streamTextIncrementally(localReply, signal, onChunk, onComplete);
}
