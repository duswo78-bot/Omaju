import emotionsDataJson from '../../data/emotions.json';
import situationsDataJson from '../../data/situations.json';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import { emptyFrame } from './schema.js';
import {
  DOMAIN_CORE,
  DOMAIN_SOFT,
  OFFTOPIC_STRONG,
  OFFTOPIC_SOFT,
  META_APP,
  AFFIRM,
  DENY,
  GUIDE_TRIGGERS,
} from './domainLexicon.js';

const ALC_CATEGORY_HINTS = [
  '소주', '맥주', '막걸리', '와인', '하이볼', '위스키', '칵테일', '보드카', '전통주', '과실주', '청하',
];
const ALC_NAME_HINTS = alcoholsData.map((a) => a.name_ko).filter(Boolean);
const SNK_NAME_HINTS = snacksData.map((s) => s.name_ko).filter(Boolean);
const SHORT_SNACKS = ['회', '치킨', '삼겹', '곱창', '라면', '전', '파전', '족발', '보쌈', '김치', '피자', '튀김', '꼬치'];

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function countHits(text, list) {
  let n = 0;
  for (const k of list) {
    if (k && text.includes(k)) n += 1;
  }
  return n;
}

function scoreDomain(text) {
  let score = 0;
  score += countHits(text, DOMAIN_CORE) * 3;
  score += countHits(text, DOMAIN_SOFT) * 1;
  score += countHits(text, META_APP) * 2;
  score -= countHits(text, OFFTOPIC_STRONG) * 4;
  score -= countHits(text, OFFTOPIC_SOFT) * 1;
  return score;
}

function detectSignals(text) {
  const signals = {
    moods: [],
    weather: [],
    matchedOpening: null,
    detectedEmotion: null,
    detectedSituation: null,
  };

  for (const emo of emotionsDataJson) {
    if (emo.keywords?.some((k) => text.includes(k))) {
      signals.detectedEmotion = emo;
      if (emo.id === 'emo_stress') signals.moods.push('stressed', 'friends', 'refresh');
      if (emo.id === 'emo_sad') signals.moods.push('sad', 'comfort', 'honsul');
      if (emo.id === 'emo_happy') signals.moods.push('happy', 'celebrate', 'friends');
      if (emo.id === 'emo_tired') signals.moods.push('tired', 'comfort', 'honsul');
      if (emo.openings?.length) {
        signals.matchedOpening = emo.openings[Math.floor(Math.random() * emo.openings.length)];
      }
      break;
    }
  }

  for (const sit of situationsDataJson) {
    if (sit.keywords?.some((k) => text.includes(k))) {
      signals.detectedSituation = sit;
      if (sit.id === 'sit_rain') signals.weather.push('rain', 'humid');
      if (sit.id === 'sit_snow') signals.weather.push('cold', 'winter');
      if (sit.id === 'sit_hoesik') signals.moods.push('friends', 'celebrate');
      if (sit.id === 'sit_date') signals.moods.push('romantic', 'special');
      if (sit.id === 'sit_honsul') signals.moods.push('honsul', 'comfort');
      if (sit.id === 'sit_party') signals.moods.push('celebrate', 'friends', 'happy');
      if (sit.openings?.length) {
        signals.matchedOpening = sit.openings[Math.floor(Math.random() * sit.openings.length)];
      }
      break;
    }
  }

  return signals;
}

function extractHints(text) {
  const alcoholHints = [];
  for (const h of ALC_CATEGORY_HINTS) {
    if (text.includes(h)) alcoholHints.push(h);
  }
  for (const name of ALC_NAME_HINTS) {
    if (name.length >= 2 && text.includes(name)) alcoholHints.push(name);
  }

  const snackHints = [];
  for (const name of SNK_NAME_HINTS) {
    if (name.length >= 2 && text.includes(name)) snackHints.push(name);
  }
  for (const short of SHORT_SNACKS) {
    if (short.length === 1) {
      // "운전" 안의 "전" 오탐 방지
      const re = new RegExp(`(^|[^가-힣])${short}([^가-힣]|$)`);
      if (re.test(text)) snackHints.push(short);
    } else if (text.includes(short)) {
      snackHints.push(short);
    }
  }

  return {
    alcoholHints: uniq(alcoholHints),
    snackHints: uniq(snackHints),
  };
}

