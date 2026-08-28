/**
 * Semantic Conversation Engine smoke
 * npx vite-node scratch/semantic_smoke.mjs
 */
import { cleanTextString } from '../src/workers/utils/tokenizer.js';
import { buildNluFrame } from '../src/workers/nlu/validate.js';
import {
  annotateGlossary,
  buildSemanticFrame,
  decideResponsePolicy,
  resetDialogueState,
  inheritDialogueState,
  updateDialogueStateFromFrame,
  setLastBotAsk,
  getLastBotAsk,
  composeSemanticReply,
} from '../src/workers/semantic/index.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function frameOf(text) {
  const nlu = buildNluFrame(text, cleanTextString(text), null);
  const g = annotateGlossary(text);
  return { nlu, sem: buildSemanticFrame(nlu, g) };
}

resetDialogueState();

// 1) rain + tired
{
  const { nlu, sem } = frameOf('오늘 비도 오고 힘들다');
  assert(sem.weather.includes('rain'), 'weather rain');
  assert(sem.mood === 'negative', 'mood negative');
  assert(sem.energy === 'low', 'energy low');
  assert(nlu.intent === 'MOOD' || nlu.intent === 'SMALLTALK', `intent mood-ish got ${nlu.intent}`);
  const pol = decideResponsePolicy(sem);
  assert(pol.action === 'ask' || pol.action === 'empathy', `policy ${pol.action}`);
  const reply = composeSemanticReply(sem, 'ask');
  assert(reply.length > 10, 'compose reply');
  console.log('OK  rain+tired', { intent: nlu.intent, pol: pol.action, reply: reply.slice(0, 60) });
}

// 2) inherit + affirm → recommend
{
  resetDialogueState();
  const s1 = frameOf('오늘 비도 오고 힘들다').sem;
  inheritDialogueState(s1);
  updateDialogueStateFromFrame(s1);
  setLastBotAsk('recommend');
  const s2 = frameOf('응').sem;
  inheritDialogueState(s2);
  assert(s2.weather.includes('rain'), 'inherited rain');
  const pol2 = decideResponsePolicy(s2, { lastBotAsk: getLastBotAsk() });
  assert(pol2.action === 'recommend', `got ${pol2.action}`);
  console.log('OK  affirm→recommend with rain inherit');
}

// 3) happy party
{
  const { sem } = frameOf('오늘 합격해서 신나');
  assert(sem.mood === 'positive', 'positive mood');
  assert(sem.energy === 'high', 'high energy');
  console.log('OK  happy', sem);
}

// 4) alone honsul idiom
{
  const { sem } = frameOf('혼자 가볍게 한잔');
  assert(sem.relation === 'alone', 'alone');
  assert(sem.openToRecommend !== 'no', 'open recommend');
  console.log('OK  alone drink', { relation: sem.relation, open: sem.openToRecommend, light: sem.constraints.light });
}

// 5) slang
{
  const g = annotateGlossary('치맥각');
  assert(g.normalized.includes('치킨') || g.normalized.includes('맥주'), 'chimaek');
  console.log('OK  slang', g.normalized);
}

// 6) unknown-ish
{
  const { nlu, sem } = frameOf('ㅋㅋㅋㅋ');
  assert(nlu.intent === 'UNKNOWN', 'unknown');
  const pol = decideResponsePolicy(sem);
  assert(pol.action === 'apology', `apology got ${pol.action}`);
  console.log('OK  unknown→apology');
}

// 7) place
{
  const { nlu, sem } = frameOf('근처 카페 추천해줘');
  assert(nlu.intent === 'PLACE', 'place');
  const pol = decideResponsePolicy(sem);
  assert(pol.action === 'place', `place action ${pol.action}`);
  console.log('OK  place policy');
}

// 8) date wine
{
  const { sem } = frameOf('데이트라 분위기 있는 와인');
  assert(sem.relation === 'date' || sem.alcoholHints.includes('와인'), 'date/wine');
  console.log('OK  date wine', { relation: sem.relation, alc: sem.alcoholHints });
}

console.log('\nSemantic smoke passed.');
