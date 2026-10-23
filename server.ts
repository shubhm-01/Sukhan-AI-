import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ComposeRequest,
  GeneratedPoem,
  GroundingSource,
  ChatThread,
  UserSettings,
  resolveLanguage,
  validateComposeRequest,
  getTargetCoupletCount,
  analyzeRadifAndQafiya,
  buildFallbackPoem,
  buildContextualChatReply,
  detectUserIntent,
  INITIAL_SEED_CHATS,
} from './src/utils/poetryLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'sukhan_chats_db.json');

interface ServerDatabase {
  chatsByOwner: Record<string, ChatThread[]>;
}

function readServerDb(): ServerDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.chatsByOwner === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Sukhan AI] Could not read local DB file, initializing fresh store:', err);
  }
  return {
    chatsByOwner: {
      guest: INITIAL_SEED_CHATS,
    },
  };
}

function writeServerDb(dbData: ServerDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Sukhan AI] Could not write local DB file:', err);
  }
}

async function searchDuckDuckGo(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const q = query.trim().slice(0, 300);
  if (!q) return [];
  try {
    const response = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SukhanAI/1.0)' },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return [];
    const html = await response.text();
    const results: { title: string; url: string; snippet: string }[] = [];
    const chunks = html.split('result__a').slice(1);
    for (const chunk of chunks) {
      const hrefMatch = chunk.match(/href=["']([^"']+)["']/i);
      const titleMatch = chunk.split('</a>')[0]?.split('>').slice(1).join('>');
      if (!hrefMatch || !titleMatch) continue;
      let url = hrefMatch[1].replace(/&amp;/g, '&');
      const redirect = url.match(/uddg=([^&]+)/);
      if (redirect) { try { url = decodeURIComponent(redirect[1]); } catch { /* ignore malformed redirect */ } }
      if (!url.startsWith('http') || url.includes('duckduckgo.com')) continue;
      const title = titleMatch.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
      if (title) results.push({ title, url, snippet: '' });
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildChatSystemInstruction(
  settings?: Partial<UserSettings>,
  userIntent?: string
): string {
  const scriptPref =
    settings?.defaultScript === 'urdu'
      ? 'When composing poetry, prefer authentic Urdu script (Nastaliq/Perso-Arabic) unless the user asks for another script.'
      : settings?.defaultScript === 'hindi'
      ? 'When composing poetry, prefer Hindi Devanagari script unless the user asks for another script.'
      : settings?.defaultScript === 'roman_urdu'
      ? 'When composing poetry, prefer Roman Urdu unless the user asks for another script.'
      : 'Match the language and script of the user naturally (Urdu script, Roman Urdu, Hindi Devanagari, or English).';

  const stylePref = settings?.poeticStyle
    ? `Preferred poetic sensibility: ${settings.poeticStyle.replace('_', ' ')}.`
    : 'Preferred poetic sensibility: Classical Ustad & Modern Literary balance.';

  const intentDirective =
    userIntent === 'greeting'
      ? 'IMMEDIATE TURN RULE: The user just sent a casual greeting ("hi", "hii", "hello", "kaise ho", "salam", etc.). Reply ONLY with a natural, warm, friendly conversational greeting in 1-3 sentences. DO NOT write any poem, couplet, sher, ghazal, shayari, or [VERSE] block in this response.'
      : userIntent === 'general_chat'
      ? 'IMMEDIATE TURN RULE: The user is having a normal conversation or asking a general question—NOT asking for a poem. Answer naturally and directly like ChatGPT. DO NOT generate unsolicited poetry or [VERSE] blocks unless the user explicitly asked for verses.'
      : 'IMMEDIATE TURN RULE: The user is requesting poetry, literary explanation, or refinement. Provide a rich literary response and wrap verse lines inside [VERSE] and [/VERSE] tags.';

  return [
    'You are Sukhan AI — a warm, erudite, ChatGPT-style conversational AI and master Ustad of Urdu poetry, Roman Urdu shayari, Hindi kavita, ghazals, nazms, and literary culture.',
    '1. Conversational Versatility: Behave like ChatGPT first and foremost. Chat naturally about anything—answer general questions, discuss philosophy, history, everyday topics, explain couplets (tashreeh), or compose original poetry ONLY when requested.',
    '2. Contextual Continuity: Pay close attention to earlier messages in the conversation. If the user says "make it sadder", "change the last line", "write this in Roman Urdu", "translate to Urdu script", "explain this couplet", or "continue", apply that instruction directly to the poem or topic from the preceding message without asking the user to repeat themselves.',
    '3. Poetry Formatting: Whenever you output poetry, couplets (ash’ar), ghazals, nazms, or shayari verses, wrap the verse lines inside [VERSE] and [/VERSE] tags with preserved line breaks (2 lines per couplet, blank line between couplets) so the interface can typeset them in a Diwan manuscript frame.',
    intentDirective,
    scriptPref,
    stylePref,
    settings?.showTranslations !== false
      ? 'When writing Urdu, Roman Urdu, or Hindi poetry, include brief English meanings or vocabulary notes below the [VERSE] block when helpful.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatMultiTurnContents(
  messages: { role: 'user' | 'assistant'; content: string }[]
) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

function buildSystemInstruction(
  req: ComposeRequest,
  resolvedLang: 'urdu' | 'roman_urdu' | 'hindi',
  coupletCount: number
): string {
  const langGuide =
    resolvedLang === 'urdu'
      ? 'Write the primary poem verses in authentic Urdu script (Nastaliq/Perso-Arabic). Provide Roman Urdu transliteration and English poetic translation for each couplet.'
      : resolvedLang === 'hindi'
      ? 'Write the primary poem verses in Hindi Devanagari script with rich Hindustani/Kavita diction. Provide Roman transliteration and English translation for each couplet.'
      : 'Write the primary poem verses in refined, natural Roman Urdu (Latin script with authentic Urdu poetic vocabulary like ishq, hijr, dareecha, tishnagi, sahar). Provide an English poetic translation for each couplet.';

  const formGuide: Record<string, string> = {
    ghazal: `Compose a classical-grade Ghazal of ${coupletCount} couplets (ash'ar). The first couplet (Matla) MUST have the rhyming pattern (Qafiya + Radif) in BOTH lines (AA). Subsequent couplets MUST end their second line with the exact same Radif preceded by a rhyming Qafiya (BA, CA, DA...).`,
    shayari: `Compose ${coupletCount} resonant two-line Sher / Shayari couplets with strong rhythmic cadence, emotional depth, and memorable imagery.`,
    nazm: `Compose a cohesive thematic Nazm of ${coupletCount} stanzas (2 lines per stanza) with evolving imagery and unified emotional arc.`,
    qita: `Compose a connected Qita (quatrain / linked couplets) of ${coupletCount} stanzas where the thought flows seamlessly across the verses.`,
    caption: `Compose ${coupletCount} evocative, concise poetic couplets or one-liners suitable for literary captions and status verses.`,
  };

  return [
    'You are Sukhan AI, a master Ustad of Urdu poetry, Roman Urdu shayari, and Hindi kavita.',
    langGuide,
    formGuide[req.form] || formGuide.ghazal,
    `Emotional Mood: ${req.mood}.`,
    req.radif ? `Mandatory Radif (exact ending refrain phrase): "${req.radif}".` : '',
    req.qafiya ? `Suggested Qafiya rhyme sound/words: "${req.qafiya}".` : '',
    req.takhallus ? `If including a Maqta (final couplet), weave in the poet pen-name (Takhallus): "${req.takhallus}".` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function generatePoemWithCascade(req: ComposeRequest): Promise<GeneratedPoem> {
  const { language: resolvedLang, scriptDirection } = resolveLanguage(
    req.language,
    req.prompt,
    req.radif
  );
  const coupletCount = getTargetCoupletCount(req.form, req.length);
  const ai = getGenAIClient();

  if (!ai) {
    return buildFallbackPoem(req);
  }

  const systemInstruction = buildSystemInstruction(req, resolvedLang, coupletCount);
  const finalPrompt = `Poetic Prompt / Theme: "${req.prompt}"${
    req.refinementInstruction ? `\nRefinement: "${req.refinementInstruction}"` : ''
  }`;

  const modelsToTry = [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  ];

  for (const modelSpec of modelsToTry) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelSpec.id,
          contents: finalPrompt,
          config: {
            systemInstruction,
            temperature: 0.85,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                radifUsed: { type: Type.STRING },
                qafiyaUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
                bahrNote: { type: Type.STRING },
                craftCommentary: { type: Type.STRING },
                couplets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      line1: { type: Type.STRING },
                      line2: { type: Type.STRING },
                      transliteration: { type: Type.STRING },
                      translation: { type: Type.STRING },
                    },
                    required: ['line1', 'line2', 'translation'],
                  },
                },
                glossary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      meaning: { type: Type.STRING },
                      origin: { type: Type.STRING },
                    },
                    required: ['word', 'meaning'],
                  },
                },
              },
              required: ['title', 'couplets', 'glossary'],
            },
          },
        }),
        15000
      );

      const rawJson = response.text?.trim();
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.couplets) && parsed.couplets.length > 0) {
          const couplets = parsed.couplets.map((c: any, idx: number) => ({
            id: `sher-${idx + 1}`,
            lines: [String(c.line1 || '').trim(), String(c.line2 || '').trim()].filter(Boolean),
            transliteration: c.transliteration ? String(c.transliteration).trim() : undefined,
            translation: c.translation ? String(c.translation).trim() : undefined,
          }));
          const fullText = couplets.map((c: any) => c.lines.join('\n')).join('\n\n');
          const analysis = analyzeRadifAndQafiya(couplets, req.radif || parsed.radifUsed);

          return {
            id: `poem-${Date.now()}`,
            title: parsed.title || 'Sukhan-e-Dil',
            subtitle: parsed.subtitle || `Composed in ${req.form} form`,
            language: resolvedLang,
            scriptDirection,
            form: req.form,
            mood: req.mood,
            style: req.style,
            length: req.length,
            couplets,
            fullText,
            radifUsed: parsed.radifUsed || analysis.detectedRadif || req.radif,
            qafiyaUsed:
              Array.isArray(parsed.qafiyaUsed) && parsed.qafiyaUsed.length > 0
                ? parsed.qafiyaUsed
                : analysis.detectedQafiya,
            bahrNote: parsed.bahrNote || 'Bahr-e-Hazaj / Classical Meter',
            craftCommentary:
              parsed.craftCommentary ||
              `Crafted in ${req.style.replace('_', ' ')} tradition with ${req.mood} resonance.`,
            glossary: Array.isArray(parsed.glossary) ? parsed.glossary : [],
            providerUsed: modelSpec.label,
            isFallback: false,
            createdAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Try next model in cascade
    }
  }

  return buildFallbackPoem(req);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));

  // Enable CORS so the Capacitor Android APK (https://localhost / capacitor://localhost)
  // can communicate seamlessly with the hosted backend API endpoints.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Public liveness/configuration endpoint used to verify Cloud Run deployments.
  app.get('/api/health', (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const aiConfigured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    res.status(200).json({
      ok: true,
      service: 'sukhan-ai-api',
      aiConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/search', async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 300);
    if (!q) { res.status(400).json({ error: 'A search query is required.' }); return; }
    const results = await searchDuckDuckGo(q);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ query: q, provider: 'DuckDuckGo', results, count: results.length });
  });

  // ============================================================================
  // 1. PERSISTENT SERVER CHAT HISTORY API (User-isolated by ownerId)
  // ============================================================================
  app.get('/api/chats', (req, res) => {
    const ownerId = String(req.query.ownerId || 'guest').trim() || 'guest';
    const dbData = readServerDb();
    if (!dbData.chatsByOwner[ownerId]) {
      dbData.chatsByOwner[ownerId] = ownerId === 'guest' ? INITIAL_SEED_CHATS : [];
      writeServerDb(dbData);
    }
    res.json({ chats: dbData.chatsByOwner[ownerId] });
  });

  app.post('/api/chats/sync', (req, res) => {
    const ownerId = String(req.body?.ownerId || 'guest').trim() || 'guest';
    const chats = req.body?.chats;
    if (!Array.isArray(chats)) {
      res.status(400).json({ error: 'chats array is required' });
      return;
    }
    const dbData = readServerDb();
    dbData.chatsByOwner[ownerId] = chats;
    writeServerDb(dbData);
    res.json({ ok: true, count: chats.length });
  });

  // ============================================================================
  // 2. CONVERSATIONAL STREAMING & UNARY AI ENDPOINTS
  // ============================================================================
  app.post('/api/chat/stream', async (req, res) => {
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const settings: Partial<UserSettings> = req.body?.settings || {};
    const useWebResearch = Boolean(req.body?.useWebResearch || settings?.enableWebGrounding);

    if (rawMessages.length === 0) {
      res.status(400).json({ error: 'Please enter a message to start the conversation.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const lastUserMsg =
      [...rawMessages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const prevAssistantMsg =
      [...rawMessages].reverse().find((m: any) => m.role === 'assistant')?.content || '';
    const hasPrevPoem = /\[VERSE\]/i.test(prevAssistantMsg);
    const userIntent = detectUserIntent(String(lastUserMsg), hasPrevPoem);

    const ai = getGenAIClient();
    const systemInstruction = buildChatSystemInstruction(settings, userIntent);
    const formattedContents = formatMultiTurnContents(
      rawMessages.slice(-16).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      }))
    );

    let finalReplyText = '';
    let finalGroundingSources: GroundingSource[] = [];
    let providerUsed = 'Sukhan Conversational Engine';

    if (ai) {
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      for (const modelId of modelsToTry) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: modelId,
              contents: formattedContents,
              config: {
                systemInstruction,
                temperature: 0.75,
                ...(useWebResearch ? { tools: [{ googleSearch: {} }] } : {}),
              },
            }),
            7500
          );

          const text = response.text?.trim();
          if (text) {
            finalReplyText =
              userIntent === 'greeting'
                ? text.replace(/\[\/?VERSE\]/gi, '')
                : text;
            providerUsed = modelId;
            const chunks =
              response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (Array.isArray(chunks)) {
              for (const c of chunks) {
                if (c?.web?.uri && c?.web?.title) {
                  if (!finalGroundingSources.some((g) => g.uri === c.web.uri)) {
                    finalGroundingSources.push({
                      title: c.web.title,
                      uri: c.web.uri,
                    });
                  }
                }
              }
            }
            break;
          }
        } catch {
          // Try next model in cascade
        }
      }
    }

    if (!finalReplyText && useWebResearch) {
      const results = await searchDuckDuckGo(String(lastUserMsg));
      if (results.length) {
        finalGroundingSources = results.map((item) => ({ title: item.title, uri: item.url }));
        finalReplyText = 'DuckDuckGo web results for your query:' + String.fromCharCode(10, 10) + results.map((item, index) => (index + 1) + '. ' + item.title + String.fromCharCode(10) + item.url).join(String.fromCharCode(10, 10));
        providerUsed = 'DuckDuckGo Web Search (free)';
      }
    }
    if (!finalReplyText) {
      finalReplyText = buildContextualChatReply(rawMessages, settings);
    }

    // Stream tokens smoothly to the client over SSE
    const tokens = finalReplyText.split(/(?<=\s)/);
    let accumulated = '';
    for (let i = 0; i < tokens.length; i += 5) {
      const slice = tokens.slice(i, i + 5).join('');
      accumulated += slice;
      res.write(`data: ${JSON.stringify({ text: slice })}\n\n`);
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
        fullText: accumulated,
        groundingSources:
          finalGroundingSources.length > 0 ? finalGroundingSources : undefined,
        provider: providerUsed,
      })}\n\n`
    );
    res.end();
  });

  app.post('/api/chat/message', async (req, res) => {
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const settings: Partial<UserSettings> = req.body?.settings || {};
    const useWebResearch = Boolean(req.body?.useWebResearch || settings?.enableWebGrounding);

    if (rawMessages.length === 0) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const lastUserMsg =
      [...rawMessages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const prevAssistantMsg =
      [...rawMessages].reverse().find((m: any) => m.role === 'assistant')?.content || '';
    const hasPrevPoem = /\[VERSE\]/i.test(prevAssistantMsg);
    const userIntent = detectUserIntent(String(lastUserMsg), hasPrevPoem);

    const ai = getGenAIClient();
    const systemInstruction = buildChatSystemInstruction(settings, userIntent);
    const formattedContents = formatMultiTurnContents(
      rawMessages.slice(-16).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      }))
    );

    if (ai) {
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      for (const modelId of modelsToTry) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: modelId,
              contents: formattedContents,
              config: {
                systemInstruction,
                temperature: 0.8,
                ...(useWebResearch ? { tools: [{ googleSearch: {} }] } : {}),
              },
            }),
            12000
          );
          if (response.text?.trim()) {
            const groundingSources: GroundingSource[] = [];
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (Array.isArray(chunks)) {
              for (const c of chunks) {
                if (c?.web?.uri && c?.web?.title) {
                  groundingSources.push({ title: c.web.title, uri: c.web.uri });
                }
              }
            }
            res.json({
              reply: response.text.trim(),
              groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
              provider: modelId,
            });
            return;
          }
        } catch {
          // Try next model
        }
      }
    }

    const fallbackReply = buildContextualChatReply(rawMessages, settings);
    res.json({
      reply: fallbackReply,
      provider: 'Sukhan Conversational Engine',
    });
  });

  // ============================================================================
  // 3. POETIC STUDIO & RECITATION ENDPOINTS
  // ============================================================================
  app.post('/api/poetry/compose', async (req, res) => {
    try {
      const validation = validateComposeRequest(req.body || {});
      if (!validation.valid || !validation.normalized) {
        res.status(400).json({ error: validation.error || 'Invalid request' });
        return;
      }

      const poem = await generatePoemWithCascade(validation.normalized);
      res.json({ poem });
    } catch {
      const fallback = buildFallbackPoem({
        prompt: req.body?.prompt || 'Ishq aur khamoshi',
        language: req.body?.language || 'auto',
        form: req.body?.form || 'ghazal',
        mood: req.body?.mood || 'ishq',
        length: req.body?.length || 'medium',
        style: req.body?.style || 'classical',
        radif: req.body?.radif,
      });
      res.json({ poem: fallback });
    }
  });

  app.post('/api/poetry/suggest-radif', async (req, res) => {
    const prompt = String(req.body?.prompt || 'shaam aur yaad').trim();
    const language = req.body?.language || 'auto';
    const { language: resolvedLang } = resolveLanguage(language, prompt);

    const defaultSuggestions =
      resolvedLang === 'urdu'
        ? [
            { radif: 'ہے ابھی', qafiya: 'سفر، اثر، سحر، نظر', mood: 'Longing & Hope' },
            { radif: 'رہ گئی', qafiya: 'بات، رات، برسات، ذات', mood: 'Nostalgia' },
            { radif: 'پھر بھی', qafiya: 'خواب، سراب، گلاب، حساب', mood: 'Resilience' },
            { radif: 'نہیں آتا', qafiya: 'قرار، اعتبار، بہار، شمار', mood: 'Hijr' },
          ]
        : resolvedLang === 'hindi'
        ? [
            { radif: 'अभी बाकी है', qafiya: 'सफ़र, असर, सहर, डगर', mood: 'Hope & Longing' },
            { radif: 'रह गई', qafiya: 'बात, रात, बरसात, सौगात', mood: 'Nostalgia' },
            { radif: 'चुपचाप', qafiya: 'ढलना, जलना, चलना, पिघलना', mood: 'Introspection' },
            { radif: 'कोई तो हो', qafiya: 'अपना, सपना, झरना, गहना', mood: 'Tenderness' },
          ]
        : [
            { radif: 'hai abhi', qafiya: 'safar, asar, sahar, nazar', mood: 'Longing & Hope' },
            { radif: 'reh gayi', qafiya: 'baat, raat, barsaat, zaat', mood: 'Nostalgia' },
            { radif: 'hi sahi', qafiya: 'ranjish, bandish, koshish, khwahish', mood: 'Classical Grace' },
            { radif: 'aur bhi hain', qafiya: 'imkaan, aasman, jahaan, imtihaan', mood: 'Philosophical' },
          ];

    res.json({ suggestions: defaultSuggestions });
  });

  app.post('/api/poetry/recite', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'No poem text provided for recitation.' });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error: 'Server audio recitation unavailable; using browser voice synthesis.',
        useBrowserFallback: true,
      });
      return;
    }

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Read this text aloud as a natural, expressive South Asian poetry recitation. Preserve the exact original language and script; do not translate, summarize, or add words. Use clear Urdu/Hindustani pronunciation, gentle warmth, measured Mushaira cadence, and a short pause between couplets or lines. Avoid a robotic, rushed, or overly theatrical delivery.\n\n${text}`,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Aoede' },
              },
            },
          },
        }),
        10000
      );

      const audioPart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = audioPart?.data;
      if (base64Audio) {
        // Gemini TTS commonly returns raw 16-bit little-endian PCM (24 kHz mono),
        // not a WAV container. Wrap PCM bytes in a WAV header before sending it
        // to HTMLAudioElement; labelling raw PCM as audio/wav makes playback fail.
        const sourceMimeType = String(audioPart?.mimeType || '').toLowerCase();
        const pcm = Buffer.from(base64Audio, 'base64');
        if (sourceMimeType.includes('audio/l16') || sourceMimeType.includes('pcm')) {
          const sampleRateMatch = sourceMimeType.match(/rate=(\\d+)/);
          const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : 24000;
          const channelsMatch = sourceMimeType.match(/channels=(\\d+)/);
          const channels = channelsMatch ? Number(channelsMatch[1]) : 1;
          const bitsPerSample = 16;
          const blockAlign = channels * bitsPerSample / 8;
          const wav = Buffer.alloc(44 + pcm.length);
          wav.write('RIFF', 0);
          wav.writeUInt32LE(36 + pcm.length, 4);
          wav.write('WAVE', 8);
          wav.write('fmt ', 12);
          wav.writeUInt32LE(16, 16);
          wav.writeUInt16LE(1, 20);
          wav.writeUInt16LE(channels, 22);
          wav.writeUInt32LE(sampleRate, 24);
          wav.writeUInt32LE(sampleRate * blockAlign, 28);
          wav.writeUInt16LE(blockAlign, 32);
          wav.writeUInt16LE(bitsPerSample, 34);
          wav.write('data', 36);
          wav.writeUInt32LE(pcm.length, 40);
          pcm.copy(wav, 44);
          res.json({ audioBase64: wav.toString('base64'), mimeType: 'audio/wav' });
        } else {
          // Preserve formats that already carry their own container.
          res.json({ audioBase64: base64Audio, mimeType: sourceMimeType || 'audio/wav' });
        }
        return;
      }
      res.status(503).json({
        error: 'Audio stream empty; falling back to local recitation.',
        useBrowserFallback: true,
      });
    } catch {
      res.status(503).json({
        error: 'Audio model busy; falling back to local recitation.',
        useBrowserFallback: true,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sukhan AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
