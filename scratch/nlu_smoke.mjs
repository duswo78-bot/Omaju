/**
 * Phase 0 NLU 스모크: vite-node scratch/nlu_smoke.mjs
 */
import { cleanTextString } from '../src/workers/utils/tokenizer.js';
import { ruleNlu } from '../src/workers/nlu/ruleNlu.js';
import { buildNluFrame, parseFrontDraft } from '../src/workers/nlu/validate.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function check(label, text, expect) {
  const clean = cleanTextString(text);
  const frame = buildNluFrame(text, clean, null);
  if (expect.intent) assert(frame.intent === expect.intent, `${label}: intent ${frame.intent} != ${expect.intent}`);
  if (expect.onlySnack != null) {
    assert(Boolean(frame.slots.constraints.onlySnack) === expect.onlySnack, `${label}: onlySnack`);
  }
  if (expect.onlyAlcohol != null) {
    assert(Boolean(frame.slots.constraints.onlyAlcohol) === expect.onlyAlcohol, `${label}: onlyAlcohol`);
  }
  if (expect.nonAlcoholic != null) {
    assert(Boolean(frame.slots.constraints.nonAlcoholic) === expect.nonAlcoholic, `${label}: nonAlcoholic`);
  }
  if (expect.wantGame != null) {
    assert(Boolean(frame.slots.wantGame) === expect.wantGame, `${label}: wantGame`);
  }
  if (expect.hasAlcHint) {
    assert(frame.slots.alcoholHints.length > 0, `${label}: expected alcoholHints`);
  }
  if (expect.hasSnackHint) {
    assert(frame.slots.snackHints.length > 0, `${label}: expected snackHints`);
  }
  if (expect.maxResolvedSnacks != null) {
    assert(
      (frame.resolved?.snackIds?.length || 0) <= expect.maxResolvedSnacks,
      `${label}: too many snackIds ${frame.resolved?.snackIds?.length}`
    );
  }
  console.log(`OK  ${label} → ${frame.intent} alcHints=${frame.slots.alcoholHints.join('|') || '-'} snk=${frame.slots.snackHints.join('|') || '-'} resolvedSnk=${frame.resolved?.snackIds?.length || 0}`);
}

check('greeting', '안녕', { intent: 'GREETING' });
check('thanks', '고마워', { intent: 'THANKS' });
check('reroll', '다른 거 추천해줘', { intent: 'REROLL' });
check('only snack', '안주만 추천해줘', { intent: 'RECOMMEND', onlySnack: true });
check('only alc', '술만 골라줘', { intent: 'RECOMMEND', onlyAlcohol: true });
check('nonalc', '논알콜로 부탁', { intent: 'RECOMMEND', nonAlcoholic: true });
check('soju', '소주 마실건데', { intent: 'RECOMMEND', hasAlcHint: true });
check('chicken', '치킨 땡겨', { intent: 'RECOMMEND', hasSnackHint: true });
check('game', '술게임 추천해줘', { intent: 'RECOMMEND', wantGame: true });
check('sashimi short', '회 먹고 싶다', { intent: 'RECOMMEND', hasSnackHint: true, maxResolvedSnacks: 40 });

const draft = parseFrontDraft('```json\n{"intent":"RECOMMEND","slots":{"alcoholHints":["맥주"],"constraints":{"onlySnack":false}},"confidence":0.8}\n```');
assert(draft?.intent === 'RECOMMEND', 'parseFrontDraft intent');
assert(draft.slots.alcoholHints.includes('맥주'), 'parseFrontDraft beer');

const merged = buildNluFrame('안주만', cleanTextString('안주만'), {
  intent: 'RECOMMEND',
  slots: { alcoholHints: ['소주'], constraints: { onlySnack: true } },
  confidence: 0.9,
});
assert(merged.source === 'merged', 'merged source');
assert(merged.slots.constraints.onlySnack === true, 'merged keeps onlySnack');
assert(merged.slots.alcoholHints.includes('소주'), 'merged keeps draft alc');

// ruleNlu alone still works
const r = ruleNlu('안녕하세요', cleanTextString('안녕하세요'));
assert(r.intent === 'GREETING', 'rule greeting long may fail length');

console.log('\nAll NLU smoke checks passed.');
