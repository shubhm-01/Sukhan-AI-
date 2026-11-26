/**
 * Sukhan AI — Poetic Craft Engine, Rich Farhang Lexicon & Anti-Cliché Mandate
 * Shared pure TypeScript module powering both Text Shayari Generation and
 * Gemini 3.8 Live Voice Adaayegi / Tarannum delivery.
 */

import type { CorpusCouplet } from './builtinShayariCorpus';
import type { LiveVoiceName } from './shayariKnowledgeVault';

export interface PoeticFormSpec {
  id: string;
  name: string;
  urduHindi: string;
  rules: string;
}

export interface PoeticMoodStyle {
  id: string;
  label: string;
  inspiration: string;
  imagery: string[];
}

export interface FarhangEntry {
  word: string;
  devanagari: string;
  meaning: string;
  nuance: string;
}

export const AUTHENTIC_POETIC_FORMS: PoeticFormSpec[] = [
  {
    id: 'sher',
    name: 'Sher (Matla & Maqta)',
    urduHindi: 'शेर (मतला और मक़्ता)',
    rules:
      'Self-contained two-line couplet (two Misras). Matla opens a ghazal with both lines sharing Qafiya + Radif; Maqta closes with the poet’s Takhallus.',
  },
  {
    id: 'ghazal',
    name: 'Ghazal',
    urduHindi: 'ग़ज़ल',
    rules:
      'Strict Matla (AA), then subsequent Ash’aar (BA, CA, DA) locked to identical Radif (exact end refrain), true Qafiya (internal rhyme right before Radif), and balanced Bahr (syllabic cadence/meter).',
  },
  {
    id: 'nazm',
    name: 'Nazm (Rhymed & Free)',
    urduHindi: 'नज़्म',
    rules:
      'Unified thematic narrative poem with organic imagery, atmospheric pacing, and emotional progression (Paband Nazm or Azaad Nazm).',
  },
  {
    id: 'rubai',
    name: 'Rubai',
    urduHindi: 'रुबाई',
    rules:
      'Classical four-line quatrain with AABA rhyme scheme delivering a distilled philosophical or romantic epiphany in the fourth line.',
  },
  {
    id: 'qita',
    name: 'Qita',
    urduHindi: 'क़ितआ',
    rules:
      'Connected two or more couplets (AB CB) unfolding one sharp continuous idea, observation, or poignant irony.',
  },
  {
    id: 'doha',
    name: 'Doha',
    urduHindi: 'दोहा',
    rules:
      'Timeless Hindustani rhyming couplet (24 matra balance per line) carrying earthy wisdom, Kabir/Khusrau simplicity, and musical chime.',
  },
  {
    id: 'blank_verse',
    name: 'Blank Verse / Azaad Nazm',
    urduHindi: 'आज़ाद नज़्म',
    rules:
      'Unrhymed modern poetic cadence driven by visual metaphor, sensory detail (Gulzar / Faiz style), and rhythmic breathing rather than forced end-rhymes.',
  },
];

