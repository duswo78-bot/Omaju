/**
 * 술·안주 은어/줄임 → 표준 힌트
 */

/** @type {Array<[string, string]>} */
export const DRINK_SLANG_PAIRS = [
  ['치맥각', '치킨 맥주 추천해줘'],
  ['소맥각', '소주 맥주 추천해줘'],
  ['치맥', '치킨 맥주'],
  ['소맥', '소주 맥주'],
  ['맥소', '맥주 소주'],
  ['혼맥', '혼술 맥주'],
  ['혼소', '혼술 소주'],
  ['혼막', '혼술 막걸리'],
  ['혼와', '혼술 와인'],
  ['논알', '논알콜'],
  ['무알', '무알콜'],
  ['제로맥주', '논알콜 맥주'],
  ['소쥬', '소주'],
  ['쏘주', '소주'],
  ['쓰오주', '소주'],
  ['쑤주', '소주'],
  ['마걸리', '막걸리'],
  ['막걸이', '막걸리'],
  ['하볼', '하이볼'],
  ['하이볼각', '하이볼 추천해줘'],
  ['양주', '위스키'],
  ['위스', '위스키'],
  ['존맛탱', '맛있는'],
  ['존맛', '맛있는'],
  ['개맛', '맛있는'],
  ['각이다', '추천해줘'],
  ['각이네', '추천해줘'],
  ['각임', '추천해줘'],
  ['각이야', '추천해줘'],
  ['암거나', '아무거나'],
  ['오마카세', '아무거나'],
  ['혀장', '해장'],
  ['해장술', '해장'],
  ['곱창각', '곱창 추천해줘'],
  ['회각', '회 추천해줘'],
];

/**
 * @param {string} text
 * @returns {{ expanded: string, hits: string[] }}
 */
export function expandDrinkSlang(text) {
  let t = String(text || '');
  const hits = [];
  const sorted = DRINK_SLANG_PAIRS.slice().sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (t.includes(from)) {
      t = t.split(from).join(to);
      hits.push(from);
    }
  }
  return { expanded: t, hits };
}
