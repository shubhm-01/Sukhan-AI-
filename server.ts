import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { AccessToken, LiveKitAPI } from 'livekit-server-sdk';
import { applicationDefault, cert, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
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
      liveVoiceConfigured: Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
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

  // Legacy unauthenticated ownerId-based endpoints are retired.
  // Guests use localStorage; signed-in users use the existing owner-checked Firestore rules.
  app.get('/api/chats', (_req, res) => {
    res.status(410).json({ error: 'This legacy endpoint is retired. Use local chat storage or authenticated Firestore sync.' });
  });
  app.post('/api/chats/sync', (_req, res) => {
    res.status(410).json({ error: 'This legacy endpoint is retired. Use authenticated Firestore sync.' });
  });

  // In-memory per-process rate limit. Use an API gateway for shared limits at scale.
  const requestLimits = new Map<string, { windowStart: number; count: number }>();
  function allowRequest(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const previous = requestLimits.get(key);
    if (!previous || now - previous.windowStart >= windowMs) {
      requestLimits.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (previous.count >= limit) return false;
    previous.count += 1;
    return true;
  }

  let adminAuth: ReturnType<typeof getFirebaseAdminAuth> | null = null;
  function getAdminAuthService() {
    if (adminAuth) return adminAuth;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'storied-hawk-tn50x';
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    const credential = serviceAccountJson
      ? cert(JSON.parse(serviceAccountJson))
      : applicationDefault();
    const existing = getAdminApps().find((item) => item.name === 'sukhan-api');
    const adminApp = existing || initializeAdminApp({ credential, projectId }, 'sukhan-api');
    adminAuth = getFirebaseAdminAuth(adminApp);
    return adminAuth;
  }

  const ALLOWED_EDGE_VOICES = new Set([
    'ur-PK-UzmaNeural', 'ur-PK-AsadNeural', 'ur-IN-GulNeural', 'ur-IN-SalmanNeural',
    'hi-IN-SwaraNeural', 'hi-IN-MadhurNeural',
    'en-IN-NeerjaNeural', 'en-IN-PrabhatNeural',
  ]);

  app.post('/api/livekit/token', async (req, res) => {
    const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
    if (!allowRequest(`livekit-ip:${ip}`, 20, 60_000)) {
      res.status(429).json({ error: 'Too many live voice connection attempts. Try again in a minute.' });
      return;
    }

    const authorization = String(req.headers.authorization || '');
    const idToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!idToken) {
      res.status(401).json({ error: 'Sign in is required to start a live voice session.' });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await getAdminAuthService().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Your sign-in session could not be verified. Sign in again and retry.' });
      return;
    }
    if (decodedToken.email_verified !== true) {
      res.status(403).json({ error: 'Verify your account email before starting Live Voice.' });
      return;
    }
    if (!allowRequest(`livekit-user:${decodedToken.uid}`, 8, 60_000)) {
      res.status(429).json({ error: 'You have started too many live sessions. Please wait a minute.' });
      return;
    }

    const liveKitUrl = process.env.LIVEKIT_URL?.trim() || '';
    const liveKitKey = process.env.LIVEKIT_API_KEY?.trim() || '';
    const liveKitSecret = process.env.LIVEKIT_API_SECRET?.trim() || '';
    if (!liveKitUrl || !liveKitKey || !liveKitSecret) {
      res.status(503).json({ error: 'LiveKit is not configured on the backend yet. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.' });
      return;
    }

    const agentName = process.env.LIVEKIT_AGENT_NAME?.trim() || 'sukhan-live';
    const requestedLanguage = String(req.body?.language || 'auto').toLowerCase();
    const language = requestedLanguage.startsWith('hi') ? 'hi'
      : requestedLanguage.startsWith('en') ? 'en'
      : requestedLanguage === 'auto' ? 'auto' : 'ur';
    const requestedVoice = String(req.body?.voice || 'auto');
    const voice = requestedVoice === 'auto' || ALLOWED_EDGE_VOICES.has(requestedVoice)
      ? requestedVoice : 'auto';
    const roomName = `sukhan-${decodedToken.uid.slice(0, 10)}-${randomUUID().slice(0, 8)}`;
    const identity = `listener-${decodedToken.uid.slice(0, 10)}-${randomUUID().slice(0, 8)}`;

    try {
      const apiHost = liveKitUrl.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
      const liveKitApi = new LiveKitAPI({ host: apiHost, apiKey: liveKitKey, secret: liveKitSecret });
      await liveKitApi.agentDispatch.createDispatch(roomName, agentName, {
        metadata: JSON.stringify({ voice, language }),
      });

      const accessToken = new AccessToken(liveKitKey, liveKitSecret, {
        identity,
        name: decodedToken.name || 'Sukhan AI Listener',
        ttl: '10m',
      });
      accessToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      const token = await accessToken.toJwt();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ serverUrl: liveKitUrl, token, roomName });
    } catch (error) {
      console.error('[Sukhan LiveKit] Token/dispatch failed:', error);
      res.status(503).json({ error: 'Could not start the live voice agent. Check that the LiveKit project and sukhan-live worker are running.' });
    }
  });

  app.post('/api/poetry/recite', async (req, res) => {
    const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
    if (!allowRequest(`recite:${ip}`, 18, 60_000)) {
      res.status(429).json({ error: 'Too many read-aloud requests. Please wait a minute.' });
      return;
    }
    const text = String(req.body?.text || '').trim();
    if (!text || text.length > 6000) {
      res.status(400).json({ error: 'Poem text must contain between 1 and 6,000 characters.' });
      return;
    }
    const requestedVoice = String(req.body?.voice || 'ur-PK-UzmaNeural');
    const voice = requestedVoice === 'auto' || ALLOWED_EDGE_VOICES.has(requestedVoice)
      ? requestedVoice : 'ur-PK-UzmaNeural';

    const child = spawn('python3', [path.join(__dirname, 'scripts', 'edge-tts.py')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    const audioChunks: Buffer[] = [];
    let totalBytes = 0;
    let errorText = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, 25_000);
    child.stdout.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > 24 * 1024 * 1024) {
        child.kill('SIGKILL');
        return;
      }
      audioChunks.push(Buffer.from(chunk));
    });
    child.stderr.on('data', (chunk: Buffer) => {
      errorText = (errorText + chunk.toString()).slice(-4000);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(503).json({ error: 'The server neural voice service could not start.', detail: error.message });
      }
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (res.headersSent || res.writableEnded) return;
      const audio = Buffer.concat(audioChunks);
      if (timedOut) {
        res.status(504).json({ error: 'Voice generation timed out. Try a shorter poem.' });
      } else if (code !== 0 || !audio.length) {
        console.warn('[Sukhan Edge TTS]', errorText);
        res.status(503).json({ error: 'Neural voice generation failed. The online speech service may be unavailable.' });
      } else {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(audio);
      }
    });
    req.on('aborted', () => child.kill('SIGKILL'));
    child.stdin.end(JSON.stringify({ text, voice }));
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