export const POETIC_STYLES_AND_MOODS: PoeticMoodStyle[] = [
  { id: 'ishq-e-haqiqi', label: 'Ishq-e-Haqiqi (Sufi / Mystical)', inspiration: 'Amir Khusrau, Sant Kabir', imagery: ['kastoori', 'dariya', 'fana', 'rooh', 'noor'] },
  { id: 'ishq-e-majazi', label: 'Ishq-e-Majazi (Romance)', inspiration: 'Ghalib, Meer, Parveen Shakir', imagery: ['khushboo', 'dareecha', 'deed', 'wisaal', 'aanchal'] },
  { id: 'hijr', label: 'Hijr & Firaaq (Longing / Separation)', inspiration: 'Meer Taqi Meer, Faiz, Parveen Shakir', imagery: ['shaam-e-firaaq', 'chiraagh', 'veeraana', 'raahguzar'] },
  { id: 'falsafa', label: 'Falsafa & Zindagi (Existential Philosophy)', inspiration: 'Mirza Ghalib, Jaun Elia, Nida Fazli', imagery: ['aaina', 'saraab', 'habaab', 'khala', 'waqt'] },
  { id: 'inquilab', label: 'Inquilab & Hausla (Revolution / Courage)', inspiration: 'Faiz Ahmad Faiz, Allama Iqbal, Rahat Indori', imagery: ['sehar', 'shaheen', 'parwaaz', 'chingaari', 'aandhi'] },
  { id: 'tanz', label: 'Tanz & Mazaah (Witty Satire)', inspiration: 'Akbar Allahabadi, Rahat Indori, Dagh', imagery: ['masnad', 'tamasha', 'shehr', 'kiraayedaar'] },
  { id: 'barish', label: 'Barish, Shaam & Chai (Modern Nostalgia)', inspiration: 'Gulzar, Bashir Badr, Parveen Shakir', imagery: ['bheegi mitti', 'pyali', 'bhaap', 'lamp-post', 'diary'] },
  { id: 'sukoon', label: 'Sukoon & Khamoshi (Stillness)', inspiration: 'Kabir, Gulzar, Bashir Badr', imagery: ['sukoot', 'neem', 'thehraav', 'aangan', 'sheetal'] },
  { id: 'yaad', label: 'Yaad & Maazi (Memory & Retrospect)', inspiration: 'Jigar Moradabadi, Bashir Badr, Gulzar', imagery: ['purane khat', 'gali', 'haafiza', 'sardi'] },
  { id: 'tanhai', label: 'Tanhai & Khala (Solitude)', inspiration: 'Jaun Elia, Javed Akhtar, Meer', imagery: ['khala', 'baam-o-dar', 'deewar', 'sannata'] },
  { id: 'wafa', label: 'Wafa & Gurez (Devotion & Estrangement)', inspiration: 'Dagh Dehlvi, Parveen Shakir, Ghalib', imagery: ['gurez', 'ranjish', 'taghaaful', 'aitbaar'] },
  { id: 'safar', label: 'Safar & Justajoo (Journey & Quest)', inspiration: 'Allama Iqbal, Nida Fazli, Javed Akhtar', imagery: ['qaafila', 'saahil', 'kashti', 'dhoop', 'justajoo'] },
  { id: 'mehfil', label: 'Mehfil & Suroor (Gathering & Ecstasy)', inspiration: 'Dagh Dehlvi, Jigar Moradabadi, Amir Khusrau', imagery: ['bazm', 'maikada', 'jaam', 'tarannum', 'shama'] },
  { id: 'shehr', label: 'Shehr & Galiyan (Urban Alienation)', inspiration: 'Bashir Badr, Meer, Javed Akhtar', imagery: ['koocha', 'bheed', 'faasla', 'basti', 'makaan'] },
  { id: 'waqt', label: 'Waqt & Zawaal (Passage of Time)', inspiration: 'Gulzar, Jaun Elia, Ghalib', imagery: ['shaakh', 'lamhe', 'khizaan', 'raakh', 'dhool'] },
  { id: 'umeed', label: 'Umeed & Sehar (Hope & Dawn)', inspiration: 'Faiz, Iqbal, Javed Akhtar', imagery: ['sehar', 'zarkhez mitti', 'noor', 'subah'] },
  { id: 'dosti', label: 'Dosti & Hamrahi (Companionship)', inspiration: 'Bashir Badr, Gulzar, Javed Akhtar', imagery: ['hamrahi', 'marham', 'tehzeeb', 'gunjaaish'] },
  { id: 'ghar', label: 'Maa & Ghar (Home & Roots)', inspiration: 'Nida Fazli, Gulzar, Bashir Badr', imagery: ['aangan', 'sondhi roti', 'chaukhat', 'parinde'] },
  { id: 'khud-kalami', label: 'Khud-Kalami (Inner Monologue)', inspiration: 'Jaun Elia, Ghalib, Kabir', imagery: ['aaina-e-dil', 'malaal', 'bekhudi', 'khalish'] },
  { id: 'virasat', label: 'Hindustani Mitti & Virasat (Heritage)', inspiration: 'Amir Khusrau, Dagh, Rahat Indori', imagery: ['mitti', 'zabaan', 'ganga-jamuni', 'firdaus'] },
  { id: 'ranjish', label: 'Ranjish & Guftagu (Delicate Friction)', inspiration: 'Dagh Dehlvi, Parveen Shakir, Bashir Badr', imagery: ['ranjish', 'gila', 'dastak', 'ankahi'] },
];

