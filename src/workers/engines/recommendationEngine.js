import { cosineSimilarity } from '../utils/math.js';
import { calculateScore } from './scoreEngine.js';
import { embedQuery, getAlcoholEmbeddings, getSnackEmbeddings, getGameEmbeddings } from './embeddingEngine.js';
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
  return relationMap.get(`${alcId}|${snkId}`) || 0;
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

/** Pull exclude tokens from NLU constraints + inline “X 말고/싫어” patterns. */
function collectExcludeTokens(cleanText, constraints) {
  const tokens = [...(constraints?.exclude || [])];
  const re = /([가-힣A-Za-z0-9]{1,12})\s*(말고|제외|빼고|싫|별로|먹었)/g;
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
  let wantOnlySnack =
    Boolean(constraints.onlySnack) ||
    cleanText.includes('안주만') ||
    cleanText.includes('밥만') ||
    cleanText.includes('식사만');
  let wantOnlyAlc = Boolean(constraints.onlyAlcohol) || cleanText.includes('술만');

  const resolvedAlcIds = new Set(frame?.resolved?.alcoholIds || []);
  const resolvedSnkIds = new Set(frame?.resolved?.snackIds || []);
  const frameSignals = {
    moods: [...(contextSignals?.moods || []), ...(frame?.slots?.moods || [])],
    weather: [...(contextSignals?.weather || []), ...(frame?.slots?.weather || [])],
    energy: contextSignals?.energy || null,
    relation: contextSignals?.relation || null,
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
  const queryVec = await embedQuery(cleanText);
  const hasNegativeContext = hasNegation;

  const alcoholEmbeddings = getAlcoholEmbeddings();
  const snackEmbeddings = getSnackEmbeddings();
  const gameEmbeddings = getGameEmbeddings();

  const allowNonAlcInPool =
    wantNonAlc ||
    favFam === 'nonalc' ||
    explicitFamilies.includes('nonalc') ||
    (userTokens || []).some((t) => /논알|무알/.test(String(t)));

  // 1. 주류 검색
  if (!wantOnlySnack) {
    let alcCandidates = [];
    for (const { item, vector } of alcoholEmbeddings) {
      if (wantNonAlc && item.category !== '논알콜/음료' && item.abv !== 0) continue;
      if (!allowNonAlcInPool && item.category === '논알콜/음료') continue;
      if (isExcludedItem(item, {
        families: scoreOpts.excludedFamilies,
        needles: scoreOpts.excludedNeedles,
        ids: scoreOpts.excludedIds,
      })) continue;

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
      if (resolvedAlcIds.has(item.id)) {
        finalScore += 0.35;
        isAlcMatched = true;
      }
      if (rejectedItems.includes(item.id)) finalScore -= 100.0;
      finalScore -= diversityPenalty(item.id, recentIds);
      
      if (isMatched) isAlcMatched = true;
      alcCandidates.push({ item, score: finalScore });
    }
    
    if (alcCandidates.length > 0) {
      alcCandidates.sort((a, b) => b.score - a.score);
      const maxScore = alcCandidates[0].score;
      if (maxScore < 0.2 && !isAlcMatched) isLowConfidence = true;
      // 기존 0.05 밴드가 너무 좁아 항상 같은 1등이 뽑힘 → 확대
      bestAlc = pickFromScoreBand(alcCandidates, 'score', 0.18, 8)?.item || alcCandidates[0].item;
    }
  }

  // 2. 안주 검색
  if (!wantOnlyAlc) {
    let snkCandidates = [];
    for (const { item, vector } of snackEmbeddings) {
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
      if (resolvedSnkIds.has(item.id)) {
        finalScore += 0.35;
        isSnackMatched = true;
      }
      if (rejectedItems.includes(item.id)) finalScore -= 100.0;
      finalScore -= diversityPenalty(item.id, recentIds);

      if (isMatched) isSnackMatched = true;
      snkCandidates.push({ item, score: finalScore });
    }

    if (snkCandidates.length > 0) {
      snkCandidates.sort((a, b) => b.score - a.score);
      const maxScore = snkCandidates[0].score;
      if (maxScore < 0.2 && !isSnackMatched) isLowConfidence = true;
      bestSnack = pickFromScoreBand(snkCandidates, 'score', 0.18, 10)?.item || snkCandidates[0].item;
    }
  }

  const alcHardExcluded = (alc) =>
    isExcludedItem(alc, {
      families: scoreOpts.excludedFamilies,
      needles: scoreOpts.excludedNeedles,
      ids: scoreOpts.excludedIds,
    }) ||
    (wantNonAlc && alc.category !== '논알콜/음료' && alc.abv !== 0);

  // 3. 짝꿍 매칭 — onlySnack/onlyAlc일 때는 상대편을 억지로 채우지 않음
  if (!wantOnlySnack && isSnackMatched && !isAlcMatched && bestSnack) {
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
      const drinkId = pickRandom(bestSnack.bestDrinks);
      bestAlc = alcoholsData.find(a => a.id === drinkId) || bestAlc;
    }
    isLowConfidence = false;
  } else if (!wantOnlyAlc && isAlcMatched && !isSnackMatched && bestAlc) {
    const scored = snacksData
      .filter((snk) => !rejectedItems.includes(snk.id))
      .map((snk) => ({
        item: snk,
        score: getRelationScore(bestAlc.id, snk.id) - diversityPenalty(snk.id, recentIds) * 40,
      }));
    const picked = pickRelationCandidate(scored, 70);
    if (picked) {
      bestSnack = picked;
    } else {
      const matchingSnacks = snacksData.filter(s => s.bestDrinks && s.bestDrinks.includes(bestAlc.id) && !rejectedItems.includes(s.id));
      if (matchingSnacks.length > 0) bestSnack = pickRandom(matchingSnacks);
    }
    isLowConfidence = false;
  } else if (!wantOnlySnack && !wantOnlyAlc && bestAlc && bestSnack) {
    const currentRelScore = getRelationScore(bestAlc.id, bestSnack.id);
    if (currentRelScore < 75) {
      const scored = snacksData
        .filter((snk) => !rejectedItems.includes(snk.id))
        .map((snk) => ({
          item: snk,
          score: getRelationScore(bestAlc.id, snk.id) - diversityPenalty(snk.id, recentIds) * 40,
        }));
      const picked = pickRelationCandidate(scored, Math.max(70, currentRelScore + 1));
      if (picked) bestSnack = picked;
    }
  }

  // 4. Fallback
  if (!bestAlc && alcoholsData.length > 0 && !wantOnlySnack) {
    const pool = alcoholsData.filter((a) => !alcHardExcluded(a));
    bestAlc = pickRandom(pool.length ? pool : alcoholsData);
  }
  if (!bestSnack && snacksData.length > 0 && !wantOnlyAlc) bestSnack = pickRandom(snacksData);

  // only* 요청이면 반대편을 강제로 비움
  if (wantOnlySnack) bestAlc = null;
  if (wantOnlyAlc) bestSnack = null;

  // 5. 게임 — 유사도 1등만 고르지 않고 상위권에서 랜덤
  // wantGame이 명시되지 않아도 유사도 후보는 유지하되, 명시 요청 시 가산
  if (gameEmbeddings.length > 0) {
    const gameBoost = frame?.slots?.wantGame ? 0.2 : 0;
    const gameCandidates = gameEmbeddings.map(({ item, vector }) => ({
      item,
      score: cosineSimilarity(queryVec, vector) + gameBoost - diversityPenalty(item.id, recentIds),
    }));
    bestGame = pickFromScoreBand(gameCandidates, 'score', 0.08, 4)?.item || gameCandidates[0]?.item || null;
    if (!frame?.slots?.wantGame && !cleanText.includes('게임') && !cleanText.includes('놀')) {
      // 비명시 요청에서는 게임 카드를 항상 붙이지 않도록 null 가능 — 핸들러에서 필터
    }
  }

  rememberRecommendedIds([bestAlc?.id, bestSnack?.id, bestGame?.id]);

  return { bestAlc, bestSnack, bestGame, isLowConfidence, isAlcMatched, isSnackMatched };
}
