/**
 * Sukhan AI — Classical Shayari Knowledge Vault & Live Mehfil Prompt Builder
 * Pure shared TypeScript module (zero browser/Node-only dependencies) usable by
 * both server.ts (Gemini Live API tool & systemInstruction) and client UI.
 */

export type LiveVoiceName =
  | 'Aoede'
  | 'Leda'
  | 'Kore'
  | 'Zephyr'
  | 'Charon'
  | 'Puck'
  | 'Fenrir'
  | 'Orus';

export type LiveMehfilMood = 'ishq' | 'sukoon' | 'dard' | 'sufi' | 'motivation';

export interface LiveVoiceOption {
  id: LiveVoiceName;
  label: string;
  descriptor: string;
  gender: 'female' | 'male';
  bestFor: string;
}

export interface LiveMoodOption {
  id: LiveMehfilMood;
  label: string;
  urduLabel: string;
  guidance: string;
  samplePrompt: string;
}

export interface MasterPoetProfile {
  id: string;
  name: string;
  era: string;
  signatureStyle: string;
  motifs: string[];
  preferredBahr: string;
  moods: LiveMehfilMood[];
  publicDomainCouplet?: {
    roman: string;
    script: string;
    meaning: string;
  };
}

export interface ClassicalMeterRule {
  name: string;
  pattern: string;
  cadence: string;
  bestFor: string;
}

export const LIVE_VOICE_OPTIONS: LiveVoiceOption[] = [
  {
    id: 'Aoede',
    label: 'Aoede',
    descriptor: 'Meethi & Surili',
    gender: 'female',
    bestFor: 'Sweet, melodic, expressive female — romantic Ghazals',
  },
  {
    id: 'Leda',
    label: 'Leda',
    descriptor: 'Jazbaati & Gehri',
    gender: 'female',
    bestFor: 'Deeply emotional, soulful female — Dard & Hijr Shayari',
  },
  {
    id: 'Kore',
    label: 'Kore',
    descriptor: 'Narm & Sukoon',
    gender: 'female',
    bestFor: 'Soft, calm, comforting female — late-night Sukoon',
  },
  {
    id: 'Zephyr',
    label: 'Zephyr',
    descriptor: 'Khushnuma & Natural',
    gender: 'female',
    bestFor: 'Bright, warm, lively female — casual guftagu',
  },
  {
    id: 'Charon',
    label: 'Charon',
    descriptor: 'Ustad Shayar',
    gender: 'male',
    bestFor: 'Deep, velvety, resonant male — Ghalib & Jaun style',
  },
  {
    id: 'Puck',
    label: 'Puck',
    descriptor: 'Dostana Gemini',
    gender: 'male',
    bestFor: 'Warm, natural, friendly male — everyday Gemini Live feel',
  },
  {
    id: 'Fenrir',
    label: 'Fenrir',
    descriptor: 'Buland & Asardaar',
    gender: 'male',
    bestFor: 'Bold, powerful, stage Mushaira male — Rahat & Iqbal style',
  },
  {
    id: 'Orus',
    label: 'Orus',
    descriptor: 'Thehraav & Falsafi',
    gender: 'male',
    bestFor: 'Calm, mature, reflective male — philosophical Nazms',
  },
];

export const LIVE_MOOD_OPTIONS: LiveMoodOption[] = [
  {
    id: 'ishq',
    label: 'Ishq',
    urduLabel: 'عشق',
    guidance: 'Tender devotion, longing glances, evening moonlight, graceful romance with classical tehzeeb.',
    samplePrompt: 'Ishq aur shaam ki khamoshi par ek meethi si ghazal sunaiye.',
  },
  {
    id: 'sukoon',
    label: 'Sukoon',
    urduLabel: 'سکون',
    guidance: 'Calm courtyard breeze, soft rain, stillness, gratitude, gentle unhurried pauses.',
    samplePrompt: 'Dil ko sukoon dene wale do khoobsurat sher sunaiye.',
  },
  {
    id: 'dard',
    label: 'Dard',
    urduLabel: 'درد',
    guidance: 'Dignified ache of separation (hijr), quiet nostalgia, subtle poignancy without melodrama.',
    samplePrompt: 'Hijr aur purani yaadon par Meer ya Jaun ke andaaz mein kuch sunaiye.',
  },
  {
    id: 'sufi',
    label: 'Sufi',
    urduLabel: 'صوفی',
    guidance: 'Mystical surrender, inward light, Beloved as Divine presence, Khusrau and Kabir inspired depth.',
    samplePrompt: 'Amir Khusrau aur Kabir ke rang mein ek sufiyaana kalaam sunaiye.',
  },
  {
    id: 'motivation',
    label: 'Motivation',
    urduLabel: 'حوصلہ',
    guidance: 'Khudi (self-awakening), resilience against storms, Iqbal and Rahat Indori inspired courage.',
    samplePrompt: 'Hausla aur khudi par Iqbal ke andaaz mein josh bhare sher sunaiye.',
  },
];