function extractConstraints(text) {
  const exclude = [];
  // "A 말고", "A 제외", "A 빼고"
  const excludeRe = /([가-힣A-Za-z0-9]{1,12})\s*(말고|제외|빼고|싫|제외해)/g;
  let m;
  while ((m = excludeRe.exec(text)) !== null) {
    if (m[1] && !['그거', '이거', '저거', '다른'].includes(m[1])) exclude.push(m[1]);
  }

  return {
    onlyAlcohol: /술만|주류만|마실\s*것만/.test(text),
    onlySnack: /안주만|밥만|식사만|안주\s*위주|음식만/.test(text),
    nonAlcoholic: /논알콜|무알콜|술빼고|술\s*없이|알코올\s*없이|운전/.test(text),
    spicy: /매운|매콤|불닭|핫/.test(text),
    light: /담백|가벼운|라이트|시원/.test(text),
    cheap: /싸게|저렴|가성비|싼|저가/.test(text),
    hangover: /해장|숙취|속쓰|속이\s*안/.test(text),
    exclude: uniq(exclude),
  };
}

/** 짧은 긍정/부정만 — "아니 맥주" 같은 문장은 제외 */
function isPureShortReply(cleanText, list, maxLen = 6) {
  if (!cleanText || cleanText.length > maxLen) return false;
  return list.some((w) => cleanText === w || cleanText === `${w}${w}` || cleanText === `${w}요`);
}

function pickGuideHint(hints, constraints, signals, text = '') {
  if (constraints.nonAlcoholic) return 'nonalc';
  if (constraints.hangover || /해장|숙취/.test(text)) return 'hangover';
  if (constraints.onlySnack) return 'snack';
  if (constraints.onlyAlcohol) return 'alcohol';
  if (/혼술|혼자\s*마시|혼맥|혼소/.test(text) || signals.detectedSituation?.id === 'sit_honsul') {
    return 'honsul';
  }
  if (/회식|회식자리|회사\s*술|회식안주/.test(text) || signals.detectedSituation?.id === 'sit_hoesik') {
    return 'hoesik';
  }
  if (/데이트|소개팅|기념일|분위기\s*있게/.test(text) || signals.detectedSituation?.id === 'sit_date') {
    return 'date';
  }
  if (/파티|생일파티|집들이|펑펑/.test(text) || signals.detectedSituation?.id === 'sit_party') {
    return 'party';
  }
  if (/술게임|게임\s*추천|무슨\s*게임/.test(text)) return 'game_guide';
  if (signals.detectedEmotion || signals.moods?.length) return 'mood';
  if (signals.detectedSituation || signals.weather?.length) return 'situation';
  if (hints.alcoholHints.length && !hints.snackHints.length) return 'pair_snack';
  if (hints.snackHints.length && !hints.alcoholHints.length) return 'pair_drink';
  return 'general';
}

/**
 * @param {string} rawText
 * @param {string} cleanText
 * @returns {import('./schema.js').NluFrame}
 */
