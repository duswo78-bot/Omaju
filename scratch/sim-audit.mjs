/**
 * 추가 엣지 케이스 점검
 * npx vite-node scratch/sim-audit.mjs
 */
import { seedMockEmbeddings } from '../src/workers/engines/embeddingEngine.js';
import { resetConversation, runConversationTurn } from '../src/workers/conversationTurn.js';

seedMockEmbeddings();

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function turns(...users) {
  resetConversation();
  const out = [];
  for (const u of users) {
    out.push(await runConversationTurn(u, { profile: { name: '테스트' } }));
  }
  return out;
}

const issues = [];
function check(name, fn) {
  return fn()
    .then(() => console.log('OK ', name))
    .catch((e) => {
      console.error('FAIL', name, e.message);
      issues.push({ name, error: e.message });
    });
}

await check('deny after soft ask (exact user case)', async () => {
  const t = await turns('ㅁㄴㅇㄹ', '아니');
  // unknown asks drink-ish question
  assert(/죄송|몰라|다시|미안|놓친|이해/.test(t[0].answer), `apology: ${t[0].answer}`);
  assert(t[1].frame.intent === 'DENY', `intent ${t[1].frame.intent}`);
  assert(!t[1].recommendation?.alcohol && !t[1].recommendation?.snack, 'must not recommend');
  assert(!/추천해드|픽\(Pick\)|오늘의 제/.test(t[1].answer), `must not sound like rec: ${t[1].answer}`);
});

await check('deny after mood ask', async () => {
  const t = await turns('비 오고 힘들다', '아니');
  assert(t[0].semantic.weather.includes('rain'), 'rain');
  assert(t[1].frame.intent === 'DENY', 'deny');
  assert(!t[1].recommendation, 'no rec object');
});

await check('affirm after mood ask still recommends', async () => {
  const t = await turns('비 오고 힘들다', '응');
  assert(t[1].recommendation?.alcohol || t[1].recommendation?.snack, 'should recommend on yes');
});

await check('awaiting confirm deny → reroll ok', async () => {
  const t = await turns('맥주 추천해줘', '아니');
  // after recommend, DENY in AWAITING_REC_CONFIRM should reroll (different path)
  assert(t[0].recommendation, 'first rec');
  assert(t[1].state === 'AWAITING_REC_CONFIRM' || t[1].recommendation || t[1].frame.intent === 'DENY', 'handled');
  // If DENY after card: may reroll — that's OK. Just ensure we got a response.
  assert(t[1].answer, 'has answer');
});

await check('onlySnack no alcohol', async () => {
  const t = await turns('안주만 추천해줘');
  assert(t[0].recommendation?.snack, 'snack');
  assert(!t[0].recommendation?.alcohol, `alc leaked ${t[0].recommendation?.alcohol?.name_ko}`);
});

await check('onlyAlcohol no snack force? allow snack pair unless onlyAlcohol clears snack', async () => {
  const t = await turns('술만 추천해줘');
  assert(t[0].recommendation?.alcohol, 'alcohol');
  // onlyAlcohol should clear snack
  assert(!t[0].recommendation?.snack, `snack leaked ${t[0].recommendation?.snack?.name_ko}`);
});

await check('inherit weather across deny then new request', async () => {
  const t = await turns('비 온다', '아니', '막걸리 추천');
  assert(t[2].frame.intent === 'RECOMMEND', 'recommend');
  assert(t[2].semantic.weather.includes('rain'), 'still has rain context');
  assert(t[2].recommendation?.alcohol || t[2].recommendation?.snack, 'has rec');
});

await check('place does not fall into recommend', async () => {
  const t = await turns('근처 술집 찾아줘');
  assert(t[0].frame.intent === 'PLACE', `got ${t[0].frame.intent}`);
  assert(!t[0].recommendation?.alcohol, 'no alc card for place');
});

await check('complaint no recommend', async () => {
  const t = await turns('이게 뭐야');
  assert(t[0].frame.intent === 'COMPLAINT', `got ${t[0].frame.intent}`);
  assert(!t[0].recommendation, 'no rec');
  assert(/죄송|미안/.test(t[0].answer), 'apology');
});