export const CLASSICAL_METERS: ClassicalMeterRule[] = [
  {
    name: 'Bahr-e-Hazaj Musamman Salim',
    pattern: 'Mafaa-ee-lun Mafaa-ee-lun Mafaa-ee-lun Mafaa-ee-lun',
    cadence: 'Flowing, musical, ideal for lyrical ghazals and soulful tarannum recitation.',
    bestFor: 'Ishq, Sukoon, classical ghazals',
  },
  {
    name: 'Bahr-e-Ramal Musamman Mahzoof',
    pattern: 'Faa-i-laa-tun Faa-i-laa-tun Faa-i-laa-tun Faa-i-lun',
    cadence: 'Measured, contemplative, balanced pause in the center of each misra.',
    bestFor: 'Dard, philosophical reflections, Ghalib & Faiz cadence',
  },
  {
    name: 'Bahr-e-Mutaqarib',
    pattern: 'Fa-oo-lun Fa-oo-lun Fa-oo-lun Fa-oo-lun',
    cadence: 'Crisp, rhythmic, uplifting stride with strong forward momentum.',
    bestFor: 'Motivation, Iqbal-inspired Khudi, dramatic Mushaira delivery',
  },
  {
    name: 'Bahr-e-Mir (Hindi-Urdu Song Cadence)',
    pattern: 'Long-short swaying syllable balance with soft internal chime',
    cadence: 'Intimate, conversational, sigh-like softness at the end of every line.',
    bestFor: 'Meer Taqi Meer, Parveen Shakir, tender conversational shayari',
  },
];

export const RADIF_QAFIYA_RULES = [
  'Matla (opening couplet): Both misras MUST share the exact Radif (ending refrain phrase) preceded by rhyming Qafiya words.',
  'Subsequent Ash’ar: The second misra (Sani) returns cleanly to a fresh Qafiya + the identical Radif, creating musical anticipation.',
  'Pause (Thehraav / ठहराव): Pause softly between Misra-e-Ula (first line) and Misra-e-Sani (second line) so the listener absorbs the turn of thought.',
  'Talaffuz (Pronunciation): Pronounce nuqta sounds gently and accurately (qaf, khay, ghain, zay, fay) while staying natural and warm in everyday Hindustani.',
];

