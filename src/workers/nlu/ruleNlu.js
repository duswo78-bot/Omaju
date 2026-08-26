import emotionsDataJson from '../../data/emotions.json';
import situationsDataJson from '../../data/situations.json';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import { emptyFrame } from './schema.js';

const ALC_CATEGORY_HINTS = [
  '소주', '맥주', '막걸리', '와인', '하이볼', '위스키', '칵테일', '보드카', '전통주', '과실주', '청하',
];

const ALC_NAME_HINTS = alcoholsData.map((a) => a.name_ko).filter(Boolean);
const SNK_NAME_HINTS = snacksData.map((s) => s.name_ko).filter(Boolean);

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
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

function detectIntent(cleanText) {
  const greetings = ['안녕', '하이', '반가', '방가', 'ㅎㅇ', '오랜만'];
  if (greetings.some((g) => cleanText.includes(g)) && cleanText.length <= 6) return 'GREETING';

  const thanks = ['고마', '감사', '땡큐', '최고', '짱', '좋네', '완벽', '굿'];
  if (thanks.some((t) => cleanText.includes(t)) && cleanText.length <= 10) return 'THANKS';

  const rerolls = ['다른', '다시', '별로', '싫어', '패스', '바꿔', '말고', '아니', '노잼', '틀렸'];
  if (rerolls.some((r) => cleanText.includes(r))) {
    const weatherMood = ['덥', '더워', '더운', '추', '추워', '추운', '비', '눈', '우울', '슬퍼', '슬픈', '화나', '화가', '짜증', '피곤', '힘들', '심심', '외로'];
    if (
      weatherMood.some((wm) => cleanText.includes(wm)) &&
      !cleanText.includes('추천') &&
      !cleanText.includes('먹') &&
      !cleanText.includes('술') &&
      !cleanText.includes('안주')
    ) {
      return 'SMALLTALK';
    }
    return 'REROLL';
  }

  const smalltalks = [
    '멍청', '바보', '심심', '외로', '뭐해', '놀자', '짜증', '우울', '피곤', '힘들',
    '덥', '더워', '더운', '더웠', '추', '추워', '추운', '추웠', '비', '눈', '날씨',
    '슬퍼', '슬픈', '화나', '화가', '미치겠',
  ];
  if (smalltalks.some((s) => cleanText.includes(s))) {
    if (
      !cleanText.includes('술') &&
      !cleanText.includes('추천') &&
      !cleanText.includes('먹') &&
      !cleanText.includes('안주') &&
      !cleanText.includes('뭐')
    ) {
      return 'SMALLTALK';
    }
  }

  const questions = ['누구', '뭐야', '이름', '오마주', '어때', '알려'];
  if (
    questions.some((q) => cleanText.includes(q)) &&
    !cleanText.includes('추천') &&
    !cleanText.includes('게임') &&
    cleanText.length <= 15
  ) {
    return 'QUESTION';
  }

  if (cleanText.includes('게임') || cleanText.includes('놀자') || cleanText.includes('재밌는거')) {
    return 'RECOMMEND';
  }

  return 'RECOMMEND';
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
  // 짧은 음식명 보강
  for (const short of ['회', '치킨', '삼겹', '곱창', '라면', '전', '파전', '족발', '보쌈', '김치']) {
    if (text.includes(short)) snackHints.push(short);
  }

  return {
    alcoholHints: uniq(alcoholHints),
    snackHints: uniq(snackHints),
  };
}

function extractConstraints(text) {
  return {
    onlyAlcohol: text.includes('술만'),
    onlySnack: text.includes('안주만') || text.includes('밥만') || text.includes('식사만'),
    nonAlcoholic: text.includes('논알콜') || text.includes('무알콜') || text.includes('술빼고'),
    exclude: [],
  };
}

/**
 * 규칙 기반 NLU — 항상 Frame을 반환한다.
 * @param {string} rawText
 * @param {string} cleanText
 * @returns {import('./schema.js').NluFrame}
 */
export function ruleNlu(rawText, cleanText) {
  const signals = detectSignals(rawText);
  const intent = detectIntent(cleanText);
  const hints = extractHints(rawText);
  const constraints = extractConstraints(rawText);
  const wantGame =
    cleanText.includes('게임') || cleanText.includes('놀자') || cleanText.includes('재밌는거');

  let confidence = 0.55;
  if (intent === 'GREETING' || intent === 'THANKS') confidence = 0.9;
  if (hints.alcoholHints.length || hints.snackHints.length) confidence = Math.max(confidence, 0.7);
  if (constraints.onlyAlcohol || constraints.onlySnack || constraints.nonAlcoholic) {
    confidence = Math.max(confidence, 0.75);
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
    source: 'rule',
    rawText,
    matchedOpening: signals.matchedOpening,
  });
}

export { detectSignals };
