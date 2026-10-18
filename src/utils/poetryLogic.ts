export type PoetryLanguage = 'auto' | 'urdu' | 'roman_urdu' | 'hindi';
export type ResolvedLanguage = Exclude<PoetryLanguage, 'auto'>;

export type PoetryForm =
  | 'ghazal'
  | 'shayari'
  | 'nazm'
  | 'qita'
  | 'caption';

export type PoetryMood =
  | 'ishq'
  | 'hijr'
  | 'tasawwuf'
  | 'melancholy'
  | 'hope'
  | 'inkilaab'
  | 'nostalgia';

export type PoetryLength = 'short' | 'medium' | 'long';

export type WritingStyle =
  | 'classical'
  | 'modern_literary'
  | 'minimal_contemporary'
  | 'sufi_mystic'
  | 'revolutionary';

export interface ComposeRequest {
  prompt: string;
  language: PoetryLanguage;
  form: PoetryForm;
  mood: PoetryMood;
  length: PoetryLength;
  style: WritingStyle;
  radif?: string;
  qafiya?: string;
  takhallus?: string;
  useWebResearch?: boolean;
  sessionId?: string;
  refinementInstruction?: string;
  previousPoem?: GeneratedPoem;
}

export interface PoemCouplet {
  id: string;
  lines: string[];
  transliteration?: string;
  translation?: string;
}

export interface GlossaryItem {
  word: string;
  meaning: string;
  origin?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GeneratedPoem {
  id: string;
  title: string;
  subtitle?: string;
  language: ResolvedLanguage;
  scriptDirection: 'rtl' | 'ltr';
  form: PoetryForm;
  mood: PoetryMood;
  style: WritingStyle;
  length: PoetryLength;
  couplets: PoemCouplet[];
  fullText: string;
  radifUsed?: string;
  qafiyaUsed?: string[];
  bahrNote?: string;
  craftCommentary?: string;
  glossary: GlossaryItem[];
  groundingSources?: GroundingSource[];
  providerUsed: string;
  isFallback?: boolean;
  createdAt: string;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'poet';
  userPrompt: string;
  isRefinement?: boolean;
  poem?: GeneratedPoem;
  timestamp: string;
}

export interface PoetrySession {
  id: string;
  title: string;
  updatedAt: string;
  language: ResolvedLanguage;
  form: PoetryForm;
  turns: ConversationTurn[];
}

export interface LexiconEntry {
  word: string;
  urduScript: string;
  hindiScript: string;
  meaning: string;
  usageNote: string;
  category: 'Emotion' | 'Nature' | 'Mysticism' | 'Classical';
  sampleRadif: string;
}

// Conversational Chat Models (matching firebase-blueprint.json constraints)
export type MessageFeedback = 'none' | 'up' | 'down';

export interface ChatMessageItem {
  id: string;
  chatId: string;
  ownerId: string;
  role: 'user' | 'assistant';
  content: string;
  feedback: MessageFeedback;
  createdAt: string;
  updatedAt: string;
  isStreaming?: boolean;
  isError?: boolean;
  groundingSources?: GroundingSource[];
}

export interface ChatThread {
  id: string;
  ownerId: string;
  title: string;
  saved: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageItem[];
}

export interface UserSettings {
  theme: 'dark' | 'light';
  defaultScript: PoetryLanguage;
  poeticStyle: WritingStyle;
  showTranslations: boolean;
  enableWebGrounding: boolean;
}

export interface MessageSegment {
  type: 'prose' | 'poetry';
  text: string;
  lines: string[];
  scriptDirection: 'rtl' | 'ltr';
  detectedLang: ResolvedLanguage;
}

const URDU_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;

const ROMAN_URDU_MARKERS = new Set([
  'ishq', 'dil', 'sham', 'shaam', 'yaad', 'mohabbat', 'muhabbat', 'zindagi',
  'khamoshi', 'safar', 'tishnagi', 'hijr', 'visaal', 'wisaal', 'hai', 'hain',
  'mein', 'teri', 'tera', 'mera', 'meri', 'ashk', 'ghazal', 'shayari', 'dard',
  'junoon', 'raat', 'khwab', 'khwaab', 'aankh', 'nigah', 'sabr', 'sukoon',
  'chahat', 'bewafa', 'wafa', 'mehfil', 'tanhai', 'parwana', 'shama', 'falak',
  'zameen', 'aasman', 'kisi', 'koi', 'nahi', 'nahin', 'bhi', 'toh', 'aur',
  'se', 'ko', 'ki', 'ka', 'ke', 'hum', 'tum', 'wo', 'woh', 'abhi', 'phir',
  'sahar', 'dareecha', 'reh', 'gayi', 'gaya', 'kuch', 'magar', 'aangan'
]);

const HINDI_ROMAN_MARKERS = new Set([
  'prem', 'virah', 'man', 'nayan', 'sapna', 'jeevan', 'kavita', 'sansar',
  'hriday', 'geet', 'prana', 'chhaya', 'deepak', 'anjuri', 'smriti', 'vedna'
]);

export function detectLanguageAndScript(text: string): {
  detected: ResolvedLanguage;
  scriptDirection: 'rtl' | 'ltr';
  confidence: 'high' | 'medium';
  label: string;
} {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      detected: 'roman_urdu',
      scriptDirection: 'ltr',
      confidence: 'medium',
      label: 'Roman Urdu (Default)',
    };
  }

  let urduCount = 0;
  let hindiCount = 0;

  for (const ch of trimmed) {
    if (URDU_SCRIPT_REGEX.test(ch)) urduCount++;
    if (DEVANAGARI_SCRIPT_REGEX.test(ch)) hindiCount++;
  }

  if (urduCount > 0 && urduCount >= hindiCount) {
    return {
      detected: 'urdu',
      scriptDirection: 'rtl',
      confidence: 'high',
      label: 'Urdu Script (اردو)',
    };
  }

  if (hindiCount > 0) {
    return {
      detected: 'hindi',
      scriptDirection: 'ltr',
      confidence: 'high',
      label: 'Hindi Devanagari (हिन्दी)',
    };
  }

  const tokens = trimmed
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let romanUrduHits = 0;
  let hindiRomanHits = 0;

  for (const token of tokens) {
    if (ROMAN_URDU_MARKERS.has(token)) romanUrduHits++;
    if (HINDI_ROMAN_MARKERS.has(token)) hindiRomanHits++;
  }

  if (hindiRomanHits > romanUrduHits && hindiRomanHits >= 1) {
    return {
      detected: 'hindi',
      scriptDirection: 'ltr',
      confidence: 'medium',
      label: 'Hindi (Detected from theme)',
    };
  }

  return {
    detected: 'roman_urdu',
    scriptDirection: 'ltr',
    confidence: romanUrduHits > 0 ? 'high' : 'medium',
    label: romanUrduHits > 0 ? 'Roman Urdu (Detected)' : 'Roman Urdu',
  };
}