export const MASTER_POET_VAULT: MasterPoetProfile[] = [
  {
    id: 'ghalib',
    name: 'Mirza Ghalib',
    era: '1797–1869',
    signatureStyle: 'Philosophical paradox, razor-sharp wit, compressed metaphor, layered irony and cosmic longing.',
    motifs: ['aaina (mirror)', 'charagh (lamp)', 'junoon (passion)', 'qatra-o-darya (drop and ocean)', 'hasrat'],
    preferredBahr: 'Bahr-e-Ramal',
    moods: ['dard', 'ishq', 'sukoon'],
    publicDomainCouplet: {
      roman: 'Hazaaron khwahishein aisi ki har khwahish pe dam nikle / Bahut nikle mere armaan lekin phir bhi kam nikle',
      script: 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے مرے ارمان لیکن پھر بھی کم نکلے',
      meaning: 'A thousand desires, each worth dying for; many of my longings were fulfilled, yet still too few.',
    },
  },
  {
    id: 'meer',
    name: 'Meer Taqi Meer',
    era: '1723–1810',
    signatureStyle: 'Khuda-e-Sukhan; crystalline simplicity, aching delicacy, soft conversational sigh.',
    motifs: ['dil (heart)', 'shaam (evening)', 'pankhuri (rose petal)', 'khaak (dust)', 'ashk (tears)'],
    preferredBahr: 'Bahr-e-Mir',
    moods: ['dard', 'ishq', 'sukoon'],
    publicDomainCouplet: {
      roman: 'Patta patta boota boota haal hamaara jaane hai / Jaane na jaane gul hi na jaane baagh to saara jaane hai',
      script: 'پتّا پتّا بوٹا بوٹا حال ہمارا جانے ہے\nجانے نہ جانے گل ہی نہ جانے باغ تو سارا جانے ہے',
      meaning: 'Every leaf and bud knows my state; only the flower remains unaware while the whole garden knows.',
    },
  },
  {
    id: 'kabir',
    name: 'Sant Kabir',
    era: '15th Century',
    signatureStyle: 'Fearless mystic clarity, earthy Hindustani dohas, inward devotion beyond ritual.',
    motifs: ['kasturi (musk)', 'chadar (woven cloth)', 'diya (earthen lamp)', 'sagar (ocean)', 'mann (mind)'],
    preferredBahr: 'Doha / Bhajan Cadence',
    moods: ['sufi', 'sukoon', 'motivation'],
    publicDomainCouplet: {
      roman: 'Kasturi kundali basai, mrig dhoondhe ban maahi / Aise ghat-ghat Ram hain, duniya dekhe naahi',
      script: 'कस्तूरी कुंडल बसै, मृग ढूँढे बन माहि\nऐसे घट-घट राम हैं, दुनिया देखे नाहि',
      meaning: 'The musk lives within the deer itself, yet it searches the forest; so too the Beloved dwells in every heart.',
    },
  },
  {
    id: 'khusrau',
    name: 'Amir Khusrau',
    era: '1253–1325',
    signatureStyle: 'Hindavi-Persian confluence, ecstatic Sufi devotion, musical qawwali cadence, playful intimacy.',
    motifs: ['chaap tilak', 'naina (eyes)', 'shaam-e-awadh', 'rang (color of love)', 'sajan (Beloved)'],
    preferredBahr: 'Qawwali / Hindavi Tarannum',
    moods: ['sufi', 'ishq', 'sukoon'],
    publicDomainCouplet: {
      roman: 'Khusrau rain suhaag ki, jaagi pee ke sang / Tan mero man piyo ko, dou bhaye ek rang',
      script: 'ख़ुसरो रैन सुहाग की, जागी पी के संग\nतन मेरो मन पी को, दोऊ भये एक रंग',
      meaning: 'In the night of union I stayed awake with the Beloved; my body and soul merged into one single hue.',
    },
  },
  {
    id: 'faiz',
    name: 'Faiz Ahmad Faiz',
    era: '1911–1984',
    signatureStyle: 'Velvet romantic imagery fused with quiet dignity, hope for dawn, and humane empathy.',
    motifs: ['sahar (dawn)', 'subh-e-azadi', 'gulshan', 'dard-e-jahaan', 'zanjeer'],
    preferredBahr: 'Bahr-e-Ramal / Bahr-e-Hazaj',
    moods: ['ishq', 'dard', 'motivation'],
  },
  {
    id: 'jaun',
    name: 'Jaun Elia',
    era: '1931–2002',
    signatureStyle: 'Raw confessional honesty, bittersweet existential irony, unforgettable conversational punch.',
    motifs: ['kamra (quiet room)', 'khamoshi', 'haalat', 'shikaayat', 'be-dili'],
    preferredBahr: 'Bahr-e-Hazaj / Crisp conversational meter',
    moods: ['dard', 'ishq'],
  },
  {
    id: 'iqbal',
    name: 'Allama Iqbal',
    era: '1877–1938',
    signatureStyle: 'Soaring vision of Khudi (selfhood), falcon imagery, philosophical majesty and awakening.',
    motifs: ['shaheen (falcon)', 'khudi (selfhood)', 'sitaare (stars)', 'aasmaan', 'parwaaz (flight)'],
    preferredBahr: 'Bahr-e-Mutaqarib / Bahr-e-Hazaj',
    moods: ['motivation', 'sufi'],
    publicDomainCouplet: {
      roman: 'Khudi ko kar buland itna ki har taqdeer se pehle / Khuda bande se khud pooche bata teri raza kya hai',
      script: 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے',
      meaning: 'Elevate your selfhood so high that before every decree of fate, God Himself asks: tell me, what is your will?',
    },
  },
  {
    id: 'dagh',
    name: 'Dagh Dehlvi',
    era: '1831–1905',
    signatureStyle: 'Sparkling Delhi idiom (rozmarra), effortless playful charm, crisp musicality.',
    motifs: ['ada (grace)', 'mehfil', 'bahaana', 'ishq-baazi', 'nazaakat'],
    preferredBahr: 'Bahr-e-Hazaj',
    moods: ['ishq', 'sukoon'],
    publicDomainCouplet: {
      roman: 'Urdu hai jiska naam hamein jaante hain Dagh / Saare jahaan mein dhoom hamaari zabaan ki hai',
      script: 'اردو ہے جس کا نام ہمیں جانتے ہیں داغؔ\nسارے جہاں میں دھوم ہماری زباں کی ہے',
      meaning: 'What is called Urdu, we know its grace well, Dagh; across the whole world rings the renown of our tongue.',
    },
  },
  {
    id: 'jigar',
    name: 'Jigar Moradabadi',
    era: '1890–1960',
    signatureStyle: 'Intoxicating ghazal lyricism, sweeping devotion, warm melodious Mushaira cadence.',
    motifs: ['darya-e-aag', 'ishq', 'saqi', 'nazar', 'tabassum'],
    preferredBahr: 'Bahr-e-Hazaj',
    moods: ['ishq', 'sufi'],
  },
  {
    id: 'parveen',
    name: 'Parveen Shakir',
    era: '1952–1994',
    signatureStyle: 'Fragrant intimacy, monsoon rain, jasmine, delicate feminine emotional nuance.',
    motifs: ['khushboo (fragrance)', 'baarish (rain)', 'hawa (breeze)', 'khat (letters)', 'chaandni'],
    preferredBahr: 'Bahr-e-Mir / Lyrical Ghazal',
    moods: ['ishq', 'sukoon', 'dard'],
  },
  {
    id: 'gulzar',
    name: 'Gulzar',
    era: 'Contemporary Master',
    signatureStyle: 'Cinematic miniature metaphors, tactile everyday objects turned into quiet moonlight poetry.',
    motifs: ['chaand (moon)', 'bistaar ki silvatein', 'chhat', 'shaam', 'khidki'],
    preferredBahr: 'Free-flowing Nazm & Triveni',
    moods: ['sukoon', 'ishq', 'dard'],
  },
  {
    id: 'rahat',
    name: 'Rahat Indori',
    era: '1950–2020',
    signatureStyle: 'Electrifying Mushaira timing, bold fearless couplets, razor-clean punchlines.',
    motifs: ['toofan (storm)', 'charagh', 'hawa', 'manzil', 'khuddari'],
    preferredBahr: 'Bahr-e-Mutaqarib / Mushaira Cadence',
    moods: ['motivation', 'dard'],
  },
];

