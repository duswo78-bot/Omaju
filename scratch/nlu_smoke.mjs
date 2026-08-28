/**
 * 강화된 규칙 NLU 스모크: npx vite-node scratch/nlu_smoke.mjs
 */
import { cleanTextString } from '../src/workers/utils/tokenizer.js';
import { buildNluFrame } from '../src/workers/nlu/validate.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function check(label, text, expect) {
  const clean = cleanTextString(text);
  const frame = buildNluFrame(text, clean, null);
  if (expect.intent) {
    assert(frame.intent === expect.intent, `${label}: intent ${frame.intent} != ${expect.intent}`);
  }
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
  if (expect.guideHint) {
    assert(frame.guideHint === expect.guideHint, `${label}: guideHint ${frame.guideHint} != ${expect.guideHint}`);
  }
  console.log(
    `OK  ${label} → ${frame.intent} score=${frame.domainScore} hint=${frame.guideHint || '-'} alc=${frame.slots.alcoholHints.join('|') || '-'} snk=${frame.slots.snackHints.join('|') || '-'}`
  );
}

check('greeting', '안녕', { intent: 'GREETING' });
check('thanks', '고마워', { intent: 'THANKS' });
check('affirm', '응', { intent: 'AFFIRM' });
check('deny', '아니', { intent: 'DENY' });
check('reroll', '다른 거 추천해줘', { intent: 'REROLL' });
check('only snack', '안주만 추천해줘', { intent: 'RECOMMEND', onlySnack: true });
check('only alc', '술만 골라줘', { intent: 'RECOMMEND', onlyAlcohol: true });
check('nonalc', '논알콜로 부탁', { intent: 'RECOMMEND', nonAlcoholic: true });
check('soju', '소주 마실건데', { intent: 'RECOMMEND', hasAlcHint: true });
check('chicken', '치킨 땡겨', { intent: 'RECOMMEND', hasSnackHint: true });
check('game', '술게임 추천해줘', { intent: 'RECOMMEND', wantGame: true });
check('sashimi', '회 먹고 싶다', { intent: 'RECOMMEND', hasSnackHint: true });
check('vague recommend', '추천해줘', { intent: 'GUIDE' });
check('vague what', '뭐하지', { intent: 'GUIDE' });
check('place cafe', '근처 카페 추천해줘', { intent: 'PLACE' });
check('place bar', '근처 술집 찾아줘', { intent: 'PLACE' });
check('place food', '주변 맛집', { intent: 'PLACE' });
check('complaint', '이게 뭐야', { intent: 'COMPLAINT' });
check('weather talk', '비 온다', { intent: 'SMALLTALK' });
check('mood stress', '오늘 너무 스트레스 받아', { intent: 'MOOD' });
check('mood feeling', '기분 안 좋아', { intent: 'MOOD' });
check('goodbye', '이만 끊을게', { intent: 'GOODBYE' });
check('offtopic stock', '오늘 삼성 주가 어때', { intent: 'OFFTOPIC' });
check('offtopic code', '파이썬 버그 고쳐줘', { intent: 'OFFTOPIC' });
check('offtopic but drink', '주식 얘기는 됐고 맥주 추천해줘', { intent: 'RECOMMEND', hasAlcHint: true });
check('meta', '오마주는 뭐하는 앱이야', { intent: 'QUESTION' });
check('exclude', '치킨 말고 안주', { intent: 'RECOMMEND', hasSnackHint: true });
check('driving', '운전해야 해서 술 없이', { intent: 'RECOMMEND', nonAlcoholic: true });

// 한글 변이/슬랭
check('slang chimaek', '치맥ㄱㄱ', { intent: 'RECOMMEND', hasAlcHint: true, hasSnackHint: true });
check('slang soju', '소쥬 추천좀요', { intent: 'RECOMMEND', hasAlcHint: true });
check('slang mak', '마걸리 한잔', { intent: 'RECOMMEND', hasAlcHint: true });
check('slang hungry', '배고프당 암거나', { intent: 'GUIDE' });
check('slang honsul', '혼맥할래여', { intent: 'RECOMMEND', hasAlcHint: true });
check('slang nonalc', '논알로 부탁해여', { intent: 'RECOMMEND', nonAlcoholic: true });
check('slang affirm', '조아', { intent: 'AFFIRM' });
check('slang thanks', 'ㄱㅅ', { intent: 'THANKS' });
check('typo hangover', '혀장 뭐먹지', { intent: 'RECOMMEND' });
check('highball snack ask', '하이볼에 뭐 먹지', { intent: 'RECOMMEND', hasAlcHint: true });
check('spicy snack', '매콤한 안주 추천', { intent: 'RECOMMEND', onlySnack: true });
check('typo soju', '쓰오주 추천', { intent: 'RECOMMEND', hasAlcHint: true });
check('light drink', '가볍게 한잔', { intent: 'RECOMMEND' });
check('unknown laugh', 'ㅋㅋㅋㅋ', { intent: 'UNKNOWN' });
check('unknown jamo', 'ㅁㄴㅇㄹ', { intent: 'UNKNOWN' });
check('unknown short', 'ㅇ', { intent: 'UNKNOWN' });

console.log('\nAll enhanced NLU smoke checks passed.');
