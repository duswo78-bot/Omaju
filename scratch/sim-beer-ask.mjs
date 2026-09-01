import { resetConversation, runConversationTurn } from '../src/workers/conversationTurn.js';
import { seedMockEmbeddings } from '../src/workers/engines/embeddingEngine.js';
import { decideResponsePolicy } from '../src/workers/semantic/policy.js';
import { buildNluFrame } from '../src/workers/nlu/validate.js';
import { cleanTextString } from '../src/workers/utils/tokenizer.js';

seedMockEmbeddings();

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) Policy: 맥주+RECOMMEND → recommend (날씨 있어도)
{
  const p = decideResponsePolicy({
    intent: 'RECOMMEND',
    openToRecommend: 'hard',
    alcoholHints: ['맥주'],
    snackHints: [],
    weather: ['rain'],
    mood: 'negative',
  });
  assert(p.action === 'recommend', `policy expected recommend got ${p.action}/${p.reason}`);
  console.log('OK policy rain+beer → recommend');
}

// 2) Merge: rule RECOMMEND not overwritten by draft MOOD
{
  const raw = '맥주 추천해줘';
  const frame = buildNluFrame(raw, cleanTextString(raw), {
    intent: 'MOOD',
    slots: { alcoholHints: [], snackHints: [], moods: ['tired'], weather: ['rain'] },
    confidence: 0.9,
  });
  assert(frame.intent === 'RECOMMEND', `merge expected RECOMMEND got ${frame.intent}`);
  console.log('OK merge draft MOOD cannot override beer RECOMMEND');
}

// 3) End-to-end: 바로 카드
resetConversation();
{
  const r = await runConversationTurn('맥주 추천해줘', { profile: { name: '테스트' } });
  assert(r.facts?.intent === 'RECOMMEND', `intent ${r.facts?.intent}`);
  assert(r.recommendation?.alcohol?.name_ko, 'expected alcohol card');
  assert(!/따뜻한\s*거|시원한\s*거|추천할까요|추천해드릴까요/.test(r.answer || ''), `soft-ask leak: ${r.answer}`);
  console.log('OK turn →', r.recommendation.alcohol.name_ko, '+', r.recommendation.snack?.name_ko);
}

// 4) 날씨 잡담 후 맥주 추천 → 질문 없이 추천
resetConversation();
{
  await runConversationTurn('비 오네 우울하다', { profile: { name: '테스트' } });
  const r = await runConversationTurn('맥주 추천해줘', { profile: { name: '테스트' } });
  assert(r.recommendation?.alcohol?.name_ko, 'expected alcohol after weather turn');
  assert(!/따뜻한\s*거\s*\?|시원한\s*거\s*\?/.test(r.answer || ''), `ask after weather: ${r.answer}`);
  console.log('OK after rain mood → beer recommend', r.recommendation.alcohol.name_ko);
}

console.log('All beer-ask UX checks passed');