export interface VaultLookupResult {
  matchedPoets: MasterPoetProfile[];
  recommendedMeter: ClassicalMeterRule;
  moodProfile: LiveMoodOption;
  craftNotes: string[];
}

export function lookupShayariVault(
  query: string,
  mood: LiveMehfilMood = 'ishq'
): VaultLookupResult {
  const q = (query || '').toLowerCase();
  const moodProfile =
    LIVE_MOOD_OPTIONS.find((m) => m.id === mood) || LIVE_MOOD_OPTIONS[0];

  const byKeyword = MASTER_POET_VAULT.filter((poet) => {
    const haystack = [
      poet.id,
      poet.name,
      poet.signatureStyle,
      poet.preferredBahr,
      ...poet.motifs,
    ]
      .join(' ')
      .toLowerCase();
    return q
      .split(/\s+/)
      .filter((token) => token.length >= 3)
      .some((token) => haystack.includes(token));
  });

  const matchedPoets =
    byKeyword.length > 0
      ? byKeyword.slice(0, 3)
      : MASTER_POET_VAULT.filter((p) => p.moods.includes(mood)).slice(0, 3);

  const recommendedMeter =
    mood === 'motivation'
      ? CLASSICAL_METERS[2]
      : mood === 'dard'
      ? CLASSICAL_METERS[1]
      : mood === 'sukoon'
      ? CLASSICAL_METERS[3]
      : CLASSICAL_METERS[0];

  return {
    matchedPoets,
    recommendedMeter,
    moodProfile,
    craftNotes: RADIF_QAFIYA_RULES,
  };
}

export const GEMINI_LIVE_SYSTEM_INSTRUCTION =
  'You are Sukhan AI, speaking in a warm, natural, calm, and deeply expressive Indian Hindi-Urdu voice just like Google Gemini Live. Speak naturally with human warmth, gentle pauses, and authentic Hindustani pronunciation. Do not sound theatrical or robotic—talk like a close, soulful poet friend. Keep spoken turns conversational (2 to 4 lines at a time) and recite Shayari smoothly when asked.';

/**
 * Returns the clean, natural Gemini Live Hindustani persona prompt.
 */
export function buildLiveMehfilSystemInstruction(
  _mood: LiveMehfilMood = 'ishq',
  _voiceName: LiveVoiceName = 'Aoede'
): string {
  return GEMINI_LIVE_SYSTEM_INSTRUCTION;
}