export function resolveLanguage(
  selected: PoetryLanguage,
  promptText: string,
  radifText?: string
): { language: ResolvedLanguage; scriptDirection: 'rtl' | 'ltr' } {
  if (selected !== 'auto') {
    return {
      language: selected,
      scriptDirection: selected === 'urdu' ? 'rtl' : 'ltr',
    };
  }
  const combined = `${promptText} ${radifText || ''}`.trim();
  const det = detectLanguageAndScript(combined);
  return {
    language: det.detected,
    scriptDirection: det.scriptDirection,
  };
}

export function deriveChatTitle(firstUserMessage: string): string {
  const cleaned = (firstUserMessage || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'New Literary Conversation';
  if (cleaned.length <= 44) return cleaned;
  return `${cleaned.slice(0, 41).trim()}...`;
}

export function sanitizeId(id: string): string {
  const cleaned = (id || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120);
  return cleaned || `id-${Date.now()}`;
}

export function segmentMessageContent(content: string): MessageSegment[] {
  const raw = (content || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];

  // Support explicit [VERSE]...[/VERSE] or ```poetry ... ``` fences as well as natural couplet detection
  const normalized = raw
    .replace(/```(?:poetry|urdu|shayari|ghazal|hindi|verse)?\n([\s\S]*?)```/gi, '[VERSE]\n$1\n[/VERSE]');

  const parts = normalized.split(/(\[VERSE\][\s\S]*?\[\/VERSE\])/gi);
  const segments: MessageSegment[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (/^\[VERSE\]/i.test(trimmed)) {
      const inner = trimmed
        .replace(/^\[VERSE\]/i, '')
        .replace(/\[\/VERSE\]$/i, '')
        .trim();
      if (inner) {
        const det = detectLanguageAndScript(inner);
        segments.push({
          type: 'poetry',
          text: inner,
          lines: inner.split('\n').map((l) => l.trim()),
          scriptDirection: det.scriptDirection,
          detectedLang: det.detected,
        });
      }
      continue;
    }

    // Split remaining blocks by double newline and classify poetry vs prose
    const paragraphs = trimmed.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const pTrim = para.trim();
      if (!pTrim) continue;
      const lines = pTrim.split('\n').map((l) => l.replace(/^>\s*/, '').trim()).filter(Boolean);
      const det = detectLanguageAndScript(pTrim);

      const isBlockquote = pTrim.startsWith('>');
      const isShortCoupletLines =
        lines.length >= 2 &&
        lines.length <= 8 &&
        lines.every((l) => l.length <= 95 && !l.startsWith('- ') && !l.startsWith('* ') && !/^\d+\./.test(l)) &&
        (det.detected === 'urdu' ||
          det.detected === 'hindi' ||
          det.confidence === 'high' ||
          isBlockquote);

      if (isShortCoupletLines) {
        segments.push({
          type: 'poetry',
          text: lines.join('\n'),
          lines,
          scriptDirection: det.scriptDirection,
          detectedLang: det.detected,
        });
      } else {
        segments.push({
          type: 'prose',
          text: pTrim,
          lines,
          scriptDirection: det.scriptDirection,
          detectedLang: det.detected,
        });
      }
    }
  }

  return segments;
}

export type UserChatIntent =
  | 'greeting'
  | 'poetry_refinement'
  | 'poetry_request'
  | 'literary_question'
  | 'general_chat';

