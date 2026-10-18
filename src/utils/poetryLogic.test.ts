import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguageAndScript,
  validateComposeRequest,
  parseRawPoemText,
  analyzeRadifAndQafiya,
  buildFallbackPoem,
  getTargetCoupletCount,
  deriveChatTitle,
  segmentMessageContent,
  detectUserIntent,
  buildContextualChatReply,
} from './poetryLogic.ts';

test('detectLanguageAndScript identifies Urdu script (RTL)', () => {
  const res = detectLanguageAndScript('محبت کی شام اور تنہائی');
  assert.equal(res.detected, 'urdu');
  assert.equal(res.scriptDirection, 'rtl');
  assert.equal(res.confidence, 'high');
});

test('detectLanguageAndScript identifies Hindi Devanagari script (LTR)', () => {
  const res = detectLanguageAndScript('प्रेम और विरह की रात');
  assert.equal(res.detected, 'hindi');
  assert.equal(res.scriptDirection, 'ltr');
  assert.equal(res.confidence, 'high');
});

test('detectLanguageAndScript identifies Roman Urdu markers accurately', () => {
  const res = detectLanguageAndScript('sham-e-firaq mein teri yaad aur khamoshi');
  assert.equal(res.detected, 'roman_urdu');
  assert.equal(res.scriptDirection, 'ltr');
  assert.equal(res.confidence, 'high');
});

test('validateComposeRequest rejects empty prompt and refinement', () => {
  const res = validateComposeRequest({ prompt: '   ', language: 'auto' });
  assert.equal(res.valid, false);
  assert.ok(res.error);
});

test('parseRawPoemText groups lines into couplets and preserves line breaks', () => {
  const raw = 'First line of matla\nSecond line of matla\n\nThird line\nFourth line';
  const parsed = parseRawPoemText(raw);
  assert.equal(parsed.couplets.length, 2);
  assert.deepEqual(parsed.couplets[0].lines, [
    'First line of matla',
    'Second line of matla',
  ]);
});

test('analyzeRadifAndQafiya detects recurring radif and preceding qafiya words', () => {
  const couplets = [
    {
      id: '1',
      lines: [
        'Dil mein teri yaad ka safar hai abhi',
        'Shaam-e-tanhai mein roshan rahguzar hai abhi',
      ],
    },
    {
      id: '2',
      lines: [
        'Hum ne chup chaap sahe hijr ke mausam lekin',
        'Teri aawaz mein duaon ka asar hai abhi',
      ],
    },
  ];
  const analysis = analyzeRadifAndQafiya(couplets);
  assert.equal(analysis.detectedRadif, 'hai abhi');
  assert.equal(analysis.matlaPresent, true);
  assert.ok(analysis.detectedQafiya.includes('rahguzar'));
  assert.ok(analysis.detectedQafiya.includes('asar'));
});

test('buildFallbackPoem respects chosen language, form, length, and custom radif', () => {
  const poem = buildFallbackPoem({
    prompt: 'Moonlight on a quiet river',
    language: 'urdu',
    form: 'ghazal',
    mood: 'ishq',
    length: 'short',
    style: 'classical',
    radif: 'ہے ابھی',
  });
  assert.equal(poem.language, 'urdu');
  assert.equal(poem.scriptDirection, 'rtl');
  assert.equal(poem.couplets.length, getTargetCoupletCount('ghazal', 'short'));
  assert.equal(poem.radifUsed, 'ہے ابھی');
  assert.ok(poem.couplets[0].lines[1].includes('ہے ابھی'));
});

test('deriveChatTitle generates bounded literary title from first user message', () => {
  assert.equal(deriveChatTitle('   '), 'New Literary Conversation');
  assert.equal(deriveChatTitle('Write a ghazal on rain'), 'Write a ghazal on rain');
  const longMsg = 'Can you compose a very long classical ghazal about the autumn leaves falling in an old garden at twilight?';
  const title = deriveChatTitle(longMsg);
  assert.ok(title.length <= 45);
  assert.ok(title.endsWith('...'));
});

test('segmentMessageContent separates prose and [VERSE] poetry blocks with RTL detection', () => {
  const msg = `Here is your couplet:\n\n[VERSE]\nدل کے ویران دریچوں میں تری یاد کا سفر ہے ابھی\nشامِ تنہائی میں روشن وہی اک رہگزر ہے ابھی\n[/VERSE]\n\nLet me know if you want to refine it.`;
  const segments = segmentMessageContent(msg);
  assert.equal(segments.length, 3);
  assert.equal(segments[0].type, 'prose');
  assert.equal(segments[1].type, 'poetry');
  assert.equal(segments[1].scriptDirection, 'rtl');
  assert.equal(segments[1].lines.length, 2);
  assert.equal(segments[2].type, 'prose');
});

test('detectUserIntent and buildContextualChatReply NEVER auto-generate poetry on greetings like hii or general chat', () => {
  assert.equal(detectUserIntent('hii'), 'greeting');
  assert.equal(detectUserIntent('hello'), 'greeting');
  assert.equal(detectUserIntent('kaise ho'), 'greeting');
  assert.equal(detectUserIntent('What is the capital of France?'), 'general_chat');

  const hiReply = buildContextualChatReply([{ role: 'user', content: 'hii' }]);
  assert.equal(hiReply.includes('[VERSE]'), false);

  const kaiseHoReply = buildContextualChatReply([{ role: 'user', content: 'kaise ho' }]);
  assert.equal(kaiseHoReply.includes('[VERSE]'), false);

  const generalReply = buildContextualChatReply([
    { role: 'user', content: 'Main jab bolu tabhi generate karna' },
  ]);
  assert.equal(generalReply.includes('[VERSE]'), false);
});

test('detectUserIntent and buildContextualChatReply DO generate poetry when explicitly requested', () => {
  assert.equal(detectUserIntent('Write a ghazal on rain'), 'poetry_request');
  assert.equal(detectUserIntent('ek shayari sunao'), 'poetry_request');

  const poemReply = buildContextualChatReply([
    { role: 'user', content: 'Write a ghazal on rain' },
  ]);
  assert.equal(poemReply.includes('[VERSE]'), true);
});

test('buildContextualChatReply handles contextual follow-ups like make it sadder when previous turn had a poem', () => {
  const history = [
    { role: 'user' as const, content: 'Write a couplet about rain' },
    { role: 'assistant' as const, content: '[VERSE]\nKacche aangan mein dabe paaon utar aayi shaam,\nHont par tere fasaane ki wohi baat reh gayi.\n[/VERSE]' },
    { role: 'user' as const, content: 'make it sadder' },
  ];
  const reply = buildContextualChatReply(history);
  assert.ok(reply.includes('[VERSE]'));
  assert.ok(reply.toLowerCase().includes('hijr') || reply.toLowerCase().includes('melancholic'));
});