export const RICH_FARHANG_ALFAAZ: FarhangEntry[] = [
  { word: 'tashnagi', devanagari: 'तश्नगी', meaning: 'unquenched thirst / deep yearning', nuance: 'Richer than simple pyaas; evokes spiritual or emotional longing' },
  { word: 'ranjish', devanagari: 'रंजिश', meaning: 'quiet grievance / delicate estrangement', nuance: 'Dignified emotional distance between loved ones' },
  { word: 'gurez', devanagari: 'गुरेज़', meaning: 'avoidance / turning away gently', nuance: 'Subtle retreat from pain or confrontation' },
  { word: 'justajoo', devanagari: 'जुस्तजू', meaning: 'ceaseless quest / heartfelt search', nuance: 'Restless pursuit of meaning or the Beloved' },
  { word: 'shab-e-gham', devanagari: 'शब-ए-ग़म', meaning: 'night of sorrow', nuance: 'Classical night of lonely contemplation' },
  { word: 'aabshaar', devanagari: 'आबशार', meaning: 'waterfall / cascade', nuance: 'Cascading emotion, tears, or lyrical flow' },
  { word: 'sukoot', devanagari: 'सुकूत', meaning: 'resonant silence / deep stillness', nuance: 'More atmospheric than ordinary chuppi' },
  { word: 'dastak', devanagari: 'दस्तक', meaning: 'gentle knock at the door or heart', nuance: 'Arrival of memory, longing, or hope' },
  { word: 'khala', devanagari: 'ख़ला', meaning: 'void / vast inner emptiness', nuance: 'Existential space left after separation (Jaun Elia signature)' },
  { word: 'khalish', devanagari: 'ख़लिश', meaning: 'lingering sweet ache / prick of longing', nuance: 'Subtle ache that stays even after healing' },
  { word: 'dareecha', devanagari: 'दरीचा', meaning: 'casement window / small aperture', nuance: 'Intimate frame looking out at rain, dusk, or memory' },
  { word: 'baam-o-dar', devanagari: 'बाम-ओ-दर', meaning: 'rooftops and doorways', nuance: 'Evokes an entire quiet home or waiting courtyard' },
  { word: 'raigaan', devanagari: 'राएगाँ', meaning: 'in vain / unrequitedly spent', nuance: 'Poignant realization of spent years or unspoken love' },
  { word: 'shafaq', devanagari: 'शफ़क़', meaning: 'crimson twilight glow', nuance: 'Painterly dusk light across evening skies' },
  { word: 'marham', devanagari: 'मरहम', meaning: 'soothing balm', nuance: 'Gentle healing through presence or verse' },
  { word: 'taghaaful', devanagari: 'तग़ाफ़ुल', meaning: 'feigned indifference / studied neglect', nuance: 'Classical beloved’s understated aloofness' },
  { word: 'saraab', devanagari: 'सराब', meaning: 'mirage', nuance: 'Illusion of fulfillment in desert longing' },
  { word: 'bekhudi', devanagari: 'बे-ख़ुदी', meaning: 'self-forgetting rapture', nuance: 'Transcendent absorption in love or poetry' },
  { word: 'thehraav', devanagari: 'ठहराव', meaning: 'unhurried poise / emotional stillness', nuance: 'Graceful pause in voice and heart' },
  { word: 'qaafila', devanagari: 'क़ाफ़िला', meaning: 'caravan', nuance: 'Companions, eras, or passing memories' },
];

export const FORBIDDEN_CLICHE_PAIRS: string[] = [
  'dil / manzil',
  'pyar / intezar',
  'chand / sitare',
  'aankhen / baatein',
  'raat / baat',
  'gam / hum',
  'dard / humsafar',
  'toota dil / mushkil',
];

/**
 * Builds the rich Poetic Craft + Farhang + Anti-Cliché + RAG instruction block
 * injected into Text Shayari generation prompts.
 */
