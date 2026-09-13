/**
 * 날씨 및 계절 표현 → 정규 태그
 * @typedef {'rain'|'snow'|'hot'|'cold'|'humid'|'autumn'|'spring'|'summer'|'winter'} WeatherTag
 */

/** @type {Array<{ tag: WeatherTag, keys: string[] }>} */
export const WEATHER_ENTRIES = [
  {
    tag: 'rain',
    keys: [
      '비오', '비온', '비 오', '비 온', '비가', '비와', '비도', '비는', '비를', '비랑', '비까지',
      '장마', '소나기', '우중충', '빗소리', '추적추적', '보슬비', '폭우', '비오네', '비온다', '비오네여',
      '비오네요', '비내리는', '비 내', '젖은', '우산', 'rain', 'rainy',
    ],
  },
  {
    tag: 'snow',
    keys: [
      '눈오', '눈온', '눈 오', '눈 온', '눈이', '눈도', '눈은', '함박눈', '눈폭탄', '눈발',
      '눈오네', '눈온다', '화이트크리스', 'snow', 'snowy',
    ],
  },
  {
    tag: 'hot',
    keys: [
      '더워', '더운', '더웠', '더위', '무더위', '찜통', '폭염', '땀나', '더워죽', '더워죽겠',
      '더운날', '열대야', 'hot',
    ],
  },
  {
    tag: 'cold',
    keys: [
      '추워', '추운', '추웠', '추위', '쌀쌀', '한파', '꽁꽁', '얼어', '추워죽', '추워죽겠',
      '추운날', '찬바람', 'cold',
    ],
  },
  {
    tag: 'humid',
    keys: ['습해', '습한', '후덥', '끈적', '습도', '후덥지근', '눅눅', 'humid'],
  },
  {
    tag: 'autumn',
    keys: [
      '가을', '가을이', '가을날', '가을밤', '가을철', '선선', '단풍', '가을바람', '가을타', '낙엽',
      'autumn', 'fall',
    ],
  },
  {
    tag: 'spring',
    keys: [
      '봄', '봄이', '봄날', '봄밤', '봄철', '포근', '벚꽃', '봄바람', '봄맞이', 'spring',
    ],
  },
  {
    tag: 'summer',
    keys: [
      '여름', '여름이', '여름날', '여름밤', '여름철', 'summer',
    ],
  },
  {
    tag: 'winter',
    keys: [
      '겨울', '겨울이', '겨울날', '겨울밤', '겨울철', '칼바람', 'winter',
    ],
  },
];

/**
 * @param {string} text
 * @returns {WeatherTag[]}
 */
export function matchWeather(text) {
  const t = String(text || '');
  const hits = [];
  for (const entry of WEATHER_ENTRIES) {
    if (entry.keys.some((k) => t.includes(k))) hits.push(entry.tag);
  }
  return [...new Set(hits)];
}
