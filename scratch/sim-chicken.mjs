import { resetConversation, runConversationTurn } from '../src/workers/conversationTurn.js';
import { seedMockEmbeddings } from '../src/workers/engines/embeddingEngine.js';
import { ruleNlu } from '../src/workers/nlu/ruleNlu.js';
import { cleanTextString } from '../src/workers/utils/tokenizer.js';
import { buildNluFrame } from '../src/workers/nlu/validate.js';

seedMockEmbeddings();

const text = '치킨 먹고 싶어';
const clean = cleanTextString(text);
const rule = ruleNlu(text, clean);
const frame = buildNluFrame(text, clean);
console.log('NLU', {
  intent: frame.intent,
  snackHints: frame.slots.snackHints,
  alcoholHints: frame.slots.alcoholHints,
  snackIds: frame.resolved?.snackIds?.slice(0, 8),
});

resetConversation();
const r = await runConversationTurn(text, { profile: { name: '테스트' } });
console.log('REC', {
  intent: r.facts?.intent,
  alc: r.recommendation?.alcohol?.name_ko,
  snack: r.recommendation?.snack?.name_ko,
  snackCat: r.recommendation?.snack?.category,
  answer: (r.answer || '').slice(0, 200),
  reason: r.facts?.reason,
});
