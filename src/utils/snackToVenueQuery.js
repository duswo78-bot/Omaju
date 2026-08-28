import { CATEGORY_VENUE_RULES, NAME_RULES } from '../data/venueTaxonomy';

function unique(arr) {
  return [...new Set((arr || []).map((s) => String(s || '').trim()).filter(Boolean))];
}

/** 직접 장소 검색용 키워드 (안주 없이 카페/술집 등) */
const DIRECT_VENUE_ALIASES = [
  { match: /카페|커피/, query: '카페', extras: ['커피'] },
  { match: /술집|주점|포차/, query: '술집', extras: ['포차', '주점'] },
  { match: /호프|맥주집/, query: '호프', extras: ['맥주'] },
  { match: /이자카야/, query: '이자카야', extras: ['하이볼'] },
  { match: /와인바|와인\s*바/, query: '와인바', extras: ['와인'] },
  { match: /위스키바|위스키\s*바/, query: '위스키바', extras: ['바'] },
  { match: /맛집|식당/, query: '맛집', extras: ['식당'] },
  { match: /치킨집/, query: '치킨', extras: ['호프', '치킨'] },
  { match: /곱창집/, query: '곱창집', extras: ['곱창'] },
  { match: /횟집/, query: '횟집', extras: ['회'] },
  { match: /바(?![가-힣])|바$/, query: '바', extras: ['칵테일바'] },
];

/**
 * 안주(+술) 또는 직접 장소 키워드 → 지도/로컬 API 검색 의도
 * @returns {{
 *   primaryQuery: string,
 *   queries: string[],
 *   venueType: string,
 *   reason: string,
 *   snackName: string,
 *   drinkName?: string
 * }}
 */
export function buildVenueSearchIntent(snackName, drinkName, snackCategory, venueQuery) {
  const direct = String(venueQuery || '').trim();
  if (direct) {
    const alias = DIRECT_VENUE_ALIASES.find((r) => r.match.test(direct));
    const primary = alias?.query || direct;
    const queries = unique([
      primary,
      ...(alias?.extras || []),
      direct !== primary ? direct : null,
      `${primary} 맛집`,
    ]);
    return {
      primaryQuery: queries[0],
      queries,
      venueType: primary,
      reason: `"${direct}" 주변 장소를 검색합니다.`,
      snackName: '',
      drinkName: drinkName || undefined,
    };
  }

  const name = (snackName || '').trim();
  const drink = (drinkName || '').trim();
  const category = snackCategory || '';

  // 안주명 자체가 장소 키워드인 경우 (예: "카페")
  if (!name && drink) {
    return buildVenueSearchIntent('', '', '', drink);
  }
  const asVenue = name && DIRECT_VENUE_ALIASES.find((r) => r.match.test(name));
  if (asVenue && !category) {
    return buildVenueSearchIntent(name, drink, '', name);
  }

  const catRule = CATEGORY_VENUE_RULES[category] || CATEGORY_VENUE_RULES['기타'];
  const nameRule = NAME_RULES.find((r) => r.match.test(name));

  const venueType = nameRule?.venueType || catRule.venueType;
  const suffixes = nameRule?.suffixes || catRule.querySuffixes || ['술집'];
  const baseName = (nameRule?.aliases?.[0] || name || drink || '술집').trim();

  // base와 suffix가 같으면 "치킨 치킨" 같은 중복 쿼리 방지
  const suffix0 = suffixes[0];
  const suffix1 = suffixes[1] || '술집';
  const primary =
    baseName && suffix0 && baseName !== suffix0 ? `${baseName} ${suffix0}` : baseName || suffix0;

  const queries = unique([
    primary,
    baseName ? `${baseName} 맛집` : null,
    baseName,
    drink && drink !== baseName ? `${baseName} ${drink}`.trim() : null,
    baseName && suffix1 && baseName !== suffix1 ? `${baseName} ${suffix1}` : suffix1,
    drink || null,
  ]);

  const primaryQuery = queries[0] || '술집';
  const reason = nameRule
    ? `"${name}"은(는) 보통 ${venueType}에서 찾기 쉬워 "${primaryQuery}"(으)로 검색합니다.`
    : `"${name || drink || '근처'}"(${category || '기타'}) → ${venueType} 키워드로 변환해 검색합니다.`;

  return {
    primaryQuery,
    queries,
    venueType,
    reason,
    snackName: name,
    drinkName: drink || undefined,
  };
}

/**
 * 사용자 문장에서 장소 검색 쿼리 추출 (NLU PLACE용)
 * @param {string} text
 * @returns {string|null}
 */
export function extractPlaceQueryFromText(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  for (const rule of DIRECT_VENUE_ALIASES) {
    if (rule.match.test(t)) return rule.query;
  }
  if (/근처|주변|가까운|찾아|어디/.test(t)) return '술집';
  return null;
}
