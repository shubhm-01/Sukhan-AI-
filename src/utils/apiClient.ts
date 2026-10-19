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
    // Production APKs must be built with VITE_API_BASE_URL set to a live backend.
    // Do not silently route requests to a stale/hard-coded Cloud Run URL.
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
 *  1. Backend SSE Stream (/api/chat/stream)
 *  2. Backend Unary JSON (/api/chat/message)
 *  3. Direct Client Gemini SDK (when VITE_GEMINI_API_KEY is configured in APK build)
 *  4. Live Cloud AI Endpoint (https://text.pollinations.ai/openai — zero-key live LLM for standalone APK)
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
  const userIntent = detectUserIntent(String(lastUserMsg), hasPrevPoem);
  const systemInstruction = buildClientChatSystemInstruction(
    settings,
    userIntent
  );

  // Tier 1: Backend SSE Stream (/api/chat/stream)
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

  // Tier 2: Backend Unary JSON (/api/chat/message)
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

  // Tier 3: Direct Client Gemini SDK (for standalone Android APK builds with VITE_GEMINI_API_KEY)
  const clientApiKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()
      : '';

  if (clientApiKey && clientApiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey: clientApiKey });
      const formattedContents = messages.slice(-16).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const modelsToTry = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
      ];
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
            const cleanedText =
              userIntent === 'greeting'
                ? rawText.replace(/\[\/?VERSE\]/gi, '')
                : rawText;
            const groundingSources: GroundingSource[] = [];
            const chunks =
              response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (Array.isArray(chunks)) {
              for (const c of chunks) {
                if (c?.web?.uri && c?.web?.title) {
                  if (!groundingSources.some((g) => g.uri === c.web!.uri)) {
                    groundingSources.push({
                      title: c.web.title,
                      uri: c.web.uri,
                    });
                  }
                }
              }
            }
            await streamTextIncrementally(
              cleanedText,
              signal,
              onChunk,
              onComplete,
              groundingSources.length > 0 ? groundingSources : undefined
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

  // Tier 4: Live Cloud AI Endpoint (Works inside the installed Android APK with zero API key setup!)
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
        const cleanedCloudText =
          userIntent === 'greeting'
            ? cloudText.replace(/\[\/?VERSE\]/gi, '')
            : cloudText;
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
    // Proceed to Tier 5
  }

  // Tier 5: On-Device Sukhan Conversational & Literary Engine (Offline Fallback)
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const localReply = buildContextualChatReply(messages, settings);
  await streamTextIncrementally(localReply, signal, onChunk, onComplete);
}