await check('double soft ask deny deny', async () => {
  const t = await turns('심심해', '아니', '아니');
  assert(!t[1].recommendation && !t[2].recommendation, 'no rec on denies');
});

await check('decline alcohol: 오늘은 안마실래', async () => {
  const t = await turns('오늘은 안마실래');
  assert(t[0].frame.intent === 'DECLINE_ALCOHOL', `expected DECLINE_ALCOHOL got ${t[0].frame.intent}`);
  assert(!t[0].recommendation?.alcohol && !t[0].recommendation?.snack, 'no alcohol or snack rec');
  assert(/쉬어|무리|휴식|힐링|알콜 프리|건강|간|술 없는 하루|술 생각 없는|소확행|안 나는 날|릴랙스|리프레시/.test(t[0].answer), `empathetic response: ${t[0].answer}`);
});

await check('decline alcohol: 오늘은 안땡겨', async () => {
  const t = await turns('오늘은 안땡겨');
  assert(t[0].frame.intent === 'DECLINE_ALCOHOL', `got ${t[0].frame.intent}`);
  assert(!t[0].recommendation?.alcohol, 'no alc rec');
});

await check('decline then only snack: 오늘은 안마실래 -> 안주만', async () => {
  const t = await turns('오늘은 안마실래', '안주만');
  assert(t[0].frame.intent === 'DECLINE_ALCOHOL', `turn 0 DECLINE_ALCOHOL got ${t[0].frame.intent}`);
  assert(!t[0].recommendation?.alcohol && !t[0].recommendation?.snack, 'turn 0 no rec');
  
  assert(t[1].recommendation?.snack, 'turn 1 has snack');
  assert(!t[1].recommendation?.alcohol, `turn 1 must NOT have alcohol, got ${t[1].recommendation?.alcohol?.name_ko}`);
  assert(!/소주|맥주|와인|위스키|막걸리|도수|한 잔/.test(t[1].answer), `answer must not mention alcohol: ${t[1].answer}`);
});

await check('single turn: 안주만 추천해줘', async () => {
  const t = await turns('안주만 추천해줘');
  assert(t[0].recommendation?.snack, 'has snack');
  assert(!t[0].recommendation?.alcohol, `must not have alcohol, got ${t[0].recommendation?.alcohol?.name_ko}`);
});

await check('mbti turn: 나 INFP야', async () => {
  const t = await turns('나 INFP야');
  assert(t[0].frame.intent === 'RECOMMEND', `expected RECOMMEND got ${t[0].frame.intent}`);
  assert(t[0].recommendation, 'has recommendation');
  assert(/INFP|감성|이상/.test(t[0].answer), `answer mentions INFP trait: ${t[0].answer}`);
});

await check('mbti guide: MBTI 알아?', async () => {
  const t = await turns('MBTI 알아?');
  assert(t[0].frame.intent === 'GUIDE', `expected GUIDE got ${t[0].frame.intent}`);
  assert(/MBTI|성향|페어링/.test(t[0].answer), `answer guides MBTI: ${t[0].answer}`);
});

await check('baijiu recognition: 바이주', async () => {
  const t = await turns('바이주');
  assert(t[0].frame.intent === 'RECOMMEND', `expected RECOMMEND got ${t[0].frame.intent}`);
  assert(t[0].frame.slots.alcoholHints.includes('바이주'), 'has 바이주 alcoholHint');
});

await check('goodbye: 바이바이 & 바이', async () => {
  const t1 = await turns('바이바이');
  assert(t1[0].frame.intent === 'GOODBYE', `expected GOODBYE got ${t1[0].frame.intent}`);
  const t2 = await turns('바이');
  assert(t2[0].frame.intent === 'GOODBYE', `expected GOODBYE got ${t2[0].frame.intent}`);
});

console.log(`\nAudit done. failures=${issues.length}`);
if (issues.length) {
  console.error(issues);
  process.exit(1);
}
console.log('Audit passed.');
