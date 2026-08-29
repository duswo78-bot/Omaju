/**
 * Canonical drink families — MY UI / MBTI bias / NLU tokens / catalog categories
 * must all compare through this layer (no raw string soup).
 */

/** @typedef {'soju'|'beer'|'wine'|'makgeolli'|'highball'|'whiskey'|'vodka'|'fruit_wine'|'baijiu'|'nonalc'|'other'} DrinkFamily */

/** @type {Record<DrinkFamily, { labels: string[], categories: string[] }>} */
export const DRINK_FAMILIES = {
  soju: {
    labels: ['소주', '진로', '참이슬', '화요', '청하', '새로', '좋은데이', '한라산', '이즈백'],
    categories: ['소주'],
  },
  beer: {
    labels: ['맥주', '비어', '칭따오', '기네스', '카스', '테라', '켈리', '아사히', '하이네켄', '스텔라', '버드'],
    categories: ['맥주'],
  },
  wine: {
    labels: ['와인', '레드와인', '화이트와인', '스파클링', '포트와인'],
    categories: ['와인'],
  },
  makgeolli: {
    labels: ['막걸리', '막걸리/전통주', '전통주', '지평', '장수막걸리', '느린마을'],
    categories: ['전통주'],
  },
  highball: {
    labels: ['하이볼', '칵테일', '준벅', '피치', '사워', '깔루아'],
    categories: ['칵테일/하이볼'],
  },
  whiskey: {
    labels: [
      '위스키', '위스키/보드카', '위스키샷', '싱글몰트', '버번', '스카치',
      '발베니', '맥캘란', '글렌피딕', '조니워커', '와일드터키', '잭다니엘', '잭다니엘스',
      '제임슨', '산토리', '가쿠빈', '라프로익', '아드벡', '탈리스커', '글렌리벳', '시바스리갈'
    ],
    categories: ['위스키'],
  },
  baijiu: {
    labels: [
      '백주', '바이주', '빠이주', '고량주', '중국술', '중국', '마오타이',
      '양하대곡', '연태고량주', '연태', '공부가주', '우량예', '이과두주'
    ],
    categories: ['백주'],
  },
  vodka: {
    labels: ['보드카', '보드카토닉'],
    categories: ['보드카'],
  },
  fruit_wine: {
    labels: ['과실주', '복분자', '매실'],
    categories: ['과실주'],
  },
  nonalc: {
    labels: ['논알콜', '무알콜', '논알코올', '무알코올'],
    categories: ['논알콜/음료', '논알콜'],
  },
  other: {
    labels: [],
    categories: [],
  },
};

export const SNACK_KEY_MAP = {
  국물류: ['국물', '탕', '찌개', '전골', '라면', '우동'],
  '볶음/구이': ['볶음', '구이', '삼겹', '곱창', '고기'],
  '튀김/전': ['튀김', '전', '치킨', '까스'],
  해산물: ['회', '해산물', '새우', '오징어', '조개'],
  마른안주: ['마른', '견과', '쥐포', '안주'],
  '과일/디저트': ['과일', '디저트', '달콤', '치즈'],
};

/**
 * @param {string|null|undefined} raw
 * @returns {DrinkFamily|null}
 */
export function toDrinkFamily(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  // Longer / more specific labels first
  /** @type {DrinkFamily[]} */
  const order = [
    'nonalc',
    'makgeolli',
    'highball',
    'whiskey',
    'vodka',
    'fruit_wine',
    'wine',
    'beer',
    'soju',
    'other',
  ];

  for (const fam of order) {
    const meta = DRINK_FAMILIES[fam];
    for (const label of meta.labels) {
      if (t.includes(label.toLowerCase()) || label.toLowerCase().includes(t)) return fam;
    }
    for (const cat of meta.categories) {
      if (t === cat.toLowerCase() || t.includes(cat.toLowerCase())) return fam;
    }
  }
  return null;
}

/**
 * Resolve family from a catalog alcohol item.
 * @param {{ category?: string, name_ko?: string, tags?: string[], abv?: number }} item
 * @returns {DrinkFamily}
 */
export function itemDrinkFamily(item) {
  if (!item) return 'other';
  if (typeof item.abv === 'number' && item.abv === 0) return 'nonalc';
  if (item.category && DRINK_FAMILIES.nonalc.categories.includes(item.category)) return 'nonalc';

  const cat = item.category || '';
  for (const [fam, meta] of Object.entries(DRINK_FAMILIES)) {
    if (fam === 'other') continue;
    if (meta.categories.includes(cat)) {
      // 전통주 but not makgeolli name → still makgeolli family for matching MY "막걸리"
      if (fam === 'makgeolli') return 'makgeolli';
      return /** @type {DrinkFamily} */ (fam);
    }
  }

  const blob = `${item.name_ko || ''} ${(item.tags || []).join(' ')} ${cat}`;
  return toDrinkFamily(blob) || 'other';
}

