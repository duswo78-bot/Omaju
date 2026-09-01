// 점수 엔진 — L0 hard / L1 strong / L2 soft 계층
import {
  itemMatchesDrinkPreference,
  itemMatchesSnackPreference,
  isExcludedItem,
  itemDrinkFamily,
  toDrinkFamily,
} from '../../data/drinkFamilies.js';

function asStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function listHasOverlap(listA, listB) {
  const a = (listA || []).map(asStr).filter(Boolean);
  const b = (listB || []).map(asStr).filter(Boolean);
  if (!a.length || !b.length) return false;
  return a.some((x) => b.some((y) => x.includes(y) || y.includes(x)));
}

/**
 * @param {object} opts
 * @param {string[]} [opts.excludedFamilies]
 * @param {string[]} [opts.excludedNeedles]
 * @param {string[]} [opts.excludedIds]
 * @param {boolean} [opts.hasStrongSignal]
 * @param {string[]} [opts.fallbackFamilies] 부정만 있을 때 L1 대안 family
 * @param {string[]} [opts.explicitFamilies] 이번 턴 명시 주종 (토큰·MY)
 */
export function calculateScore(
  baseSim,
  item,
  userTokens,
  contextTokens,
  contextSignals,
  profile,
  hasNegativeContext,
  isSnack = false,
  SINGLE_CHAR_ALLOW = [],
  opts = {}
) {
  let score = baseSim;
  let isMatched = false;
  profile = profile || {};
  contextSignals = contextSignals || {};
  const tokens = Array.isArray(userTokens) ? userTokens : [];
  const ctxTokens = Array.isArray(contextTokens) ? contextTokens : [];
  const nameKo = asStr(item?.name_ko);
  const category = asStr(item?.category);
  const tags = (Array.isArray(item?.tags) ? item.tags : []).map(asStr).filter(Boolean);
  const itemMoods = Array.isArray(item?.moods) ? item.moods : [];
  const itemWeather = Array.isArray(item?.weather) ? item.weather : [];

  const excluded = {
    families: opts.excludedFamilies || [],
    needles: opts.excludedNeedles || [],
    ids: opts.excludedIds || profile.dislikedAlcohols || [],
  };

  const itemFam = !isSnack ? itemDrinkFamily(item) : null;
  const explicitFamilies = new Set(opts.explicitFamilies || []);
  const favFam = toDrinkFamily(profile.favoriteDrink);
  if (favFam) explicitFamilies.add(favFam);

  const wantsNonalc =
    !isSnack &&
    (explicitFamilies.has('nonalc') ||
      favFam === 'nonalc' ||
      tokens.some((t) => /논알|무알/.test(asStr(t))));

  // ── L0 Hard gates ───────────────────────────────────────────
  if (!isSnack && isExcludedItem(item, excluded)) {
    return { score: -100, isMatched: false };
  }

  if (!isSnack && typeof item?.abv === 'number' && profile.preferredAbv === 'low' && item.abv >= 25) {
    if (!explicitFamilies.has('whiskey')) score -= 2.0;
  }

  // 논알콜은 요청/MY/제약일 때만 경쟁
  if (!isSnack && typeof item?.abv === 'number' && item.abv === 0 && !wantsNonalc) {
    if (profile.preferredAbv === 'high') score -= 1.0;
    else if (profile.preferredAbv === 'mid') score -= 0.65;
    else score -= 0.45;
  }

  // ── L1 Strong: user keywords ────────────────────────────────
  for (const raw of tokens) {
    const t = asStr(raw);
    if (t.length < 2 && !SINGLE_CHAR_ALLOW.includes(t)) continue;
    let matchCondition =
      nameKo.includes(t) ||
      t.includes(nameKo) ||
      category.includes(t) ||
      tags.some((tag) => tag.includes(t) || t.includes(tag));

    if (!isSnack && itemFam === 'nonalc' && !wantsNonalc) {
      matchCondition = nameKo.includes(t) || (t.length >= 4 && t.includes(nameKo));
    }

    if (matchCondition) {
      isMatched = true;
      if (!hasNegativeContext) score += 5.0;
      else score += 0.5;
    }
  }

  for (const raw of ctxTokens) {
    const t = asStr(raw);
    if (t.length < 2 && !SINGLE_CHAR_ALLOW.includes(t)) continue;
    const matchCondition =
      nameKo.includes(t) ||
      t.includes(nameKo) ||
      category.includes(t) ||
      tags.some((tag) => tag.includes(t) || t.includes(tag));

    if (matchCondition && !hasNegativeContext) score += 1.0;
  }

  // ── L1 Strong: MY favorite drink / snack ────────────────────
  if (!isSnack && profile.favoriteDrink) {
    if (itemMatchesDrinkPreference(item, profile.favoriteDrink)) {
      score += 0.55;
      if (favFam === 'nonalc' && item.abv === 0) score += 0.35;
      if (favFam === 'whiskey' && itemFam === 'whiskey') score += 0.35;
      if (favFam === 'whiskey' && itemFam === 'highball') score -= 0.25;
      if (favFam === 'highball' && itemFam === 'highball') score += 0.25;
      if (favFam === 'highball' && itemFam === 'whiskey') score -= 0.4;
    }
  }

  if (isSnack && profile.favoriteSnack) {
    if (itemMatchesSnackPreference(item, profile.favoriteSnack)) score += 0.45;
  }

  // ── L1 Strong: explicit family from this-turn tokens ────────
  if (!isSnack && explicitFamilies.size && itemFam && explicitFamilies.has(itemFam)) {
    if (itemFam === 'whiskey') score += 0.3;
    if (itemFam === 'highball' && !explicitFamilies.has('whiskey')) score += 0.15;
  }

  // ── L1 Strong: negation-only fallback families ──────────────
  if (!isSnack && opts.fallbackFamilies?.length && itemFam) {
    const idx = opts.fallbackFamilies.indexOf(itemFam);
    if (idx === 0) score += 0.7;
    else if (idx === 1) score += 0.45;
    else if (idx === 2) score += 0.25;
  }

  // ── L1 Strong: preferred ABV & Constraints ─────────────────
  const abvRelaxed = explicitFamilies.has('whiskey');
  const constraints = contextSignals.constraints || {};

  if (!isSnack && typeof item?.abv === 'number') {
    if (constraints.heavy) {
      if (item.abv >= 25) score += 2.5;
      else if (item.abv >= 16) score += 1.0;
      else score -= 6.0;
    }
    if (constraints.light) {
      if (item.abv <= 8) score += 2.5;
      else if (item.abv <= 15) score += 1.2;
      else score -= 6.0;
    }
    if (constraints.sweet) {
      if (typeof item.sweetness === 'number' && item.sweetness >= 3) score += 1.5;
      else score -= 1.0;
    }
  }

  if (isSnack) {
    if (constraints.spicy && (tags.includes('매운') || tags.includes('매콤') || nameKo.includes('매운') || nameKo.includes('불') || nameKo.includes('얼큰'))) {
      score += 1.5;
    }
    if (constraints.cheap && typeof item.priceLevel === 'number' && item.priceLevel <= 2) {
      score += 0.8;
    }
  }

  // ── L1/L2 boundary: conversation mood / weather / energy / relation ──
  const signalMoods = Array.isArray(contextSignals.moods) ? contextSignals.moods : [];
  const signalWeather = Array.isArray(contextSignals.weather) ? contextSignals.weather : [];
  const energy = contextSignals.energy || null;
  const relation = contextSignals.relation || null;
  const itemAbv = typeof item?.abv === 'number' ? item.abv : null;

  if (signalMoods.length > 0 && listHasOverlap(itemMoods, signalMoods)) score += 0.5;
  if (signalWeather.length > 0 && listHasOverlap(itemWeather, signalWeather)) score += 0.55;

  // energy: low → 낮은 도수/편안, high → 파티·리프레시
  if (!isSnack && energy === 'low' && itemAbv != null) {
    if (itemAbv === 0) score += 0.25;
    else if (itemAbv > 0 && itemAbv <= 8) score += 0.35;
    else if (itemAbv <= 16) score += 0.15;
    else if (itemAbv >= 30) score -= 0.35;
    if (listHasOverlap(itemMoods, ['comfort', 'honsul', 'sad', 'tired'])) score += 0.2;
  }
  if (!isSnack && energy === 'high') {
    if (listHasOverlap(itemMoods, ['celebrate', 'friends', 'happy', 'party', 'refresh'])) score += 0.3;
    if (itemAbv != null && itemAbv >= 12 && itemAbv <= 25) score += 0.1;
  }

  // relation bias
  if (relation === 'alone' && listHasOverlap(itemMoods, ['honsul', 'comfort', 'movie'])) score += 0.35;
  if (relation === 'friends' && listHasOverlap(itemMoods, ['friends', 'celebrate', 'party'])) score += 0.3;
  if (relation === 'date' && listHasOverlap(itemMoods, ['date', 'romantic', 'special'])) score += 0.35;
  if (relation === 'work' && listHasOverlap(itemMoods, ['friends', 'celebrate'])) score += 0.2;
  if (relation === 'work' && !isSnack && itemAbv != null && itemAbv >= 30) score -= 0.15;

  // ── L2 Soft: learned likes ──────────────────────────────────
  if (!isSnack) {
    if (profile.favoriteAlcohols?.includes(item?.id)) score += 0.6;
  } else if (profile.favoriteFoods?.includes(item?.id)) {
    score += 0.55;
  }

  // ── L2 Soft: MBTI prior ─────────────────────────────────────
  const trait = profile.mbtiTrait;
  if (trait) {
    const hasStrongSignal =
      Boolean(opts.hasStrongSignal) ||
      Boolean(opts.fallbackFamilies?.length) ||
      Boolean(profile.favoriteDrink) ||
      Boolean(profile.favoriteSnack) ||
      Boolean(profile.preferredAbv) ||
      tokens.length > 0 ||
      signalMoods.length > 0 ||
      signalWeather.length > 0;

    const moodW = hasStrongSignal ? 0.15 : 0.4;
    const drinkW = hasStrongSignal ? 0.1 : 0.3;
    const snackW = hasStrongSignal ? 0.08 : 0.25;

    if (trait.moods?.length && itemMoods.length && listHasOverlap(itemMoods, trait.moods)) {
      score += moodW;
    }

    if (!isSnack && trait.drinkBias?.length) {
      if (itemMatchesDrinkPreference(item, trait.drinkBias)) score += drinkW;
    }

    if (isSnack && trait.snackBias?.length) {
      if (itemMatchesSnackPreference(item, trait.snackBias)) score += snackW;
    }
  }

  return { score, isMatched };
}

export { itemDrinkFamily };