export function ruleNlu(rawText, cleanText) {
  const text = rawText || '';
  const clean = cleanText || text.replace(/\s/g, '');
  const signals = detectSignals(text);
  const hints = extractHints(text);
  const constraints = extractConstraints(text);
  const domainScore = scoreDomain(text);
  const hasEntity = hints.alcoholHints.length > 0 || hints.snackHints.length > 0;
  const wantGame =
    /술게임|게임\s*추천|재밌는\s*게임|놀\s*거리|랜덤\s*게임/.test(text) ||
    (text.includes('게임') && domainScore >= 0);

  // --- Intent 우선순위 ---
  let intent = 'GUIDE';
  let confidence = 0.55;
  let needsClarification;
  let guideHint;

  // 1) 짧은 긍정/부정 (상태머신에서 쓰임) — 순수 단답만
  if (isPureShortReply(clean, AFFIRM, 6)) {
    intent = 'AFFIRM';
    confidence = 0.85;
  } else if (isPureShortReply(clean, DENY, 6)) {
    intent = 'DENY';
    confidence = 0.85;
  }
  // 2) 인사/감사
  else if (['안녕', '하이', '반가', '방가', 'ㅎㅇ', '오랜만'].some((g) => clean.includes(g)) && clean.length <= 8) {
    intent = 'GREETING';
    confidence = 0.92;
  } else if (['고마', '감사', '땡큐', '최고야', '완벽해'].some((t) => clean.includes(t)) && clean.length <= 12) {
    intent = 'THANKS';
    confidence = 0.9;
  }
  // 3) 앱 메타 질문
  else if (META_APP.some((k) => text.includes(k)) && !hasEntity) {
    intent = 'QUESTION';
    confidence = 0.88;
  }
  // 4) 강한 이탈 → 공감 후 오마주로 유도
  else if (domainScore <= -2 && !hasEntity) {
    intent = 'OFFTOPIC';
    confidence = 0.86;
    guideHint = 'redirect';
  }
  // 5) 리롤 / 거절 ("치킨 말고"는 제외 제약이므로 리롤 아님)
  else if (
    ['다른거', '다른거로', '다시추천', '별로야', '패스', '바꿔줘', '노잼', '틀렸'].some((r) => clean.includes(r)) ||
    ((clean.includes('다른') || clean.includes('다시') || clean.includes('별로')) &&
      !/말고|제외|빼고/.test(text))
  ) {
    const moodOnly =
      ['덥', '추', '비', '눈', '우울', '슬퍼', '화나', '짜증', '피곤', '힘들', '심심', '외로'].some((wm) =>
        clean.includes(wm)
      ) &&
      !clean.includes('추천') &&
      !clean.includes('술') &&
      !clean.includes('안주') &&
      !hasEntity;
    intent = moodOnly ? 'SMALLTALK' : 'REROLL';
    confidence = 0.8;
  }
  // 6) 감정/스몰톡 (추천 키워드 없이)
  else if (
    signals.detectedEmotion &&
    !hasEntity &&
    !/추천|골라|뭐\s*마시|뭐\s*먹|안주|술\s*추천/.test(text)
  ) {
    intent = 'SMALLTALK';
    confidence = 0.78;
    guideHint = 'mood';
  }
  // 7) 막연한 "추천해줘/뭐하지" (엔티티·구체 제약 없음) → 유도
  else if (
    !hasEntity &&
    !constraints.onlyAlcohol &&
    !constraints.onlySnack &&
    !constraints.nonAlcoholic &&
    !wantGame &&
    GUIDE_TRIGGERS.some((g) => text.includes(g))
  ) {
    intent = 'GUIDE';
    confidence = 0.78;
    guideHint = pickGuideHint(hints, constraints, signals, text);
    needsClarification = '술·안주·상황 중 어떤 힌트를 줄까요?';
  }
  // 8) 명확한 추천 신호 + 엔티티/제약/게임
  else if (
    hasEntity ||
    constraints.onlyAlcohol ||
    constraints.onlySnack ||
    constraints.nonAlcoholic ||
    wantGame ||
    (/페어링|어울리|당기|땡겨|마실래|먹고싶/.test(text) && domainScore >= 2)
  ) {
    intent = 'RECOMMEND';
    confidence = hasEntity ? 0.88 : 0.75;
  }
  // 9) 도메인만 있고 애매함 → 유도
  else if (domainScore === 0 || (domainScore > 0 && !hasEntity)) {
    intent = 'GUIDE';
    confidence = 0.7;
    guideHint = pickGuideHint(hints, constraints, signals, text);
    needsClarification =
      guideHint === 'general'
        ? '술·안주·상황 중 어떤 힌트를 줄까요?'
        : '조금 더 구체적으로 알려주시면 딱 맞춰 드릴게요.';
  }
  // 10) 약한 이탈
  else if (domainScore < 0) {
    intent = 'OFFTOPIC';
    confidence = 0.72;
    guideHint = 'redirect';
  } else {
    intent = 'GUIDE';
    confidence = 0.6;
    guideHint = 'general';
  }

  // 엔티티가 있으면 이탈로 오분류된 경우 추천으로 교정
  if (hasEntity && (intent === 'OFFTOPIC' || intent === 'GUIDE' || intent === 'UNKNOWN')) {
    intent = 'RECOMMEND';
    confidence = Math.max(confidence, 0.82);
  }

  return emptyFrame({
    intent,
    slots: {
      alcoholHints: hints.alcoholHints,
      snackHints: hints.snackHints,
      wantGame,
      moods: uniq(signals.moods),
      weather: uniq(signals.weather),
      constraints,
    },
    confidence,
    domainScore,
    needsClarification,
    guideHint,
    source: 'rule',
    rawText: text,
    matchedOpening: signals.matchedOpening,
  });
}

export { detectSignals, scoreDomain };
