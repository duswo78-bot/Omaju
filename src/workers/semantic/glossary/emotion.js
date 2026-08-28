/**
 * 감정 표현 → valence / energy / label
 * @typedef {'positive'|'negative'|'neutral'} MoodValence
 * @typedef {'low'|'mid'|'high'} EnergyLevel
 */

/** @type {Array<{ label: string, valence: MoodValence, energy: EnergyLevel, catalogMoods: string[], keys: string[] }>} */
export const EMOTION_ENTRIES = [
  {
    label: 'stressed',
    valence: 'negative',
    energy: 'mid',
    catalogMoods: ['stressed', 'friends', 'refresh'],
    keys: [
      '스트레스', '화나', '열받', '짜증', '빡쳐', '현타', '멘붕', '싸웠', '다퉜',
      '빡침', '개빡', '열받네', '진빠', '답답', '스트레스받', '화났', '짜증나',
    ],
  },
  {
    label: 'sad',
    valence: 'negative',
    energy: 'low',
    catalogMoods: ['sad', 'comfort', 'honsul'],
    keys: [
      '슬퍼', '우울', '눈물', '외로', '힘들', '속상', '이별', '꿀꿀', '울적',
      '서운', '허무', '무기력', '우울해', '힘들어', '힘드네', '우울하다', '슬프다',
      '마음이 무거', '기분이 안', '기분 안', '우울해여', '외롭다', '외로워',
    ],
  },
  {
    label: 'tired',
    valence: 'negative',
    energy: 'low',
    catalogMoods: ['tired', 'comfort', 'honsul'],
    keys: [
      '피곤', '지쳐', '녹초', '기운없', '힘빠져', '방전', '개피곤', '야근',
      '번아웃', '기진맥진', '지침', '피곤해', '지쳤', '피곤하다', '졸려', '졸린',
      '피곤해여', '피곤해요', '녹아버', '뻗었',
    ],
  },
  {
    label: 'happy',
    valence: 'positive',
    energy: 'high',
    catalogMoods: ['happy', 'celebrate', 'refresh'],
    keys: [
      '신나', '행복', '기분좋', '기뻐', '합격', '축하', '최고야',
      '개좋아', '기분째', '설레', '들뜬', '짜릿', '신나네', '행복해', '기뻐요',
    ],
  },
  {
    label: 'bored',
    valence: 'neutral',
    energy: 'mid',
    catalogMoods: ['refresh', 'friends'],
    keys: ['심심', '심심해', '할거없', '지루', '심심하다', '심심하네', '심심해요'],
  },
  {
    label: 'calm',
    valence: 'neutral',
    energy: 'mid',
    catalogMoods: ['comfort', 'honsul'],
    keys: ['평온', '차분', '그냥그래', '보통', '그럭저럭', '그저그래'],
  },
];

/**
 * @param {string} text
 * @returns {{ labels: string[], valence: MoodValence|null, energy: EnergyLevel|null, catalogMoods: string[] }}
 */
export function matchEmotion(text) {
  const t = String(text || '');
  const labels = [];
  const catalogMoods = [];
  /** @type {MoodValence|null} */
  let valence = null;
  /** @type {EnergyLevel|null} */
  let energy = null;

  for (const entry of EMOTION_ENTRIES) {
    if (!entry.keys.some((k) => t.includes(k))) continue;
    labels.push(entry.label);
    catalogMoods.push(...(entry.catalogMoods || []));
    if (!valence || entry.valence === 'negative') valence = entry.valence;
    if (!energy || entry.energy === 'low') energy = entry.energy;
    else if (energy !== 'low' && entry.energy === 'high') energy = 'high';
  }

  return {
    labels: [...new Set(labels)],
    valence,
    energy,
    catalogMoods: [...new Set(catalogMoods)],
  };
}
