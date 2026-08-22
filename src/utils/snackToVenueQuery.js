import { CATEGORY_VENUE_RULES, NAME_RULES } from '../data/venueTaxonomy';

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

/**
 * 안주(+술) → 지도/로컬 API에 넣을 검색 의도
 * @returns {{
 *   primaryQuery: string,
 *   queries: string[],
 *   venueType: string,
 *   reason: string,
 *   snackName: string,
 *   drinkName?: string
 * }}
 */
export function buildVenueSearchIntent(snackName, drinkName, snackCategory) {
  const name = (snackName || '').trim();
  const drink = (drinkName || '').trim();
  const category = snackCategory || '';

  const catRule = CATEGORY_VENUE_RULES[category] || CATEGORY_VENUE_RULES['기타'];
  const nameRule = NAME_RULES.find((r) => r.match.test(name));

  const venueType = nameRule?.venueType || catRule.venueType;
  const suffixes = nameRule?.suffixes || catRule.querySuffixes || ['술집'];
  const baseName = nameRule?.aliases?.[0] || name;

  // 검색 후보: 구체적 → 넓은 순
  const queries = unique([
    `${baseName} ${suffixes[0]}`,
    drink ? `${baseName} ${drink}` : null,
    drink ? `${suffixes[0]} ${drink}` : null,
    `${baseName} ${suffixes[1] || '술집'}`,
    `${baseName} 맛집`,
    `${venueType}`,
  ]);

  const primaryQuery = queries[0];
  const reason = nameRule
    ? `"${name}"은(는) 보통 ${venueType}에서 찾기 쉬워 "${primaryQuery}"로 검색합니다.`
    : `"${name || '안주'}"(${category || '기타'}) → ${venueType} 키워드로 변환해 검색합니다.`;

  return {
    primaryQuery,
    queries,
    venueType,
    reason,
    snackName: name,
    drinkName: drink || undefined,
  };
}
