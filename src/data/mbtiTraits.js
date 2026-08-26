/**
 * MBTI → 술자리 취향 힌트 (소프트 가이드용).
 * 단정/낙인 금지: 추천 점수는 약하게만 반영하고, 멘트는 “경향”으로 표현.
 */

/** @type {Record<string, {
 *  label: string,
 *  vibe: string,
 *  moods: string[],
 *  drinkBias: string[],
 *  snackBias: string[],
 *  abv: 'low'|'mid'|'high'|'any',
 *  guideHint?: string,
 *  tip: string
 * }>} */
export const MBTI_TRAITS = {
  ISTJ: {
    label: '신중하고 확실한 타입',
    vibe: '안정·클래식',
    moods: ['comfort', 'honsul', 'friends'],
    drinkBias: ['소주', '맥주', '전통주'],
    snackBias: ['볶음/구이', '마른안주'],
    abv: 'mid',
    guideHint: 'honsul',
    tip: '검증된 조합, 과하지 않은 클래식 페어링을 선호하는 편이에요.',
  },
  ISFJ: {
    label: '다정하고 배려심 깊은 타입',
    vibe: '편안·따뜻',
    moods: ['comfort', 'romantic', 'friends'],
    drinkBias: ['막걸리', '와인', '맥주'],
    snackBias: ['국물류', '해산물'],
    abv: 'low',
    guideHint: 'mood',
    tip: '따뜻한 국물·부드러운 술처럼 사람을 배려하는 조합이 잘 맞아요.',
  },
  INFJ: {
    label: '깊고 섬세한 타입',
    vibe: '분위기·의미',
    moods: ['romantic', 'special', 'comfort', 'honsul'],
    drinkBias: ['와인', '하이볼', '전통주'],
    snackBias: ['해산물', '과일/디저트'],
    abv: 'low',
    guideHint: 'date',
    tip: '분위기와 여운이 있는 한 잔, 과하지 않은 섬세한 페어링을 좋아해요.',
  },
  INTJ: {
    label: '계획적이고 취향이 뚜렷한 타입',
    vibe: '정제·퀄리티',
    moods: ['special', 'honsul', 'comfort'],
    drinkBias: ['위스키', '와인', '하이볼'],
    snackBias: ['해산물', '마른안주'],
    abv: 'mid',
    guideHint: 'alcohol',
    tip: '잡다한 것보다 한 잔의 완성도가 중요해요. 깔끔한 페어링을 고를게요.',
  },
  ISTP: {
    label: '쿨하고 실용적인 타입',
    vibe: '심플·시원',
    moods: ['refresh', 'friends', 'honsul'],
    drinkBias: ['맥주', '소주', '하이볼'],
    snackBias: ['튀김/전', '마른안주'],
    abv: 'mid',
    guideHint: 'alcohol',
    tip: '복잡함보다 시원하고 간단한 조합이 잘 맞아요.',
  },
  ISFP: {
    label: '감각적이고 감성인 타입',
    vibe: '감성·취향',
    moods: ['romantic', 'comfort', 'happy'],
    drinkBias: ['와인', '막걸리', '하이볼'],
    snackBias: ['과일/디저트', '해산물'],
    abv: 'low',
    guideHint: 'mood',
    tip: '분위기·비주얼·맛의 결이 맞는 감성 페어링을 선호해요.',
  },
  INFP: {
    label: '이상과 감성을 중시하는 타입',
    vibe: '감성·위로',
    moods: ['comfort', 'romantic', 'sad', 'honsul'],
    drinkBias: ['와인', '막걸리', '하이볼'],
    snackBias: ['과일/디저트', '국물류'],
    abv: 'low',
    guideHint: 'mood',
    tip: '마음을 달래 주는 한 잔, 이야기 나누기 좋은 조합이 좋아요.',
  },
  INTP: {
    label: '호기심 많은 분석가 타입',
    vibe: '실험·다양',
    moods: ['refresh', 'special', 'honsul'],
    drinkBias: ['하이볼', '칵테일', '맥주', '위스키'],
    snackBias: ['마른안주', '해산물'],
    abv: 'mid',
    guideHint: 'general',
    tip: '색다른 조합·새로운 주종 탐험을 즐기는 편이에요.',
  },
  ESTP: {
    label: '즉흥적이고 에너지 넘치는 타입',
    vibe: '화끈·텐션',
    moods: ['celebrate', 'friends', 'happy', 'refresh'],
    drinkBias: ['맥주', '소주', '하이볼'],
    snackBias: ['튀김/전', '볶음/구이'],
    abv: 'high',
    guideHint: 'party',
    tip: '시끌벅적한 자리, 빠르게 도는 술·안주가 잘 맞아요.',
  },
  ESFP: {
    label: '분위기 메이커 타입',
    vibe: '파티·즐거움',
    moods: ['celebrate', 'friends', 'happy'],
    drinkBias: ['맥주', '하이볼', '칵테일'],
    snackBias: ['튀김/전', '과일/디저트'],
    abv: 'mid',
    guideHint: 'party',
    tip: '함께 웃을 수 있는 메뉴, 술게임과도 잘 어울려요.',
  },
  ENFP: {
    label: '열정적이고 아이디어 많은 타입',
    vibe: '설렘·다양',
    moods: ['happy', 'friends', 'celebrate', 'romantic'],
    drinkBias: ['하이볼', '맥주', '와인', '칵테일'],
    snackBias: ['과일/디저트', '튀김/전'],
    abv: 'mid',
    guideHint: 'general',
    tip: '새로운 조합·톡톡 튀는 페어링을 좋아해요.',
  },
  ENTP: {
    label: '재치 있고 도전적인 타입',
    vibe: '유쾌·실험',
    moods: ['friends', 'celebrate', 'refresh', 'happy'],
    drinkBias: ['하이볼', '맥주', '위스키', '칵테일'],
    snackBias: ['볶음/구이', '튀김/전'],
    abv: 'mid',
    guideHint: 'game_guide',
    tip: '반전 있는 조합이나 술게임 있는 자리가 잘 맞아요.',
  },
  ESTJ: {
    label: '추진력 있는 리더 타입',
    vibe: '확실·공용',
    moods: ['friends', 'celebrate', 'happy'],
    drinkBias: ['소주', '맥주', '위스키'],
    snackBias: ['볶음/구이', '국물류'],
    abv: 'mid',
    guideHint: 'hoesik',
    tip: '여럿이 나눠 먹기 좋은 무난·확실한 조합을 선호해요.',
  },
  ESFJ: {
    label: '사람을 챙기는 사교 타입',
    vibe: '함께·따뜻',
    moods: ['friends', 'celebrate', 'romantic', 'happy'],
    drinkBias: ['맥주', '막걸리', '와인'],
    snackBias: ['국물류', '튀김/전', '볶음/구이'],
    abv: 'mid',
    guideHint: 'hoesik',
    tip: '모두가 즐길 수 있는 따뜻한 페어링이 잘 맞아요.',
  },
  ENFJ: {
    label: '공감 능력 뛰어난 타입',
    vibe: '배려·분위기',
    moods: ['friends', 'romantic', 'celebrate', 'comfort'],
    drinkBias: ['와인', '맥주', '하이볼'],
    snackBias: ['해산물', '과일/디저트', '국물류'],
    abv: 'low',
    guideHint: 'date',
    tip: '자리 분위기와 사람을 살리는 세심한 조합을 좋아해요.',
  },
  ENTJ: {
    label: '목표 지향적인 타입',
    vibe: '임팩트·퀄리티',
    moods: ['celebrate', 'special', 'friends'],
    drinkBias: ['위스키', '와인', '소주'],
    snackBias: ['볶음/구이', '해산물'],
    abv: 'high',
    guideHint: 'alcohol',
    tip: '존재감 있는 한 잔, 완성도 높은 페어링을 선호해요.',
  },
};

export function normalizeMbti(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (m.length !== 4) return null;
  return MBTI_TRAITS[m] ? m : null;
}

export function getMbtiTrait(raw) {
  const code = normalizeMbti(raw);
  if (!code) return null;
  return { code, ...MBTI_TRAITS[code] };
}
