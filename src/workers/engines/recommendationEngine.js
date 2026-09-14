import { cosineSimilarity } from '../utils/math.js';
import { calculateScore } from './scoreEngine.js';
import {
  embedQuery,
  getAlcoholEmbeddings,
  getSnackEmbeddings,
  getGameEmbeddings,
  seedMockEmbeddings,
} from './embeddingEngine.js';
import { getProfile } from './profileEngine.js';
import { getRejectedItems, getRecentRecommendedIds, rememberRecommendedIds } from './memoryEngine.js';
import { pickRandom, pickFromScoreBand } from '../utils/random.js';
import {
  resolveExcludes,
  isExcludedItem,
  toDrinkFamily,
  pickFallbackFamilies,
} from '../../data/drinkFamilies.js';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import relationsData from '../../data/relations.json';

// relations.json을 빠른 조회를 위한 Map으로 변환
// key: "alc_id|snk_id", value: score (0-100)
const relationMap = new Map();
for (const rel of relationsData) {
  relationMap.set(`${rel.source}|${rel.target}`, rel.score);
}

function getRelationScore(alcId, snkId) {
  let score = relationMap.get(`${alcId}|${snkId}`) || 0;
  if (!score && alcId && snkId) {
    const alc = alcoholsData.find((a) => a.id === alcId);
    const snk = snacksData.find((b) => b.id === snkId);
    if (alc?.pairings?.includes(snkId) || snk?.bestDrinks?.includes(alcId)) {
      score = 92;
    }
  }
  return score;
}

function diversityPenalty(id, recentIds) {
  const idx = recentIds.indexOf(id);
  if (idx < 0) return 0;
  // 최근에 추천됐을수록 더 큰 페널티
  return Math.max(0.08, 0.28 - idx * 0.015);
}

function pickRelationCandidate(scoredList, minScore = 70) {
  const eligible = scoredList
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score);
  if (!eligible.length) return null;
  const top = eligible[0].score;
  const band = eligible.filter((x) => top - x.score <= 10);
  const pool = band.length >= 3 ? band : eligible.slice(0, Math.min(6, eligible.length));
  return pickRandom(pool)?.item || null;
}

const SINGLE_CHAR_ALLOW = ['비', '눈', '회', '파', '단', '짠', '맵', '쓴', '빵', '밥', '면', '탕', '전', '편', '떡', '술'];

/** 명시 힌트(치킨 등)와 아이템이 실제로 맞는지 */
function itemMatchesHint(item, hints = []) {
  const name = String(item?.name_ko || '');
  const category = String(item?.category || '');
  const tags = (item?.tags || []).map(String);
  for (const raw of hints) {
    const h = String(raw || '').trim();
    if (!h) continue;
    if (name.includes(h) || h.includes(name)) return true;
    if (category.includes(h)) return true;
    if (tags.some((t) => t.includes(h) || h.includes(t))) return true;
  }
  return false;
}

/**
 * 상위 점수 밴드에서 고르되, 점수 격차가 큰 비매칭 후보로 풀을 넓히지 않음.
 * (치킨 5.35점인데 minPool 때문에 0점 라면이 섞이던 문제 방지)
 */
function pickStrongCandidate(candidates, { band = 0.18, minPool = 5, preferMatched = false } = {}) {
  if (!candidates?.length) return null;
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const max = sorted[0].score ?? 0;
  let pool = sorted.filter((c) => max - (c.score ?? 0) <= band);
  if (preferMatched) {
    const matched = pool.filter((c) => c.matched);
    if (matched.length) pool = matched;
  }
  // 최고점과 1.0 이상 벌어지면 억지로 minPool을 채우지 않음
  if (pool.length < minPool) {
    const widened = sorted.filter((c) => max - (c.score ?? 0) <= Math.max(band, 1.0));
    pool = widened.length ? widened : sorted.slice(0, Math.min(minPool, sorted.length));
  }
  return pickRandom(pool)?.item || sorted[0].item;
}

/** Pull exclude tokens from NLU constraints + inline “X 말고/싫어” patterns. */
function collectExcludeTokens(cleanText, constraints) {
  const tokens = [...(constraints?.exclude || [])];
  const re = /([가-힣A-Za-z0-9]{1,12})\s*(?:은|는|이|가|도)?\s*(알레르기|알러지|절대\s*안\s*돼|안\s*돼|안됨|못\s*먹|못먹|사절|금지|머리\s*아프|숙취|말고|제외|빼고|싫|별로|먹었)/g;
  let m;
  while ((m = re.exec(cleanText || '')) !== null) {
    if (m[1] && !['그거', '이거', '저거', '다른', '오늘', '그냥'].includes(m[1])) {
      tokens.push(m[1]);
    }
  }
  return [...new Set(tokens)];
}

