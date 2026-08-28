/**
 * 한국어 관용/구어 패턴 → 의미 힌트
 */

/** @type {Array<{ keys: string[], patch: Record<string, unknown> }>} */
export const IDIOM_ENTRIES = [
  {
    keys: ['한잔', '한 잔', '한잔할', '한잔하', '한잔하까', '한잔할까', '한잔하실래요', '한잔할래'],
    patch: { openToRecommend: 'soft', wantDrink: true },
  },
  {
    keys: ['기운 없', '기운없', '힘 없', '힘없', '기력'],
    patch: { valence: 'negative', energy: 'low' },
  },
  {
    keys: ['머리 아', '숙취', '해장', '속쓰', '속이 안'],
    patch: { hangover: true, openToRecommend: 'soft', energy: 'low' },
  },
  {
    keys: ['혼자', '혼술', '나 혼자', '혼맥', '혼소', '혼술할'],
    patch: { relation: 'alone' },
  },
  {
    keys: ['친구', '같이 마시', '여럿', '다들', '우리끼리', '친구들이랑', '친구랑'],
    patch: { relation: 'friends' },
  },
  {
    keys: ['데이트', '소개팅', '남친', '여친', '연인', '데이트할'],
    patch: { relation: 'date' },
  },
  {
    keys: ['회식', '회사', '직장', '동료', '팀원', '상사', '회식자리'],
    patch: { relation: 'work' },
  },
  {
    keys: ['풀고 싶', '풀자', '달래', '위로', '힐링', '기분전환', '기분 전환'],
    patch: { openToRecommend: 'soft' },
  },
  {
    keys: ['가볍게', '가벼운', '라이트하게', '약하게', '라이트'],
    patch: { light: true, openToRecommend: 'soft' },
  },
  {
    keys: ['세게', '진하게', '독하게', '도수 높'],
    patch: { strong: true, openToRecommend: 'soft' },
  },
  {
    keys: ['뭐 마시', '뭐마시', '뭘 마시', '마실거', '마실 거', '뭐 먹', '뭐먹'],
    patch: { openToRecommend: 'hard', wantDrink: true },
  },
  {
    keys: ['배고프', '배고파', '출출', '야식', '배고픈'],
    patch: { openToRecommend: 'soft', wantSnack: true },
  },
  {
    keys: ['다른거', '다른 거', '바꿔줘', '다시 추천', '다시추천', '다른걸로'],
    patch: { openToRecommend: 'hard', reroll: true },
  },
  {
    keys: ['좋아', '괜찮아', '그걸로', '그거로', '마실래요', '마실게', 'ㄱㄱ'],
    patch: { affirmish: true },
  },
  {
    keys: ['집들이', '파티', '생일', '축하자리'],
    patch: { relation: 'friends', openToRecommend: 'soft' },
  },
  {
    keys: ['운전', '대리', '차 있', '차로'],
    patch: { nonAlcoholic: true, openToRecommend: 'soft' },
  },
];

/**
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function matchIdioms(text) {
  const t = String(text || '');
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const entry of IDIOM_ENTRIES) {
    if (!entry.keys.some((k) => t.includes(k))) continue;
    Object.assign(out, entry.patch);
  }
  return out;
}
