import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_VOICE_OPTIONS,
  MASTER_POET_VAULT,
} from '../data/shayariKnowledgeVault.ts';
import { BUILTIN_SHAYARI_CORPUS } from '../data/builtinShayariCorpus.ts';
import {
  AUTHENTIC_POETIC_FORMS,
  POETIC_STYLES_AND_MOODS,
  RICH_FARHANG_ALFAAZ,
  buildPoeticCraftPromptBlock,
  buildGeminiLiveAdaayegiInstruction,
} from '../data/poeticCraftEngine.ts';
import {
  retrieveRelevantShayari,
  parseOpenSourcePoetryText,
} from '../services/shayariCorpusService.ts';
import {
  PcmRingBuffer,
  downsampleFloat32,
  float32ToPcm16Base64,
  decodePcm16Base64ToFloat32,
  computeRmsLevel,
} from './liveAudioEngine.ts';

test('All 8 official Google Gemini App HD voices are configured with Aoede default', () => {
  const expectedIds = [
    'Aoede',
    'Leda',
    'Kore',
    'Zephyr',
    'Charon',
    'Puck',
    'Fenrir',
    'Orus',
  ];
  assert.deepEqual(
    LIVE_VOICE_OPTIONS.map((v) => v.id),
    expectedIds
  );
  assert.equal(MASTER_POET_VAULT.length, 12);
});

test('Built-in Shayari corpus contains 150+ diverse couplets covering all 15 legendary poets', () => {
  assert.ok(
    BUILTIN_SHAYARI_CORPUS.length >= 150,
    `Expected >= 150 built-in couplets, got ${BUILTIN_SHAYARI_CORPUS.length}`
  );
  const poets = new Set(BUILTIN_SHAYARI_CORPUS.map((c) => c.poet));
  const requiredPoets = [
    'Mirza Ghalib',
    'Meer Taqi Meer',
    'Faiz Ahmad Faiz',
    'Jaun Elia',
    'Allama Iqbal',
    'Sant Kabir',
    'Amir Khusrau',
    'Dagh Dehlvi',
    'Jigar Moradabadi',
    'Parveen Shakir',
    'Gulzar',
    'Javed Akhtar',
    'Bashir Badr',
    'Nida Fazli',
    'Rahat Indori',
  ];
  for (const poet of requiredPoets) {
    assert.ok(poets.has(poet), `Missing required poet in built-in corpus: ${poet}`);
  }
});

test('Poetic Craft Engine exposes 7+ forms, 20+ moods, rich Farhang, anti-cliché rules, and Indian Adaayegi prompt', () => {
  assert.ok(AUTHENTIC_POETIC_FORMS.length >= 7);
  assert.ok(POETIC_STYLES_AND_MOODS.length >= 20);
  assert.ok(RICH_FARHANG_ALFAAZ.length >= 15);

  const rag = retrieveRelevantShayari('Jaun Elia existential tanhai', { limit: 4 });
  const craftBlock = buildPoeticCraftPromptBlock(rag.couplets, rag.suggestedAlfaaz);
  assert.match(craftBlock, /ANTI-CLICHÉ/i);
  assert.match(craftBlock, /dil \/ manzil/i);
  assert.match(craftBlock, /Jaun Elia/i);

  const livePrompt = buildGeminiLiveAdaayegiInstruction('Leda', rag.couplets);
  assert.match(livePrompt, /ख़्वाब/);
  assert.match(livePrompt, /सुनिएगा/);
  assert.match(livePrompt, /अर्ज़ किया है/);
  assert.match(livePrompt, /Misra/i);
});

test('Local RAG retriever matches poets, semantic synonyms, and open-source dataset parsing', () => {
  const sufi = retrieveRelevantShayari('mystical sufi prem kabir khusrau', { limit: 5 });
  assert.equal(sufi.couplets.length, 5);
  assert.ok(
    sufi.couplets.some((c) => c.poet === 'Sant Kabir' || c.poet === 'Amir Khusrau')
  );

  const rain = retrieveRelevantShayari('monsoon barish shaam chai nostalgia', { limit: 5 });
  assert.equal(rain.couplets.length, 5);
  assert.ok(rain.motifs.length > 0);
  assert.ok(rain.suggestedAlfaaz.length > 0);

  const parsedTxt = parseOpenSourcePoetryText(
    'Yeh na thi hamari qismat ke wisaal-e-yaar hota\nAgar aur jeete rehte yahi intezaar hota\n\nDil-e-naadaan tujhe hua kya hai\nAakhir is dard ki dawa kya hai',
    'Mirza Ghalib',
    'text'
  );
  assert.equal(parsedTxt.length, 2);
  assert.equal(parsedTxt[0].poet, 'Mirza Ghalib');
  assert.equal(parsedTxt[0].radif, 'hota');
});

test('PcmRingBuffer handles continuous push, wraparound, partial read, and instant clear', () => {
  const ring = new PcmRingBuffer(128);
  const chunkA = new Float32Array(90);
  for (let i = 0; i < 90; i++) chunkA[i] = i / 100;
  ring.push(chunkA);
  assert.equal(ring.available, 90);

  const outA = new Float32Array(60);
  assert.equal(ring.read(outA), 60);
  assert.equal(ring.available, 30);

  const chunkB = new Float32Array(80).fill(0.5);
  ring.push(chunkB);
  assert.equal(ring.available, 110);

  ring.clear();
  assert.equal(ring.available, 0);
  const silent = new Float32Array(16).fill(1);
  assert.equal(ring.read(silent), 0);
  assert.ok(silent.every((s) => s === 0));
});

test('decodePcm16Base64ToFloat32 and downsampleFloat32 preserve audio accuracy', () => {
  const original = new Float32Array([0, 0.25, -0.5, 0.75, -1.0, 0.5]);
  const b64 = float32ToPcm16Base64(original);
  const decoded = decodePcm16Base64ToFloat32(b64);
  assert.equal(decoded.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(decoded[i] - original[i]) < 0.001);
  }

  const input48k = new Float32Array(4800).fill(0.5);
  const out16k = downsampleFloat32(input48k, 48000, 16000);
  assert.equal(out16k.length, 1600);
  assert.ok(Math.abs(computeRmsLevel(out16k) - 0.5) < 0.01);
});