export async function recommend(cleanText, userTokens, contextTokens, contextSignals, frame = null) {
  let bestAlc = null, bestSnack = null, bestGame = null;
  cleanText = typeof cleanText === 'string' ? cleanText : '';
  userTokens = Array.isArray(userTokens) ? userTokens : [];
  contextTokens = Array.isArray(contextTokens) ? contextTokens : [];
  const constraints = frame?.slots?.constraints || {};
  let wantNonAlc =
    Boolean(constraints.nonAlcoholic) ||
    cleanText.includes('논알콜') ||
    cleanText.includes('무알콜') ||
    cleanText.includes('술빼고');
  const snackHints = [...(frame?.slots?.snackHints || [])].filter(Boolean);
  const alcoholHints = [...(frame?.slots?.alcoholHints || [])].filter(Boolean);
  // "치킨 먹고 싶어"처럼 안주만 명시하고 술은 없으면 → 안주 잠금 (술은 페어링으로만)
  const foodDesire =
    /먹고싶|먹고\s*싶|먹을래|먹자|시켜|배달/.test(cleanText) ||
    /먹고싶|먹을래|먹자/.test(String(frame?.rawText || ''));

  let wantOnlySnack =
    Boolean(constraints.onlySnack) ||
    cleanText.includes('안주만') ||
    cleanText.includes('밥만') ||
    cleanText.includes('식사만');
  let wantOnlyAlc = Boolean(constraints.onlyAlcohol) || cleanText.includes('술만');

  const resolvedAlcIds = new Set(frame?.resolved?.alcoholIds || []);
  const resolvedSnkIds = new Set(frame?.resolved?.snackIds || []);
  const hasExplicitSnack = resolvedSnkIds.size > 0 || snackHints.length > 0;
  const hasExplicitAlc = resolvedAlcIds.size > 0 || alcoholHints.length > 0;
  // 명시 안주·"치킨 먹고 싶어"류는 페어링이 안주를 덮어쓰지 못함
  let snackLocked = hasExplicitSnack || (foodDesire && snackHints.length > 0);
  let alcLocked = hasExplicitAlc;

  const frameSignals = {
    moods: [...(contextSignals?.moods || []), ...(frame?.slots?.moods || [])],
    weather: [...(contextSignals?.weather || []), ...(frame?.slots?.weather || [])],
    energy: contextSignals?.energy || null,
    relation: contextSignals?.relation || null,
    constraints: { ...(contextSignals?.constraints || {}), ...(frame?.slots?.constraints || {}) },
  };

  let isAlcMatched = false;
  let isSnackMatched = false;
  let isLowConfidence = false;

  const userProfile = getProfile();
  const rejectedItems = getRejectedItems();
  const recentIds = getRecentRecommendedIds();

  const excludeResolved = resolveExcludes(collectExcludeTokens(cleanText, constraints));

  // Positive drink families mentioned this turn (not in exclude list)
  const explicitFamilies = [];
  for (const t of [...(userTokens || []), ...(frame?.slots?.alcoholHints || [])]) {
    const fam = toDrinkFamily(t);
    if (fam && fam !== 'other' && !excludeResolved.families.includes(fam) && !explicitFamilies.includes(fam)) {
      explicitFamilies.push(fam);
    }
  }
  const favFam = toDrinkFamily(userProfile.favoriteDrink);
  if (favFam && !excludeResolved.families.includes(favFam) && !explicitFamilies.includes(favFam)) {
    // MY is strong but not always "this turn explicit" — still pass for whiskey/highball tuning
    explicitFamilies.push(favFam);
  }

  const hasNegation =
    cleanText.includes('먹었') ||
    cleanText.includes('말고') ||
    cleanText.includes('싫어') ||
    cleanText.includes('별로') ||
    excludeResolved.families.length > 0 ||
    excludeResolved.needles.length > 0;

  // 부정만 있고 대안 family가 없으면 치환 테이블로 L1 폴백
  const positiveAlts = explicitFamilies.filter((f) => !excludeResolved.families.includes(f));
  const negationOnly = hasNegation && excludeResolved.families.length > 0 && positiveAlts.length === 0;
  const fallbackFamilies = negationOnly
    ? pickFallbackFamilies(excludeResolved.families, {
        favoriteDrink: userProfile.favoriteDrink,
        mbtiDrinkBias: userProfile.mbtiTrait?.drinkBias || [],
      })
    : [];

  // 텍스트/제약이 논알콜을 요구할 때만 풀을 논알콜로 제한.
  // MY 선호 논알콜은 후보에 포함 + 점수 가산으로 처리 (다른 주종 요청을 막지 않음).

  const scoreOpts = {
    excludedFamilies: excludeResolved.families,
    excludedNeedles: excludeResolved.needles,
    excludedIds: [...(userProfile.dislikedAlcohols || []), ...rejectedItems],
    hasStrongSignal:
      resolvedAlcIds.size > 0 ||
      Boolean(userProfile.favoriteDrink) ||
      (userTokens && userTokens.length > 0) ||
      fallbackFamilies.length > 0,
    explicitFamilies,
    fallbackFamilies,
  };

  // Real RAG Logic (MiniLM) + Keyword Boosting
  // Node/vite-node 시뮬에서 모듈 인스턴스가 갈리면 임베딩이 비어 랜덤 폴백됨 → 시드
  if (!getSnackEmbeddings().length || !getAlcoholEmbeddings().length) {
    seedMockEmbeddings();
  }
  const queryVec = await embedQuery(cleanText);
  const hasNegativeContext = hasNegation;

  const alcoholEmbeddings = getAlcoholEmbeddings();
  const snackEmbeddings = getSnackEmbeddings();
  const gameEmbeddings = getGameEmbeddings();

  const allowNonAlcInPool =
    wantNonAlc ||
    Boolean(constraints.diet) ||
    favFam === 'nonalc' ||
    explicitFamilies.includes('nonalc') ||
    (userTokens || []).some((t) => /논알|무알/.test(String(t)));

  const alcHardExcluded = (alc) =>
    isExcludedItem(alc, {
      families: scoreOpts.excludedFamilies,
      needles: scoreOpts.excludedNeedles,
      ids: scoreOpts.excludedIds,
    }) ||
    (wantNonAlc && alc.category !== '논알콜/음료' && alc.abv !== 0) ||
    (!allowNonAlcInPool && alc.category === '논알콜/음료') ||
    (constraints.diet && (alc.category?.includes('막걸리') || alc.subCategory?.includes('막걸리') || alc.name_ko?.includes('막걸리'))) ||
    (constraints.heavy && typeof alc.abv === 'number' && alc.abv < 20) ||
    (constraints.moderate && typeof alc.abv === 'number' && (alc.abv > 20 || alc.abv < 4)) ||
    (constraints.cheap && typeof alc.priceLevel === 'number' && alc.priceLevel >= 3) ||
    (constraints.light && typeof alc.abv === 'number' && alc.abv > 15);

  const snkHardExcluded = (snk) => {
    if (rejectedItems.includes(snk.id)) return true;

    // 1) 명시 제외 및 알레르기/거부 토큰 처리
    const excludeList = [...(constraints.exclude || []), ...(excludeResolved.needles || [])];
    if (excludeList.length > 0) {
      const snkBlob = `${snk.name_ko || ''} ${snk.category || ''} ${(snk.tags || []).join(' ')}`;
      for (const ex of excludeList) {
        if (!ex) continue;
        if (snkBlob.includes(ex)) return true;
        if (ex === '해산물' || ex === '해물') {
          if (
            snk.category === '해산물' ||
            /해물|해산|생선|어패|연어|참치|광어|우럭|장어|고등어|꽁치|명태|대구|갈치|동태|조개|꽃게|게|새우|회|낙지|문어|오징어|어묵|골뱅이|바지락|홍합|가리비|연포탕|굴|꼬막|소라|멍게|해삼|전복|물회|매운탕|해물탕/.test(snkBlob)
          ) return true;
        }
        if (ex === '고기' || ex === '육류') {
          if (
            snk.category === '고기/구이' ||
            snk.category === '육류' ||
            /고기|육류|소고기|돼지|삼겹|치킨|닭|오리|보쌈|수육|제육|갈비|차돌|스테이크|소시지|소세지|육회|육전|편육/.test(snkBlob)
          ) return true;
        }
        if (ex === '기름진' || ex === '튀김') {
          if (snk.greasy >= 3 || /튀김|부침|전|기름진|삼겹/.test(snkBlob)) return true;
        }
      }
    }

    // 2) 로맨틱/데이트 분위기에서는 포차/국밥/제육 계열 배제
    const isRomantic =
      frameSignals.relation === 'date' ||
      contextSignals?.relation === 'date' ||
      (frameSignals.moods || []).includes('romantic') ||
      (frameSignals.moods || []).includes('date');
    if (isRomantic) {
      const isPochaFood =
        /제육볶음|국밥|순대|번데기|뼈해장국|돼지국밥|순대국|포차/.test(snk.name_ko || '') ||
        (snk.tags || []).some((t) => /포차|국밥|해장/.test(t));
      if (isPochaFood) return true;
    }

    // 3) 디저트/커피/단술(깔루아 등)과 날것/해산물/헤비찌개 충돌 방지
    if (
      bestAlc &&
      (bestAlc.name_ko?.includes('깔루아') ||
        bestAlc.name_ko?.includes('베일리스') ||
        (bestAlc.category === '칵테일/하이볼' && bestAlc.sweetness >= 4))
    ) {
      const isClashing =
        snk.category === '해산물' ||
        snk.category === '국물/탕' ||
        snk.category === '탕류' ||
        /산낙지|회|사시미|제육|삼겹살|꽃게탕|매운탕|순대|곱창|김치찌개/.test(snk.name_ko || '');
      if (isClashing) return true;
    }

    if (constraints.fullStomach) {
      const isHeavy =
        snk.category === '국물/탕' ||
        snk.category === '탕류' ||
        snk.category === '고기/구이' ||
        snk.category === '육류' ||
        snk.category === '식사/면' ||
        snk.category === '식사겸안주' ||
        snk.category === '분식' ||
        snk.category === '전/부침개' ||
        snk.category === '전·부침' ||
        snk.category === '튀김' ||
        snk.category === '중식안주' ||
        (snk.tags || []).some((t) => /기름진|든든|식사|헤비|배부른|고기|튀김|부침|삼겹살|치킨/.test(t));
      if (isHeavy) return true;
    }
    if (constraints.sweet) {
      const isSweet =
        (typeof snk.sweet === 'number' && snk.sweet >= 2) ||
        snk.category === '디저트' ||
        (snk.tags || []).some((t) => /달달|달콤|디저트|과일|초콜릿|샤베트|아이스크림|달콤한|달콤고소|단짠|단짠조합/.test(t));
      if (!isSweet) return true;
    }
    if (constraints.spicy && (snk.spicy === 0 || !(snk.tags || []).some((t) => /매운|매콤|얼큰/.test(t)))) {
      return true;
    }
    if (constraints.cheap && typeof snk.priceLevel === 'number' && snk.priceLevel >= 3) {
      return true;
    }
    if (constraints.light && (snk.greasy >= 3 || (snk.tags || []).some((t) => /기름진|헤비|튀김/.test(t)))) {
      return true;
    }
    if (constraints.diet && ((snk.tags || []).includes('기름진') || (snk.tags || []).includes('튀김') || snk.greasy >= 3)) {
      return true;
    }
    return false;
  };

  // 1. 주류 검색 (안주 위주 요청이라도 술이 이미 정해졌다면 해당 술을 찾아 유지함)
  if (!wantOnlySnack || hasExplicitAlc) {
    let alcCandidates = [];
    for (const { item, vector } of alcoholEmbeddings) {
      if (alcHardExcluded(item)) continue;
      // 명시 주종 힌트가 있으면 그 풀 안에서만 고름
      if (hasExplicitAlc) {
        const inResolved = resolvedAlcIds.has(item.id);
        const inHint = itemMatchesHint(item, alcoholHints);
        if (!inResolved && !inHint) continue;
      }

      let baseSim = cosineSimilarity(queryVec, vector);
      const { score, isMatched } = calculateScore(
        baseSim,
        item,
        userTokens,
        contextTokens,
        frameSignals,
        userProfile,
        hasNegativeContext,
        false,
        SINGLE_CHAR_ALLOW,
        scoreOpts
      );
      
      let finalScore = score;
      let matched = isMatched;
      if (resolvedAlcIds.has(item.id) || itemMatchesHint(item, alcoholHints)) {
        finalScore += 0.35;
        matched = true;
        isAlcMatched = true;
      }
      if (rejectedItems.includes(item.id)) finalScore -= 100.0;
      finalScore -= diversityPenalty(item.id, recentIds);
      
      if (matched) isAlcMatched = true;
      alcCandidates.push({ item, score: finalScore, matched });
    }
    
    if (alcCandidates.length > 0) {
      alcCandidates.sort((a, b) => b.score - a.score);
      const maxScore = alcCandidates[0].score;
      if (maxScore < 0.2 && !isAlcMatched) isLowConfidence = true;
      bestAlc =
        pickStrongCandidate(alcCandidates, { band: 0.18, minPool: 5, preferMatched: hasExplicitAlc }) ||
        alcCandidates[0].item;
    }
  }

  // 2. 안주 검색
  if (!wantOnlyAlc) {
    let snkCandidates = [];
    for (const { item, vector } of snackEmbeddings) {
      if (snkHardExcluded(item)) continue;
      // 명시 안주 힌트(치킨 등)가 있으면 그 풀 안에서만 고름 — 라면으로 새지 않게
      if (hasExplicitSnack) {
        const inResolved = resolvedSnkIds.has(item.id);
        const inHint = itemMatchesHint(item, snackHints);
        if (!inResolved && !inHint) continue;
      }

      let baseSim = cosineSimilarity(queryVec, vector);
      const { score, isMatched } = calculateScore(
        baseSim,
        item,
        userTokens,
        contextTokens,
        frameSignals,
        userProfile,
        hasNegativeContext,
        true,
        SINGLE_CHAR_ALLOW,
        scoreOpts
      );
      
      let finalScore = score;
      let matched = isMatched;
      if (resolvedSnkIds.has(item.id) || itemMatchesHint(item, snackHints)) {
        finalScore += 0.35;
        matched = true;
        isSnackMatched = true;
      }
      if (rejectedItems.includes(item.id)) finalScore -= 100.0;
      finalScore -= diversityPenalty(item.id, recentIds);

      if (matched) isSnackMatched = true;
      snkCandidates.push({ item, score: finalScore, matched });
    }

    if (snkCandidates.length > 0) {
      snkCandidates.sort((a, b) => b.score - a.score);
      const maxScore = snkCandidates[0].score;
      if (maxScore < 0.2 && !isSnackMatched) isLowConfidence = true;
      bestSnack =
        pickStrongCandidate(snkCandidates, { band: 0.18, minPool: 5, preferMatched: hasExplicitSnack }) ||
        snkCandidates[0].item;
      if (hasExplicitSnack && bestSnack) {
        isSnackMatched = true;
        snackLocked = true;
      }
    }
  }

  // 3. 짝꿍 매칭 — 명시 힌트는 덮어쓰지 않음
  // 안주만 맞음 → 술은 페어링으로 채움 (치킨은 유지)
  if (!wantOnlySnack && isSnackMatched && !alcLocked && bestSnack) {
    const scored = alcoholsData
      .filter((alc) => !alcHardExcluded(alc))
      .map((alc) => ({
        item: alc,
        score: getRelationScore(alc.id, bestSnack.id) - diversityPenalty(alc.id, recentIds) * 40,
      }));
    const picked = pickRelationCandidate(scored, 70);
    if (picked) {
      bestAlc = picked;
    } else if (bestSnack.bestDrinks?.length) {
      const allowedDrinks = bestSnack.bestDrinks.filter((id) => {
        const a = alcoholsData.find((x) => x.id === id);
        return a && !alcHardExcluded(a);
      });
      if (allowedDrinks.length) {
        const drinkId = pickRandom(allowedDrinks);
        bestAlc = alcoholsData.find((a) => a.id === drinkId) || bestAlc;
      }
    }
    isLowConfidence = false;
  } else if (!wantOnlyAlc && isAlcMatched && !snackLocked && !isSnackMatched && bestAlc) {
    // 술만 맞음 → 안주는 페어링 (단, 사용자가 안주를 명시한 경우 절대 덮지 않음)
    const scored = snacksData
      .filter((snk) => !snkHardExcluded(snk))
      .map((snk) => ({
        item: snk,
        score: getRelationScore(bestAlc.id, snk.id) - diversityPenalty(snk.id, recentIds) * 40,
      }));
    const picked = pickRelationCandidate(scored, 70);
    if (picked) {
      bestSnack = picked;
    } else {
      const matchingSnacks = snacksData.filter(s => s.bestDrinks && s.bestDrinks.includes(bestAlc.id) && !snkHardExcluded(s));
      if (matchingSnacks.length > 0) bestSnack = pickRandom(matchingSnacks);
    }
    isLowConfidence = false;
  } else if (!wantOnlySnack && !wantOnlyAlc && bestAlc && bestSnack && !snackLocked) {
    // 둘 다 있지만 페어링이 약함 → 안주만 교체 가능 (명시 안주 잠금 시 스킵)
    const currentRelScore = getRelationScore(bestAlc.id, bestSnack.id);
    if (currentRelScore < 75) {
      const scored = snacksData
        .filter((snk) => !snkHardExcluded(snk))
        .map((snk) => ({
          item: snk,
          score: getRelationScore(bestAlc.id, snk.id) - diversityPenalty(snk.id, recentIds) * 40,
        }));
      const picked = pickRelationCandidate(scored, Math.max(70, currentRelScore + 1));
      if (picked) bestSnack = picked;
    }
  }

  // 4. Fallback — 명시 힌트 풀을 우선
  const explicitSnackPool = snacksData.filter(
    (s) =>
      !rejectedItems.includes(s.id) &&
      !snkHardExcluded(s) &&
      (resolvedSnkIds.has(s.id) || itemMatchesHint(s, snackHints))
  );
  const explicitAlcPool = alcoholsData.filter(
    (a) =>
      !alcHardExcluded(a) &&
      (resolvedAlcIds.has(a.id) || itemMatchesHint(a, alcoholHints))
  );

  if (!bestAlc && alcoholsData.length > 0 && (!wantOnlySnack || hasExplicitAlc)) {
    if (hasExplicitAlc && explicitAlcPool.length) bestAlc = pickRandom(explicitAlcPool);
    else {
      const pool = alcoholsData.filter((a) => !alcHardExcluded(a));
      bestAlc = pickRandom(pool.length ? pool : alcoholsData);
    }
  }
  if (!bestSnack && snacksData.length > 0 && (!wantOnlyAlc || hasExplicitSnack)) {
    if (hasExplicitSnack && explicitSnackPool.length) {
      bestSnack = pickRandom(explicitSnackPool);
      isSnackMatched = true;
      snackLocked = true;
    } else {
      const pool = snacksData.filter((s) => !snkHardExcluded(s));
      bestSnack = pickRandom(pool.length ? pool : snacksData);
    }
  }

  // 명시 안주가 페어링/폴백으로 바뀌었으면 무조건 복구
  if ((snackLocked || hasExplicitSnack) && explicitSnackPool.length) {
    if (!bestSnack || !(resolvedSnkIds.has(bestSnack.id) || itemMatchesHint(bestSnack, snackHints))) {
      bestSnack = pickRandom(explicitSnackPool);
      isSnackMatched = true;
    }
  }
  if ((alcLocked || hasExplicitAlc) && explicitAlcPool.length) {
    if (!bestAlc || !(resolvedAlcIds.has(bestAlc.id) || itemMatchesHint(bestAlc, alcoholHints))) {
      bestAlc = pickRandom(explicitAlcPool);
      isAlcMatched = true;
    }
  }

  // only* 요청이면 반대편을 비우되, 이미 술이나 안주를 정한 상태에서 추천을 요청한 경우는 유지
  if (wantOnlySnack && !hasExplicitAlc) bestAlc = null;
  if (wantOnlyAlc && !hasExplicitSnack) bestSnack = null;

  const isAlone =
    contextSignals?.relation === 'alone' ||
    (contextSignals?.moods || []).includes('honsul') ||
    /혼자|혼술|혼맥|혼소/.test(cleanText);

  // 5. 게임 — 혼자 마실 때나 안주만/논알콜 요청 시에는 술게임을 추천하지 않음
  if (
    gameEmbeddings.length > 0 &&
    !wantOnlySnack &&
    !constraints.nonAlcoholic &&
    !(isAlone && !frame?.slots?.wantGame && !cleanText.includes('게임'))
  ) {
    const gameBoost = frame?.slots?.wantGame ? 0.2 : 0;
    const gameCandidates = gameEmbeddings.map(({ item, vector }) => ({
      item,
      score: cosineSimilarity(queryVec, vector) + gameBoost - diversityPenalty(item.id, recentIds),
    }));
    bestGame = pickFromScoreBand(gameCandidates, 'score', 0.08, 4)?.item || gameCandidates[0]?.item || null;
  } else {
    bestGame = null;
  }

  rememberRecommendedIds([bestAlc?.id, bestSnack?.id, bestGame?.id]);

  return { bestAlc, bestSnack, bestGame, isLowConfidence, isAlcMatched, isSnackMatched };
}