const POETRY_TRIGGER_REGEX =
  /\b(shayari|shairi|ghazal|gazal|nazm|nazam|sher|ashar|ash'ar|couplet|couplets|poem|poetry|verse|verses|kavita|qita|rubai|marsia|marsiya|tashreeh|radif|qafiya|bahr|matla|maqta|misra|geet|lyrics|stanza|likho|likh\s+do|likhiye|sunao|suna\s+do|sunaiye|compose|write\s+a\s+poem|write\s+a\s+ghazal|write\s+shayari|write\s+lines|poetic\s+caption)\b|غزل|شاعری|شعر|اشعار|نظم|قطعہ|قصیدہ|مرثیہ|ردیف|قافیہ|شاعرانہ|کلام|لکھو|لکھیں|سناؤ|سنائیں|شاعری\s+سناؤ|غزل\s+لکھیں|कविता|शायरी|ग़ज़ल|गजलों|गजल|नज़्म|शेर|छंद|पंक्तियाँ|सुनाओ|लिखो|लिखिए/i;

const REFINEMENT_TRIGGER_REGEX =
  /\b(sadder|more\s+melanchol|udaas|last\s+line|second\s+line|first\s+line|change\s+the\s+line|modify|rewrite|translate|in\s+roman|roman\s+urdu|urdu\s+script|in\s+urdu|in\s+hindi|devanagari|explain\s+this|meaning\s+of\s+this|tashreeh|continue\s+this|more\s+couplet|aur\s+sher|add\s+a\s+couplet|make\s+it\s+shorter|make\s+it\s+longer)\b|اردو\s+میں|تشریح|مزید\s+اشعار|हिन्दी\s+में/i;

const GREETING_ONLY_REGEX =
  /^(hi+|hello+|hey+|heyy+|hlo+|hlw+|salam|assalam\s*o?\s*alaikum|wa\s*alaikum\s*assalam|adaab|aadab|namaste|namaskar|sat\s*sri\s*akal|good\s*(morning|afternoon|evening|night)|kaise\s*ho(\s*aap|\s*bhai|\s*yaar)?|kya\s*haal\s*(hai|chaal\s*hai)|how\s*are\s*you(\s*doing)?|what'?s\s*up|sup|yo|aur\s*batao|kya\s*chal\s*raha\s*hai|helloo+|hii+\s*kaise\s*ho)[!?.~\s]*$/i;

export function detectUserIntent(
  userMessage: string,
  prevAssistantMessage?: string
): UserChatIntent {
  const trimmed = (userMessage || '').trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) return 'general_chat';

  // 1. Pure greetings ("hi", "hii", "hello", "salam", "kaise ho", etc.)
  if (GREETING_ONLY_REGEX.test(trimmed)) {
    return 'greeting';
  }

  const prevHasPoetry = Boolean(
    prevAssistantMessage && /\[VERSE\]/i.test(prevAssistantMessage)
  );

  // 2. Contextual refinement of a poem in the previous turn
  if (prevHasPoetry && REFINEMENT_TRIGGER_REGEX.test(trimmed)) {
    return 'poetry_refinement';
  }

  // 3. Literary questions about poetic forms or poets (without asking to compose a new poem)
  if (
    /\b(what\s+is\s+a\s+ghazal|difference\s+between\s+ghazal\s+and\s+nazm|what\s+is\s+radif|what\s+is\s+qafiya|who\s+was\s+ghalib|who\s+is\s+jaun\s+elia|who\s+was\s+faiz|what\s+does\s+.*\s+mean)\b/i.test(
      lower
    ) &&
    !/\b(write|compose|likho|sunao)\b/i.test(lower)
  ) {
    return 'literary_question';
  }

  // 4. Explicit request to write/compose poetry, shayari, ghazal, nazm
  if (POETRY_TRIGGER_REGEX.test(trimmed)) {
    return 'poetry_request';
  }

  // 5. Everything else is normal conversation / general chat
  return 'general_chat';
}

export function buildContextualChatReply(
  messages: { role: 'user' | 'assistant'; content: string }[],
  settings?: Partial<UserSettings>
): string {
  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const prevAssistantMsg =
    [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';

  const trimmed = lastUserMsg.trim();
  const lower = trimmed.toLowerCase();
  const det = detectLanguageAndScript(trimmed);
  const targetScript =
    settings?.defaultScript && settings.defaultScript !== 'auto'
      ? settings.defaultScript
      : det.detected;

  const intent = detectUserIntent(trimmed, prevAssistantMsg);

  // 1. GREETING INTENT — Natural, concise ChatGPT-like greeting (NO unsolicited poetry)
  if (intent === 'greeting') {
    if (det.detected === 'urdu') {
      return `آداب اور خوش آمدید! میں سخن AI ہوں۔ آپ مجھ سے کسی بھی موضوع پر عام گفتگو کر سکتے ہیں، سوالات پوچھ سکتے ہیں، یا جب آپ چاہیں تو اردو، رومن اردو یا ہندی میں غزل، شاعری اور نظم لکھوا سکتے ہیں۔ آج میں آپ کی کیا مدد کروں؟`;
    }
    if (det.detected === 'hindi') {
      return `नमस्ते! मैं सुखन AI हूँ। आप मुझसे किसी भी विषय पर सामान्य बातचीत कर सकते हैं, सवाल पूछ सकते हैं, और जब आपका मन हो तो ग़ज़ल, शायरी या कविता भी लिखवा सकते हैं। बताइए, आज हम किस विषय पर बात करें?`;
    }
    if (/\b(kaise\s*ho|kya\s*haal|aur\s*batao|salam|adaab|namaste)\b/i.test(lower)) {
      return `Main bilkul theek hoon, shukriya! Aap bataiye, aaj kya chal raha hai? Aap mujhse kisi bhi topic par normal baat kar sakte hain, koi sawal pooch sakte hain, ya jab aap kahein tab shayari aur ghazal bhi likhwa sakte hain.`;
    }
    return `Hello! How are you doing today? Feel free to chat with me about anything, ask questions, brainstorm ideas, or let me know whenever you'd like to compose or explore poetry.`;
  }

  // 2. POETRY REFINEMENT INTENT — Only when previous turn had a poem
  if (intent === 'poetry_refinement' && prevAssistantMsg) {
    if (
      lower.includes('sadder') ||
      lower.includes('more melanchol') ||
      lower.includes('udaas') ||
      lower.includes('dard') ||
      lower.includes('hijr')
    ) {
      if (targetScript === 'urdu') {
        return `یہ لیجیے، اسی خیال کو مزید گہرے درد اور ہجر کی کیفیت میں ڈھالا گیا ہے:\n\n[VERSE]\nچراغ بجھ گئے لیکن دھواں سا باقی ہے\nترے بغیر بھی جینے کا امتحاں باقی ہے\n\nہماری آنکھ سے اوجھل ہوا ہے عکس ترا\nگزرتے ہوئے لمحوں میں اک نشاں باقی ہے\n[/VERSE]\n\nاس میں جدائی کے بعد کے سناٹے اور اداسی کو زیادہ گہرا کیا گیا ہے۔`;
      }
      return `Here is a deeper, more melancholic variation imbued with *hijr* (separation) and quiet sorrow:\n\n[VERSE]\nCharagh bujh gaye lekin dhuaan sa baaqi hai,\nTere baghair bhi jeene ka imtihaan baaqi hai.\n\nHamari aankh se ojhal hua hai aks tera,\nGuzarte hue lamhon mein ik nishaan baaqi hai.\n[/VERSE]\n\n*Translation:*\nThe lamps have gone out, yet a trace of smoke remains;\nEven without you, the trial of living remains.\nYour reflection has faded from my sight,\nYet in the passing moments, a quiet scar remains.`;
    }

    if (
      lower.includes('last line') ||
      lower.includes('second line') ||
      lower.includes('change the line') ||
      lower.includes('modify')
    ) {
      return `I have revised the closing line of the couplet so the cadence settles with greater emotional weight:\n\n[VERSE]\nKacche aangan mein dabe paaon utar aayi shaam,\nChhat ki mandeer pe thehri teri saughaat reh gayi.\n\nHum ne chaaha tha ke khamoshi hi keh de sab kuch,\nBujhte charaghon mein adhoori wo mulaqaat reh gayi.\n[/VERSE]\n\nNotice how the revised closing *misra* ("Bujhte charaghon mein adhoori wo mulaqaat reh gayi") anchors the imagery of fading oil lamps before the *radif* "reh gayi".`;
    }

    if (lower.includes('roman urdu') || lower.includes('in roman')) {
      return `Here is the verse rendered cleanly in **Roman Urdu** along with its poetic nuance:\n\n[VERSE]\nDil ke veeran dareechon mein teri yaad ka safar hai abhi,\nShaam-e-tanhai mein roshan wahi ik rahguzar hai abhi.\n\nHum ne chup chaap sahe hijr ke mausam lekin,\nTeri aawaz mein posheeda duaon ka asar hai abhi.\n[/VERSE]\n\n**Key Vocabulary:**\n- *Dareecha*: Casement window opening onto an inner courtyard\n- *Rahguzar*: Pathway or road of longing\n- *Posheeda*: Hidden, quietly preserved`;
    }

    if (lower.includes('urdu script') || lower.includes('in urdu') || lower.includes('اردو میں')) {
      return `یہ کلام مستند اردو رسم الخط (نستعلیق) میں پیش ہے:\n\n[VERSE]\nدل کے ویران دریچوں میں تری یاد کا سفر ہے ابھی\nشامِ تنہائی میں روشن وہی اک رہگزر ہے ابھی\n\nہم نے چپ چاپ سہے ہجر کے موسم لیکن\nتیری آواز میں پوشیدہ دعاؤں کا اثر ہے ابھی\n[/VERSE]\n\nاگر آپ کسی مصرعے میں تبدیلی یا مزید اشعار چاہتے ہیں تو ضرور بتائیے۔`;
    }

    if (lower.includes('in hindi') || lower.includes('devanagari') || lower.includes('हिन्दी')) {
      return `यहाँ यह रचना देवनागरी (हिन्दी) लिपि में प्रस्तुत है:\n\n[VERSE]\nदिल के वीरान दरीचों में तेरी याद का सफ़र अभी बाकी है,\nशाम-ए-तन्हाई में रोशन वही इक रहगुज़र अभी बाकी है।\n\nहमने चुपचाप सहे हिज्र के मौसम लेकिन,\nतेरी आवाज़ में पोशीदा दुआओं का असर अभी बाकी है।\n[/VERSE]\n\nआप चाहें तो हम इसमें और छंद जोड़ सकते हैं या इसकी भाषा को अधिक शुद्ध हिन्दी (काव्य) रूप दे सकते हैं।`;
    }

    if (
      lower.includes('explain') ||
      lower.includes('meaning') ||
      lower.includes('tashreeh') ||
      lower.includes('تشریح')
    ) {
      return `### Literary Explanation (Tashreeh)\n\nIn these verses, the poet contrasts outer desolation with inner endurance:\n\n1. **Imagery of the Courtyard & Casement (*Dareecha*)**: In classical Indo-Persian poetics, the *dareecha* (window) represents the threshold between the solitary self and the awaited beloved. Even when the house is quiet (*veeran*), memory keeps a single lamp lit along the road (*rahguzar*).\n2. **Restraint in Separation (*Hijr*)**: Rather than loud lamentation, the speaker practices *sabr* (dignified patience), finding solace in the lingering grace (*asar*) of unspoken prayers.\n3. **Poetic Craft (*Ilm-e-Arooz*)**: The recurring *radif* acts as an emotional refrain that returns each couplet to a state of quiet hope.`;
    }

    if (lower.includes('continue') || lower.includes('more couplet') || lower.includes('aur sher') || lower.includes('add')) {
      return `Continuing the thread with two more couplets (*ash’ar*) in the same meter and *radif*, culminating in a *maqta*:\n\n[VERSE]\nKhaak urti hai sar-e-dasht-e-tamanna har soo,\nPhir bhi aaina-e-dil mein tera aks-e-nazar hai abhi.\n\nHarf jalte hain charaghon ki tarah aye 'Sukhan',\nLauh-e-jaan par tere waadon ka sunehra hunar hai abhi.\n[/VERSE]\n\n*Translation:*\nDust rises across the wilderness of desire on every side,\nYet in the mirror of the heart, your reflection remains clear.\nWords burn like earthen lamps, O 'Sukhan';\nUpon the tablet of the soul, the golden craft of your promises endures.`;
    }
  }

  // 3. LITERARY QUESTION INTENT
  if (intent === 'literary_question') {
    return `### Understanding the Classical Ghazal vs. Nazm\n\nIn Urdu and Persian poetics, the **Ghazal** and the **Nazm** have distinct structural architectures:\n\n- **Ghazal (غزل)**: Composed of autonomous two-line couplets (*ash’ar*, singular *sher*). Each couplet is a complete, self-contained universe of thought, bound together strictly by meter (*Bahr*), rhyme (*Qafiya*), and a repeating refrain (*Radif*).\n  - **Matla (مطلع)**: The opening couplet where *both* lines end with the Qafiya + Radif (*AA*).\n  - **Maqta (مقطع)**: The final couplet where the poet weaves in their pen-name (*Takhallus*).\n- **Nazm (نظم)**: A unified poem written around a single continuous theme or narrative arc, where meaning flows sequentially from stanza to stanza.\n\nHere is an example of a classic *Matla* where **"safar"** and **"rahguzar"** are the *Qafiya*, and **"hai abhi"** is the *Radif*:\n\n[VERSE]\nDil ke veeran dareechon mein teri yaad ka safar hai abhi,\nShaam-e-tanhai mein roshan wahi ik rahguzar hai abhi.\n[/VERSE]\n\nWould you like to compose a ghazal or nazm on a topic of your choice?`;
  }

  // 4. GENERAL CONVERSATION INTENT — Never generate unsolicited ghazals/poems!
  if (intent === 'general_chat') {
    if (/^(who\s+are\s+you|what\s+can\s+you\s+do|help|introduce\s+yourself|tum\s+kaun\s+ho|aap\s+kya\s+kar\s+sakte\s+ho)/i.test(lower)) {
      return `I am **Sukhan AI**, a conversational AI assistant with a special mastery in Urdu, Roman Urdu, and Hindi literature.\n\nHere is how we can work together:\n- **Everyday Conversation & Questions**: Ask me anything—general knowledge, ideas, explanations, translations, or casual chat.\n- **Poetry on Demand (Only When You Ask)**: Whenever you ask me to write a *ghazal*, *shayari*, *nazm*, or *caption*, I will compose it in your preferred script (Urdu, Roman Urdu, or Hindi).\n- **Interactive Refinement**: Once we are working on a poem, you can ask me to change specific lines, adjust the mood, or explain couplets.\n\nWhat would you like to talk about or work on?`;
    }

    if (/^(thanks|thank\s+you|shukriya|dhanyawad|bohot\s+accha|nice|great|awesome|ok|okay|theek\s+hai|acha|accha)/i.test(lower)) {
      return `You're most welcome! Let me know if there's anything else you'd like to discuss, ask, or create.`;
    }

    if (det.detected === 'urdu') {
      return `جی بالکل! میں آپ کی بات سمجھ گیا۔ آپ اس بارے میں مزید جو بھی پوچھنا یا گفتگو کرنا چاہیں، بے جھجھک بتائیے۔ (اور جب آپ چاہیں کہ میں کسی موضوع پر اشعار یا غزل لکھوں تو مجھے ضرور بتائیے گا۔)`;
    }

    if (det.detected === 'hindi') {
      return `जी बिल्कुल! मैं आपकी बात समझ गया। आप जिस भी विषय पर आगे चर्चा करना चाहते हैं या कोई प्रश्न पूछना चाहते हैं, बेझिझक लिखिए। (जब आप चाहें कि मैं कोई कविता या शायरी लिखूँ, तो बस मुझे बता दीजिएगा।)`;
    }

    if (det.confidence === 'high') {
      return `Bilkul! Main aapki baat samajh gaya. Aap mujhse normal बातचीत kar sakte hain—main bina aapke kahe apne aap ghazal ya shayari generate nahi karunga. Jab aapko shayari, ghazal ya nazm chahiye ho, tabhi bataiyega. Boliye, abhi kis topic par baat karein?`;
    }

    return `I understand! We can talk about "${trimmed}" or any question you have in mind. I will only compose poetry or shayari when you explicitly ask me to. How can I help you with this today?`;
  }

  // 5. EXPLICIT POETRY REQUEST INTENT — User asked for a poem/ghazal/shayari/nazm!
  const fallbackPoem = buildFallbackPoem({
    prompt: trimmed || 'Ishq aur khamoshi',
    language: targetScript,
    form: lower.includes('nazm') ? 'nazm' : lower.includes('caption') ? 'caption' : 'ghazal',
    mood: 'ishq',
    length: 'medium',
    style: settings?.poeticStyle || 'classical',
  });

  const versesBlock = fallbackPoem.couplets
    .map((c) => c.lines.join('\n'))
    .join('\n\n');

  if (targetScript === 'urdu') {
    return `آپ کی فرمائش پر یہ کلام پیشِ خدمت ہے:\n\n[VERSE]\n${versesBlock}\n[/VERSE]\n\n**بحر اور فنی نوٹ:** ${fallbackPoem.bahrNote} — ردیف: *"${fallbackPoem.radifUsed}"*\n\nاگر آپ اس کا رومن اردو ترجمہ، کسی شعر کی تشریح، یا کسی مصرعے میں تبدیلی چاہتے ہیں تو بے جھجھک کہیے۔`;
  }

  if (targetScript === 'hindi') {
    return `आपके अनुरोध पर आधारित यह काव्य-रचना प्रस्तुत है:\n\n[VERSE]\n${versesBlock}\n[/VERSE]\n\n**शिल्प और रदीफ़:** रदीफ़ *"${fallbackPoem.radifUsed}"* · क़ाफ़िया: *${(fallbackPoem.qafiyaUsed || []).join(', ')}*\n\nयदि आप इसमें कोई पंक्ति बदलना चाहते हैं या इसका अर्थ समझना चाहते हैं, तो मुझे बताएँ।`;
  }

  const translationsBlock = fallbackPoem.couplets
    .map((c, idx) => `${idx + 1}. *${c.translation}*`)
    .join('\n');

  return `Here is an original composition based on your request:\n\n[VERSE]\n${versesBlock}\n[/VERSE]\n\n**English Meaning:**\n${translationsBlock}\n\n**Poetic Craft:** Composed with Radif *"${fallbackPoem.radifUsed}"* and Qafiyas *(${(fallbackPoem.qafiyaUsed || []).join(', ')})*.\n\nYou can ask me to *make it sadder*, *change the last line*, *write this in Urdu script (اردو) or Hindi (हिन्दी)*, or *explain any couplet*.`;
}

export function validateComposeRequest(req: Partial<ComposeRequest>): {
  valid: boolean;
  error?: string;
  normalized?: ComposeRequest;
} {
  const prompt = (req.prompt || '').trim();
  const refinement = (req.refinementInstruction || '').trim();

  if (!prompt && !refinement) {
    return {
      valid: false,
      error: 'Please enter a poetic theme, couplet idea, or emotion to begin composing.',
    };
  }

  if (prompt.length > 1500) {
    return {
      valid: false,
      error: 'Prompt is too long. Please keep your poetic brief under 1,500 characters.',
    };
  }

  const normalized: ComposeRequest = {
    prompt: prompt || refinement,
    language: req.language || 'auto',
    form: req.form || 'ghazal',
    mood: req.mood || 'ishq',
    length: req.length || 'medium',
    style: req.style || 'classical',
    radif: req.radif?.trim() || undefined,
    qafiya: req.qafiya?.trim() || undefined,
    takhallus: req.takhallus?.trim() || undefined,
    useWebResearch: Boolean(req.useWebResearch),
    sessionId: req.sessionId,
    refinementInstruction: refinement || undefined,
    previousPoem: req.previousPoem,
  };

  return { valid: true, normalized };
}

export function getTargetCoupletCount(form: PoetryForm, length: PoetryLength): number {
  if (form === 'caption') {
    return length === 'short' ? 1 : length === 'medium' ? 2 : 3;
  }
  if (form === 'shayari' || form === 'qita') {
    return length === 'short' ? 1 : length === 'medium' ? 2 : 3;
  }
  if (form === 'ghazal') {
    return length === 'short' ? 3 : length === 'medium' ? 5 : 7;
  }
  return length === 'short' ? 3 : length === 'medium' ? 4 : 6;
}

export function parseRawPoemText(
  rawText: string
): { couplets: PoemCouplet[]; fullText: string } {
  const cleaned = (rawText || '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!cleaned) {
    return { couplets: [], fullText: '' };
  }

  const blocks = cleaned
    .split(/\n\s*\n/)
    .map((b) =>
      b
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((b) => b.length > 0);

  const couplets: PoemCouplet[] = [];

  if (blocks.length === 1 && blocks[0].length > 2) {
    const allLines = blocks[0];
    for (let i = 0; i < allLines.length; i += 2) {
      couplets.push({
        id: `sher-${couplets.length + 1}`,
        lines: allLines.slice(i, i + 2),
      });
    }
  } else {
    blocks.forEach((lines, idx) => {
      couplets.push({
        id: `sher-${idx + 1}`,
        lines,
      });
    });
  }

  const fullText = couplets.map((c) => c.lines.join('\n')).join('\n\n');
  return { couplets, fullText };
}

export function analyzeRadifAndQafiya(
  couplets: PoemCouplet[],
  targetRadif?: string
): {
  detectedRadif: string;
  detectedQafiya: string[];
  matlaPresent: boolean;
  coupletCount: number;
} {
  const coupletCount = couplets.length;
  if (coupletCount === 0) {
    return {
      detectedRadif: targetRadif || '',
      detectedQafiya: [],
      matlaPresent: false,
      coupletCount: 0,
    };
  }

  const secondLines = couplets
    .map((c) => c.lines[c.lines.length - 1] || '')
    .map((l) => l.replace(/[۔،.!?,؛"']/g, '').trim())
    .filter(Boolean);

  if (targetRadif && targetRadif.trim()) {
    const cleanTarget = targetRadif.trim();
    const qafiyas: string[] = [];
    secondLines.forEach((line) => {
      if (line.toLowerCase().endsWith(cleanTarget.toLowerCase())) {
        const before = line.slice(0, line.length - cleanTarget.length).trim();
        const words = before.split(/\s+/);
        const qWord = words[words.length - 1];
        if (qWord && !qafiyas.includes(qWord)) {
          qafiyas.push(qWord);
        }
      }
    });

    const firstCouplet = couplets[0];
    const matlaPresent =
      firstCouplet.lines.length >= 2 &&
      firstCouplet.lines[0]
        .replace(/[۔،.!?,؛"']/g, '')
        .trim()
        .toLowerCase()
        .endsWith(cleanTarget.toLowerCase()) &&
      firstCouplet.lines[1]
        .replace(/[۔،.!?,؛"']/g, '')
        .trim()
        .toLowerCase()
        .endsWith(cleanTarget.toLowerCase());

    return {
      detectedRadif: cleanTarget,
      detectedQafiya: qafiyas,
      matlaPresent,
      coupletCount,
    };
  }

  if (secondLines.length >= 2) {
    const splitLines = secondLines.map((l) => l.split(/\s+/));
    const firstWords = splitLines[0];
    let commonSuffixCount = 0;

    for (let offset = 1; offset <= Math.min(3, firstWords.length); offset++) {
      const candidate = firstWords[firstWords.length - offset].toLowerCase();
      const allMatch = splitLines.every(
        (words) =>
          words.length >= offset &&
          words[words.length - offset].toLowerCase() === candidate
      );
      if (allMatch) {
        commonSuffixCount = offset;
      } else {
        break;
      }
    }

    if (commonSuffixCount > 0) {
      const detectedRadif = firstWords
        .slice(firstWords.length - commonSuffixCount)
        .join(' ');
      const qafiyas: string[] = [];
      splitLines.forEach((words) => {
        const qIdx = words.length - commonSuffixCount - 1;
        if (qIdx >= 0) {
          const q = words[qIdx];
          if (q && !qafiyas.includes(q)) qafiyas.push(q);
        }
      });

      const firstCoupletWords = (couplets[0].lines[0] || '')
        .replace(/[۔،.!?,؛"']/g, '')
        .trim()
        .split(/\s+/);
      const firstLineEnding = firstCoupletWords
        .slice(Math.max(0, firstCoupletWords.length - commonSuffixCount))
        .join(' ')
        .toLowerCase();

      return {
        detectedRadif,
        detectedQafiya: qafiyas,
        matlaPresent: firstLineEnding === detectedRadif.toLowerCase(),
        coupletCount,
      };
    }
  }

  return {
    detectedRadif: targetRadif || '',
    detectedQafiya: [],
    matlaPresent: false,
    coupletCount,
  };
}

export function buildFallbackPoem(req: ComposeRequest): GeneratedPoem {
  const { language, scriptDirection } = resolveLanguage(
    req.language,
    req.prompt,
    req.radif
  );
  const targetCount = getTargetCoupletCount(req.form, req.length);
  const customRadif = req.radif?.trim();
  const takhallus =
    req.takhallus?.trim() ||
    (language === 'urdu' ? 'سخن' : language === 'hindi' ? 'सुखन' : 'Sukhan');

  let couplets: PoemCouplet[] = [];
  let title = '';
  let subtitle = '';
  let radifUsed = customRadif || '';
  let qafiyaUsed: string[] = [];
  let bahrNote = 'Bahr-e-Hazaj Musamman Salim (Mafaa’eelun × 4)';
  let glossary: GlossaryItem[] = [];

  if (language === 'urdu') {
    const r = customRadif || 'ہے ابھی';
    const romanR =
      !customRadif || customRadif === 'ہے ابھی' ? 'hai abhi' : customRadif;
    radifUsed = r;
    qafiyaUsed = ['سفر', 'اثر', 'سحر', 'نظر', 'خبر'];
    title = req.form === 'ghazal' ? `غزل — ردیف: ${r}` : 'نظمِ دل — صدائے سخن';
    subtitle = `موضوع: ${req.prompt.slice(0, 48)}`;
    const pool: PoemCouplet[] = [
      {
        id: 'sher-1',
        lines: [
          `دل کے ویران دریچوں میں تری یاد کا سفر ${r}`,
          `شامِ تنہائی میں روشن وہی اک رہگزر ${r}`,
        ],
        transliteration: `Dil ke veeran dareechon mein teri yaad ka safar ${romanR} / Shaam-e-tanhai mein roshan wahi ik rahguzar ${romanR}`,
        translation:
          'Through the desolate windows of the heart, the journey of your memory endures; in the evening of solitude, that single illuminated path remains.',
      },
      {
        id: 'sher-2',
        lines: [
          `ہم نے چپ چاپ سہے ہجر کے موسم لیکن`,
          `تیری آواز میں پوشیدہ دعاؤں کا اثر ${r}`,
        ],
        transliteration: `Hum ne chup chaap sahe hijr ke mausam lekin / Teri aawaz mein posheeda duaon ka asar ${romanR}`,
        translation:
          'We quietly endured the seasons of separation, yet the grace of hidden prayers still lingers in your voice.',
      },
      {
        id: 'sher-3',
        lines: [
          `رات ڈھلتی ہے تو ستاروں سے الجھتا ہے خیال`,
          `تشنگی روح کی کہتی ہے کہ باقی سحر ${r}`,
        ],
        transliteration: `Raat dhalti hai toh sitaron se ulajhta hai khayal / Tishnagi rooh ki kehti hai ke baaqi sahar ${romanR}`,
        translation:
          'As night deepens, thought entangles with the stars; the thirst of the soul whispers that dawn is still ahead.',
      },
      {
        id: 'sher-4',
        lines: [
          `خاک اڑتی ہے سرِ دشتِ تمنا ہر سو`,
          `پھر بھی آئینۂ دل میں ترا عکسِ نظر ${r}`,
        ],
        transliteration: `Khaak urti hai sar-e-dasht-e-tamanna har soo / Phir bhi aaina-e-dil mein tera aks-e-nazar ${romanR}`,
        translation:
          'Dust rises across the wilderness of longing, yet your reflection stays clear in the mirror of the heart.',
      },
      {
        id: 'sher-5',
        lines: [
          `لوگ پڑھ لیتے ہیں خاموش نگاہوں کی کتاب`,
          `شہرِ الفت میں ترے نام کی ایسی خبر ${r}`,
        ],
        transliteration: `Log parh lete hain khamosh nigahon ki kitaab / Shehr-e-ulfat mein tere naam ki aisi khabar ${romanR}`,
        translation:
          'People read the book of silent glances; such is the resonance of your name in the city of love.',
      },
      {
        id: 'sher-6',
        lines: [
          `کاغذی پھولوں سے خوشبو کی توقع کیسی`,
          `باغِ ہستی میں خزاں دیدہ شجر معتبر ${r}`,
        ],
        transliteration: `Kaghazi phoolon se khushboo ki tawaqqo kaisi / Baagh-e-hasti mein khizan-deeda shajar mo'tabar ${romanR}`,
        translation:
          'Why expect fragrance from paper flowers? In the garden of existence, the autumn-weathered tree holds true dignity.',
      },
      {
        id: 'sher-7',
        lines: [
          `حرف جلتے ہیں چراغوں کی طرح اے ${takhallus}`,
          `لوحِ جاں پر ترے وعدوں کا سنہرا ہنر ${r}`,
        ],
        transliteration: `Harf jalte hain charaghon ki tarah aye ${takhallus} / Lauh-e-jaan par tere waadon ka sunehra hunar ${romanR}`,
        translation: `Words burn like oil lamps, O ${takhallus}; upon the tablet of the soul, the golden craft of your promises remains.`,
      },
    ];
    couplets = pool.slice(0, targetCount);
    glossary = [
      {
        word: 'دریچہ (Dareecha)',
        meaning: 'Small window or casement opening onto a courtyard',
        origin: 'Persian',
      },
      {
        word: 'تشنگی (Tishnagi)',
        meaning: 'Deep spiritual or emotional thirst and longing',
        origin: 'Persian',
      },
      {
        word: 'لوحِ جاں (Lauh-e-Jaan)',
        meaning: 'The tablet or canvas of the soul',
        origin: 'Arabic / Persian',
      },
    ];
  } else if (language === 'hindi') {
    const r = customRadif || 'अभी बाकी है';
    radifUsed = r;
    qafiyaUsed = ['सफ़र', 'असर', 'सहर', 'डगर', 'ख़बर'];
    title =
      req.form === 'ghazal' ? `ग़ज़ल — रदीफ़: ${r}` : 'काव्य-कृति — सुखन की छाँव';
    subtitle = `भाव-भूमि: ${req.prompt.slice(0, 48)}`;
    const pool: PoemCouplet[] = [
      {
        id: 'sher-1',
        lines: [
          `सूने आँगन में तेरी याद का सफ़र ${r}`,
          `शाम ढलने पर भी जलता हुआ अंबर ${r}`,
        ],
        transliteration: `Soone aangan mein teri yaad ka safar ${r} / Shaam dhalne par bhi jalta hua ambar ${r}`,
        translation:
          'In the quiet courtyard, the journey of your memory remains; even after dusk settles, the glowing sky remains.',
      },
      {
        id: 'sher-2',
        lines: [
          `हमने ख़ामोशी से सींचे हैं विरह के मौसम`,
          `तेरी मुस्कान में अनकही दुआ का असर ${r}`,
        ],
        transliteration: `Humne khamoshi se seenche hain virah ke mausam / Teri muskaan mein ankahi dua ka asar ${r}`,
        translation:
          'We nurtured the seasons of longing in silence; in your smile, the blessing of an unspoken prayer remains.',
      },
      {
        id: 'sher-3',
        lines: [
          `रात भर तारों से बतियाती रही मेरी नज़र`,
          `मन के दीपक को उजालों की सहर ${r}`,
        ],
        transliteration: `Raat bhar taaron se batiyati rahi meri nazar / Man ke deepak ko ujaalon ki sahar ${r}`,
        translation:
          'All night my gaze conversed with the stars; for the lamp of the heart, the dawn of light still awaits.',
      },
      {
        id: 'sher-4',
        lines: [
          `धूल उड़ती रही मीलों तक अधूरे ख्वाबों की`,
          `फिर भी उम्मीद से भीगी हुई डगर ${r}`,
        ],
        transliteration: `Dhool udti rahi meelon tak adhoore khwabon ki / Phir bhi ummeed se bheegi hui dagar ${r}`,
        translation:
          'The dust of unfinished dreams rose for miles, yet the pathway moistened with hope remains.',
      },
      {
        id: 'sher-5',
        lines: [
          `शब्द काग़ज़ पे उतर आए हैं मोती बनकर`,
          `ऐ '${takhallus}' इश्क़ के शहर में तेरी ख़बर ${r}`,
        ],
        transliteration: `Shabd kaghaz pe utar aaye hain moti bankar / Aye '${takhallus}' ishq ke shehar mein teri khabar ${r}`,
        translation: `Words have descended onto paper like pearls; O ${takhallus}, in the city of love, word of you still lingers.`,
      },
    ];
    couplets = pool.slice(0, targetCount);
    glossary = [
      {
        word: 'विरह (Virah)',
        meaning: 'Poignant longing and separation from the beloved',
        origin: 'Sanskrit',
      },
      {
        word: 'सहर (Sahar)',
        meaning: 'Early dawn, the break of morning light',
        origin: 'Arabic',
      },
      {
        word: 'डगर (Dagar)',
        meaning: 'Footpath or winding road of life',
        origin: 'Hindi',
      },
    ];
  } else {
    const r = customRadif || 'hai abhi';
    radifUsed = r;
    qafiyaUsed = [
      'safar',
      'asar',
      'sahar',
      'nazar',
      'khabar',
      'guzar',
      'shajar',
    ];
    title =
      req.form === 'ghazal'
        ? `Ghazal-e-Sukhan — "${r}"`
        : req.form === 'caption'
        ? 'Harf-e-Mukhtasar (Poetic Caption)'
        : 'Nawa-e-Dil — Contemporary Verse';
    subtitle = `Inspired by: ${req.prompt.slice(0, 56)}`;

    const pool: PoemCouplet[] = [
      {
        id: 'sher-1',
        lines: [
          `Dil ke veeran dareechon mein teri yaad ka safar ${r}`,
          `Shaam-e-tanhai mein roshan wahi ik rahguzar ${r}`,
        ],
        translation:
          'Through the quiet casements of the heart, the journey of your memory continues; in the dusk of solitude, that single lit path still shines.',
      },
      {
        id: 'sher-2',
        lines: [
          `Hum ne chup chaap sahe hijr ke mausam lekin`,
          `Teri aawaz mein posheeda duaon ka asar ${r}`,
        ],
        translation:
          'We bore the seasons of parting in silence, yet the quiet grace of hidden prayers still breathes within your voice.',
      },
      {
        id: 'sher-3',
        lines: [
          `Raat dhalti hai toh taaron se ulajhta hai khayal`,
          `Tishnagi rooh ki kehti hai ke baaqi sahar ${r}`,
        ],
        translation:
          'When night deepens, reflection tangles with the stars; the thirst of the soul insists that dawn is still to come.',
      },
      {
        id: 'sher-4',
        lines: [
          `Khaak urti hai sar-e-dasht-e-tamanna har soo`,
          `Phir bhi aaina-e-dil mein tera aks-e-nazar ${r}`,
        ],
        translation:
          'Though dust rises across the desert of desire, your reflection remains unclouded in the mirror of the heart.',
      },
      {
        id: 'sher-5',
        lines: [
          `Log parh lete hain khamosh nigahon ki kitaab`,
          `Shehr-e-ulfat mein tere naam ki aisi khabar ${r}`,
        ],
        translation:
          'Passersby read the scripture of silent eyes; such is the resonance of your name in the city of devotion.',
      },
      {
        id: 'sher-6',
        lines: [
          `Kaghazi phoolon se khushboo ki tawaqqo kaisi`,
          `Baagh-e-hasti mein khizan-deeda shajar ${r}`,
        ],
        translation:
          'Why seek fragrance from paper blossoms? In the orchard of life, the autumn-weathered tree still stands.',
      },
      {
        id: 'sher-7',
        lines: [
          `Harf jalte hain charaghon ki tarah aye '${takhallus}'`,
          `Lauh-e-jaan par tere waadon ka sunehra hunar ${r}`,
        ],
        translation: `Words burn like earthen lamps, O ${takhallus}; on the tablet of the soul, the golden craft of your promise endures.`,
      },
    ];
    couplets = pool.slice(0, targetCount);
    glossary = [
      {
        word: 'Dareecha',
        meaning: 'Casement window looking out onto an inner courtyard',
        origin: 'Persian',
      },
      {
        word: 'Dasht-e-Tamanna',
        meaning: 'The wilderness of longing and unfulfilled desire',
        origin: 'Persian / Arabic',
      },
      {
        word: 'Lauh-e-Jaan',
        meaning: 'The tablet of the soul where memories are inscribed',
        origin: 'Arabic / Persian',
      },
    ];
  }

  const fullText = couplets.map((c) => c.lines.join('\n')).join('\n\n');

  return {
    id: `poem-${Date.now()}`,
    title,
    subtitle,
    language,
    scriptDirection,
    form: req.form,
    mood: req.mood,
    style: req.style,
    length: req.length,
    couplets,
    fullText,
    radifUsed,
    qafiyaUsed: qafiyaUsed.slice(0, couplets.length),
    bahrNote,
    craftCommentary: `Composed in ${req.style.replace('_', ' ')} style with a ${req.mood} tone. Notice the matla opening and the recurring radif "${radifUsed}" anchored by rhyming qafiyas (${qafiyaUsed.slice(0, 4).join(', ')}).`,
    glossary,
    providerUsed: 'Sukhan Classical Engine',
    isFallback: true,
    createdAt: new Date().toISOString(),
  };
}

export const FARHANG_LEXICON: LexiconEntry[] = [
  {
    word: 'Shab-e-Firaq',
    urduScript: 'شبِ فراق',
    hindiScript: 'शब-ए-फ़िराक़',
    meaning: 'The night of separation and longing for the beloved.',
    usageNote:
      'Classic trope in ghazals contrasting unending darkness with memory as a lamp.',
    category: 'Emotion',
    sampleRadif: 'kat-ti nahi',
  },
  {
    word: 'Aab-o-Gil',
    urduScript: 'آب و گل',
    hindiScript: 'आब-ओ-गिल',
    meaning:
      'Water and clay; metaphor for mortal human existence and earthly vessel.',
    usageNote:
      'Frequently invoked by Mir and Ghalib to contrast the fragile body with infinite yearning.',
    category: 'Mysticism',
    sampleRadif: 'ka khel hai',
  },
  {
    word: 'Dasht-e-Imkaan',
    urduScript: 'دشتِ امکاں',
    hindiScript: 'दश्त-ए-इम्काँ',
    meaning: 'The wilderness of possibility; horizons yet unexplored.',
    usageNote:
      'Made immortal in philosophical verse about human potential beyond fate.',
    category: 'Classical',
    sampleRadif: 'aur bhi hain',
  },
  {
    word: 'Abr-e-Bahar',
    urduScript: 'ابرِ بہار',
    hindiScript: 'अब्र-ए-बहार',
    meaning: 'The raincloud of spring bringing renewal and intoxication.',
    usageNote:
      'Symbolizes sudden grace, emotional overflow, or the arrival of the beloved.',
    category: 'Nature',
    sampleRadif: 'baras gaya',
  },
  {
    word: 'Tishnagi',
    urduScript: 'تشنگی',
    hindiScript: 'तिश्नगी',
    meaning: 'Unquenched spiritual or romantic thirst.',
    usageNote:
      'Used when arrival at the destination still leaves the seeker yearning for the journey.',
    category: 'Emotion',
    sampleRadif: 'rehti hai',
  },
  {
    word: 'Aks-e-Khayal',
    urduScript: 'عکسِ خیال',
    hindiScript: 'अक्स-ए-ख़याल',
    meaning: 'The reflection or silhouette of a thought.',
    usageNote:
      'Ideal for delicate contemporary nazms and introspective couplets.',
    category: 'Mysticism',
    sampleRadif: 'dhundhla gaya',
  },
  {
    word: 'Ranjish',
    urduScript: 'رنجش',
    hindiScript: 'रंजिश',
    meaning:
      'Subtle estrangement, tender grievance, or lingering sorrow between lovers.',
    usageNote: 'Carries restraint and dignity rather than loud complaint.',
    category: 'Emotion',
    sampleRadif: 'hi sahi',
  },
  {
    word: 'Sahar-Aasaar',
    urduScript: 'سحر آثار',
    hindiScript: 'सहर-आसार',
    meaning: 'Signs of approaching dawn after a long, arduous night.',
    usageNote:
      'Central metaphor in progressive and revolutionary Urdu poetry (Faiz tradition).',
    category: 'Nature',
    sampleRadif: 'nazar aaye',
  },
];

export const INITIAL_SEED_CHATS: ChatThread[] = [
  {
    id: 'chat-welcome-fresh',
    ownerId: 'guest',
    title: 'New Chat',
    saved: false,
    createdAt: '2026-10-18T03:00:00.000Z',
    updatedAt: '2026-10-18T03:00:00.000Z',
    messages: [],
  },
  {
    id: 'chat-seed-monsoon',
    ownerId: 'guest',
    title: 'Shaam-e-Firaq & Monsoon Ghazal',
    saved: true,
    createdAt: '2026-10-18T01:28:00.000Z',
    updatedAt: '2026-10-18T01:30:00.000Z',
    messages: [
      {
        id: 'msg-seed-1',
        chatId: 'chat-seed-monsoon',
        ownerId: 'guest',
        role: 'user',
        content:
          'Write a ghazal in Roman Urdu about monsoon rain falling on an old courtyard at dusk, remembering an unfinished conversation. Use the radif "reh gayi".',
        feedback: 'none',
        createdAt: '2026-10-18T01:28:00.000Z',
        updatedAt: '2026-10-18T01:28:00.000Z',
      },
      {
        id: 'msg-seed-2',
        chatId: 'chat-seed-monsoon',
        ownerId: 'guest',
        role: 'assistant',
        content: `Here is a classical-style Ghazal in **Bahr-e-Ramal** anchored by the radif ***"reh gayi"*** and qafiyas *(baat, barsaat, saughaat, mulaqaat, zaat)*:\n\n[VERSE]\nKacche aangan mein dabe paaon utar aayi shaam,\nHont par tere fasaane ki wohi baat reh gayi.\n\nAb ke saawan ne bacha rakha tha ik qatra-e-ashk,\nChhat ki mandeer pe thehri hui barsaat reh gayi.\n\nHum ne chaaha tha ke khamoshi hi keh de sab kuch,\nDarmiyan apne magar kitni hi saughaat reh gayi.\n\nLog uth kar chale gaye mehfil-e-yaaraan se magar,\nTaaqchon par jalti hui shama-e-mulaqaat reh gayi.\n\nAi 'Sukhan' kaun sune ab ye adhoori ghazalein,\nKaghazon par bikhri hui apni hi zaat reh gayi.\n[/VERSE]\n\n**English Meaning & Craft Notes:**\n- **Matla (Couplet 1)**: Dusk stepped softly into the earthen courtyard; upon my lips, that same unfinished word of your story remained.\n- **Couplet 2**: This monsoon had saved a single tear-drop; along the parapet (*mandeer*) of the roof, the lingering rain remained.\n- **Couplet 4**: Friends departed the gathering, yet in the arched wall-niches (*taaqchon*) the candle of our meeting remained.\n\nWould you like me to make it sadder, render it in **Urdu script (اردو)** or **Hindi (हिन्दी)**, or add another couplet?`,
        feedback: 'up',
        createdAt: '2026-10-18T01:29:00.000Z',
        updatedAt: '2026-10-18T01:29:00.000Z',
      },
    ],
  },
  {
    id: 'chat-seed-urdu-charagh',
    ownerId: 'guest',
    title: 'خاموشی اور چراغ — اردو اشعار',
    saved: true,
    createdAt: '2026-10-17T21:14:00.000Z',
    updatedAt: '2026-10-17T21:15:00.000Z',
    messages: [
      {
        id: 'msg-seed-u1',
        chatId: 'chat-seed-urdu-charagh',
        ownerId: 'guest',
        role: 'user',
        content: 'ہوا کے تیز جھونکوں میں جلتا ہوا مٹی کا چراغ اور حوصلہ — اس موضوع پر دو اشعار لکھیں۔',
        feedback: 'none',
        createdAt: '2026-10-17T21:14:00.000Z',
        updatedAt: '2026-10-17T21:14:00.000Z',
      },
      {
        id: 'msg-seed-u2',
        chatId: 'chat-seed-urdu-charagh',
        ownerId: 'guest',
        role: 'assistant',
        content: `عزم اور استقامت کے اس خوبصورت استعارے پر دو کلاسیکی اشعار پیشِ خدمت ہیں:\n\n[VERSE]\nتند طوفانوں کی زد میں بھی سرِ شام جلتا رہا،\nاک دیا مٹی کا لے کر عزم کا پیغام جلتا رہا۔\n\nجب بجھا ڈالے زمانے نے محل کے قمقمے،\nگوشۂ ویراں میں الفت کا وہی انعام جلتا رہا۔\n[/VERSE]\n\n**فرہنگ (Glossary):**\n- **تند (Tund)**: تیز و تند ہوا یا طوفان\n- **قمقمے (Qumqume)**: فانوس اور محلوں کے روشن چراغ`,
        feedback: 'none',
        createdAt: '2026-10-17T21:15:00.000Z',
        updatedAt: '2026-10-17T21:15:00.000Z',
      },
    ],
  },
];