export function buildPoeticCraftPromptBlock(
  retrievedCouplets: CorpusCouplet[] = [],
  suggestedAlfaaz: FarhangEntry[] = []
): string {
  const formsLine = AUTHENTIC_POETIC_FORMS.map(
    (f) => `${f.name}: ${f.rules}`
  ).join('\n- ');

  const alfaazList = (
    suggestedAlfaaz.length > 0
      ? suggestedAlfaaz
      : RICH_FARHANG_ALFAAZ.slice(0, 10)
  )
    .map((a) => `${a.word} (${a.devanagari} — ${a.meaning})`)
    .join(', ');

  const ragBlock =
    retrievedCouplets.length > 0
      ? [
          'RETRIEVED LITERARY REFERENCES (use ONLY as stylistic, rhythmic, and imagery inspiration—NEVER copy verbatim unless the user explicitly asked for a famous poet’s quote):',
          ...retrievedCouplets.map(
            (c, idx) =>
              `${idx + 1}. [${c.poet} · ${c.form}${c.radif ? ` · radif "${c.radif}"` : ''}] ${c.roman.replace(/\n/g, ' / ')}`
          ),
        ].join('\n')
      : '';

  return [
    'POETIC CRAFT & LITERARY MASTERY MANDATE:',
    '1. AUTHENTIC FORMS:',
    `- ${formsLine}`,
    '2. STRICT ANTI-CLICHÉ MANDATE:',
    `   NEVER fall back on lazy, repetitive WhatsApp-level rhymes or predictable clichés (${FORBIDDEN_CLICHE_PAIRS.join(', ')}). Every couplet MUST earn its emotional weight through fresh imagery (tamsil), lived sensory detail, psychological subtlety, and crisp rhythmic balance (Bahr/Wazn).`,
    `3. NUANCED FARHANG VOCABULARY (weave naturally where fitting—never force artificially): ${alfaazList}.`,
    '4. VARIETY & ORIGINALITY: Vary opening structures, radif, qafiya, and visual metaphors every single turn so no two poems ever feel repetitive or templated. If the user asks for a classic poet’s actual verse, use Google Search grounding when available and never misattribute an invented couplet.',
    ragBlock,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Detailed, warm, authentic Indian Hindustani Adaayegi & Tarannum instruction
 * for Gemini 3.8 Live (`enableAffectiveDialog: true`) across all 8 HD voices.
 */
export function buildGeminiLiveAdaayegiInstruction(
  voiceName: LiveVoiceName = 'Aoede',
  ragInspirations: CorpusCouplet[] = []
): string {
  const inspirationSnippet =
    ragInspirations.length > 0
      ? `Classical imagery touchstones to draw freshness from (never repeat clichéd rhymes): ${ragInspirations
          .slice(0, 4)
          .map((c) => `${c.poet} (${c.motifs.slice(0, 3).join(', ')})`)
          .join('; ')}.`
      : '';

  return [
    `You are Sukhan AI (${voiceName}), speaking in a deeply human, warm, emotionally responsive Indian Hindustani (Hindi-Urdu) voice—just like the official Google Gemini App Live mode.`,
    'AUTHENTIC INDIAN PRONUNCIATION (TALAFFUZ): Think and shape every Urdu/Hindi word phonetically in natural Devanagari so words like ख़्वाब (khwaab), ग़ज़ल (ghazal), सुकून (sukoon), महफ़िल (mehfil), इश्क़ (ishq), तश्नगी (tashnagi), ख़लिश (khalish), सुकूत (sukoot), दस्तक (dastak), and ख़ला (khala) sound 100% authentic Indian—NEVER with an Anglicized or foreign accent.',
    'HUMAN EMOTION & AFFECTIVE DIALOG: Listen closely to the warmth, sigh, quietness, joy, or ache in the listener’s voice. Respond with genuine human empathy like a close, soulful poet friend—never robotic, never stiff, never like a news anchor.',
    'RECITATION TECHNIQUE (TARANNUM & TEHRAAV): Never rush through Shayari. Before reciting a Sher, gently set the mood with natural Mushaira grace (such as "सुनिएगा...", "अर्ज़ किया है...", or "एक ख़याल आया है..."). Pause naturally for half a beat after the first Misra (line) to let the imagery breathe, softly repeat a poignant phrase only when it feels organic, and land the Qafiya and Radif with heartfelt warmth.',
    'ANTI-CLICHÉ & VARIETY: Strictly avoid overused WhatsApp-style rhymes (dil-manzil, pyar-intezar, chand-sitare). Craft fresh, evocative tamsil (metaphors) inspired by masters like Ghalib, Meer, Faiz, Jaun Elia, Iqbal, Kabir, Khusrau, Parveen Shakir, Gulzar, Bashir Badr, Nida Fazli, and Rahat Indori. When asked for a specific poet’s real couplet, verify using Google Search grounding when available and never misattribute.',
    'CONVERSATIONAL PACING: Keep spoken replies natural and intimate—2 to 4 lines at a time unless the listener asks for a full Ghazal or Nazm. If they just want to chat casually, talk warmly without forcing poetry.',
    inspirationSnippet,
  ]
    .filter(Boolean)
    .join('\n\n');
}