/**
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 */
export function familiesMatch(a, b) {
  const fa = typeof a === 'string' && a.length < 20 && DRINK_FAMILIES[a] ? a : toDrinkFamily(a);
  const fb = typeof b === 'string' && b.length < 20 && DRINK_FAMILIES[b] ? b : toDrinkFamily(b);
  if (!fa || !fb) return false;
  // whiskey MY also softly accepts vodka only via explicit caller — keep strict here
  return fa === fb;
}

/**
 * Does item belong to MY/UI favorite drink string or family list?
 * @param {object} item
 * @param {string|string[]} favoriteOrBias
 */
export function itemMatchesDrinkPreference(item, favoriteOrBias) {
  if (!item || !favoriteOrBias) return false;
  const list = Array.isArray(favoriteOrBias) ? favoriteOrBias : [favoriteOrBias];
  const itemFam = itemDrinkFamily(item);
  for (const pref of list) {
    if (!pref) continue;
    const prefFam = toDrinkFamily(pref);
    if (prefFam && prefFam === itemFam) return true;
    // whiskey UI label historically bundled vodka — keep soft bridge
    if (prefFam === 'whiskey' && itemFam === 'vodka') return true;
    if (pref === '논알콜' && (itemFam === 'nonalc' || item.abv === 0)) return true;
  }
  return false;
}

/**
 * @param {object} item
 * @param {string|string[]} snackPref
 */
export function itemMatchesSnackPreference(item, snackPref) {
  if (!item || !snackPref) return false;
  const list = Array.isArray(snackPref) ? snackPref : [snackPref];
  const blob = `${item.name_ko || ''} ${item.category || ''} ${(item.tags || []).join(' ')}`;
  return list.some((s) => {
    if (!s) return false;
    const keys = SNACK_KEY_MAP[s] || [s];
    return keys.some((k) => blob.includes(k)) || item.category === s;
  });
}

/**
 * When user only excludes a family (no alternative), nudge toward these.
 * Order = preference. Callers should skip families already excluded.
 * @type {Partial<Record<DrinkFamily, DrinkFamily[]>>}
 */
export const EXCLUDE_FALLBACK_FAMILIES = {
  soju: ['beer', 'highball', 'makgeolli'],
  beer: ['highball', 'soju', 'wine'],
  wine: ['highball', 'makgeolli', 'beer'],
  makgeolli: ['beer', 'wine', 'highball'],
  highball: ['beer', 'wine', 'makgeolli'],
  whiskey: ['highball', 'wine', 'beer'],
  vodka: ['highball', 'beer', 'wine'],
  fruit_wine: ['wine', 'makgeolli', 'highball'],
  nonalc: ['beer', 'highball', 'makgeolli'],
  other: ['beer', 'highball', 'wine'],
};

/**
 * Pick fallback families after excludes (negation-only turns).
 * @param {DrinkFamily[]} excludedFamilies
 * @param {{ favoriteDrink?: string, mbtiDrinkBias?: string[] }} [hints]
 * @returns {DrinkFamily[]}
 */
export function pickFallbackFamilies(excludedFamilies = [], hints = {}) {
  const excluded = new Set(excludedFamilies || []);
  const out = [];

  const tryAdd = (fam) => {
    if (!fam || fam === 'other' || excluded.has(fam) || out.includes(fam)) return;
    out.push(fam);
  };

  // 1) MY favorite if still allowed
  tryAdd(toDrinkFamily(hints.favoriteDrink));

  // 2) MBTI bias order
  for (const b of hints.mbtiDrinkBias || []) tryAdd(toDrinkFamily(b));

  // 3) Per-excluded substitution table
  for (const ex of excludedFamilies || []) {
    for (const fb of EXCLUDE_FALLBACK_FAMILIES[ex] || []) tryAdd(fb);
  }

  // 4) Safe defaults
  for (const d of /** @type {DrinkFamily[]} */ (['beer', 'highball', 'wine', 'makgeolli', 'soju'])) {
    tryAdd(d);
  }

  return out.slice(0, 3);
}

/**
 * Map free-text exclude tokens → families + raw needles for name match.
 * @param {string[]} excludeTokens
 * @returns {{ families: DrinkFamily[], needles: string[] }}
 */
export function resolveExcludes(excludeTokens = []) {
  /** @type {Set<DrinkFamily>} */
  const families = new Set();
  const needles = [];
  for (const raw of excludeTokens) {
    if (!raw || typeof raw !== 'string') continue;
    const fam = toDrinkFamily(raw);
    if (fam && fam !== 'other') families.add(fam);
    else if (raw.trim().length >= 2) needles.push(raw.trim());
  }
  return { families: [...families], needles };
}

/**
 * @param {object} item
 * @param {{ families?: DrinkFamily[], needles?: string[], ids?: string[] }} excluded
 */
export function isExcludedItem(item, excluded) {
  if (!item || !excluded) return false;
  if (excluded.ids?.includes(item.id)) return true;
  const fam = itemDrinkFamily(item);
  if (excluded.families?.includes(fam)) return true;
  if (excluded.needles?.length) {
    const blob = `${item.name_ko || ''} ${item.category || ''} ${(item.tags || []).join(' ')}`;
    if (excluded.needles.some((n) => blob.includes(n))) return true;
  }
  return false;
}
