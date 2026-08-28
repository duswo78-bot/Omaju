import { pickRandom } from '../utils/random.js';

const WEATHER_EMPATHY = {
  rain: [
    '비까지 오니까 더 가라앉는 날이죠.',
    '빗소리 있는 하루네요.',
    '비 오는 날은 괜히 생각이 많아지죠.',
    '우중충한 날씨엔 마음이 축축해지기도 해요.',
    '비 오는 저녁 감성이네요.',
    '추적추적 오는 비, 분위기 있죠.',
  ],
  snow: [
    '눈 오는 날은 집 안이 더 포근해지기도 해요.',
    '하얀 하루네요.',
    '눈발 날리는 날씨예요.',
    '눈 오면 괜히 따뜻한 게 당기죠.',
  ],
  hot: [
    '더운 날엔 몸이 먼저 지치죠.',
    '더위에 기운이 빠지기 쉬운 날씨예요.',
    '땀나는 날엔 시원한 게 최고죠.',
    '무더위에 고생 많으셨겠어요.',
  ],
  cold: [
    '추운 날엔 따뜻한 게 더 생각나죠.',
    '날씨가 몸부터 움츠러들게 하네요.',
    '쌀쌀한 공기네요.',
    '추우면 몸도 마음도 움츠러들어요.',
  ],
  humid: [
    '후덥지근한 날은 컨디션이 잘 안 따라주죠.',
    '습한 날씨엔 더 쉽게 지쳐요.',
    '끈적한 공기가 기운을 빼네요.',
  ],
};

const MOOD_EMPATHY = {
  negative: [
    '그 기분, 충분히 이해해요.',
    '그런 날 있죠. 잠시 숨 고르셔도 괜찮아요.',
    '오늘 마음이 좀 무거우셨나 봐요.',
    '힘드셨겠어요. 여기 있어요.',
    '그 마음이면 충분히 그럴 만해요.',
    '오늘은 천천히 가도 괜찮아요.',
  ],
  positive: [
    '좋은 기운이 느껴지네요.',
    '기분 좋은 날이군요.',
    '그 에너지 좋네요!',
    '듣기만 해도 기분이 살아나요.',
    '좋은 날의 느낌이 나요.',
  ],
  neutral: [
    '말씀 잘 들었어요.',
    '그런 하루도 있죠.',
    '네, 상황 이해했어요.',
    '알겠어요.',
  ],
};

const ASK_LINES = [
  '그럼 맛있는 안주에 술 한잔 하시는 것도 좋아요. 추천해드릴까요?',
  '가볍게 한 잔으로 분위기 바꿔볼까요? 추천 들어볼까요?',
  '원하시면 술·안주 쪽으로 같이 봐드릴게요. 어때요?',
  '오늘 술 마셔요? 맞춰 드릴까요?',
  '과하지 않게 페어링 하나 골라드릴까요?',
  '한 잔 생각 있으면 바로 맞춰 볼게요. 추천할까요?',
  '안주부터? 술부터? 아니면 콤보로 볼까요?',
  '원하시면 지금 분위기 맞춰 추천해드릴게요.',
];

const RAIN_LOW_ASK = [
  '비 오는 힘든 날엔 따뜻한 한 잔이 의외로 잘 받아요. 추천해드릴까요?',
  '비까지 오면 더 지치죠. 가볍게 맞춰 드릴까요?',
  '이런 날엔 막걸리·따뜻한 안주 조합이 잘 맞을 때가 많아요. 볼까요?',
  '비 오는 저녁, 과하지 않은 페어링으로 풀어볼까요?',
];

const HOT_ASK = [
  '더운 날엔 시원한 맥주나 하이볼이 잘 받아요. 추천할까요?',
  '열 받을 땐 차가운 한 잔이 특효일 때도 있어요. 볼까요?',
];

const COLD_ASK = [
  '추운 날엔 따뜻한 국물 안주가 잘 맞아요. 추천해드릴까요?',
  '몸 녹이는 조합으로 맞춰 볼까요?',
];

/**
 * weather + mood 조합으로 공감/질문 문장 조립
 * @param {import('./frame.js').SemanticFrame} semantic
 * @param {'empathy'|'ask'} mode
 */
export function composeSemanticReply(semantic, mode = 'ask') {
  const weather = semantic?.weather?.[0];
  const mood = semantic?.mood || 'neutral';
  const energy = semantic?.energy;

  const parts = [];
  if (weather && WEATHER_EMPATHY[weather]?.length) {
    parts.push(pickRandom(WEATHER_EMPATHY[weather]));
  }
  if (MOOD_EMPATHY[mood]?.length) {
    parts.push(pickRandom(MOOD_EMPATHY[mood]));
  }
  if (!parts.length) {
    parts.push(pickRandom(MOOD_EMPATHY.neutral));
  }

  if (mode === 'ask') {
    if (weather === 'rain' && (energy === 'low' || mood === 'negative')) {
      parts.push(pickRandom(RAIN_LOW_ASK));
    } else if (weather === 'hot') {
      parts.push(pickRandom(HOT_ASK));
    } else if (weather === 'cold') {
      parts.push(pickRandom(COLD_ASK));
    } else {
      parts.push(pickRandom(ASK_LINES));
    }
  }

  return parts.filter(Boolean).join(' ');
}
