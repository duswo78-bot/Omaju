import { cosineSimilarity } from '../utils/math.js';
import { calculateScore } from './scoreEngine.js';
import { embedQuery, getAlcoholEmbeddings, getSnackEmbeddings, getGameEmbeddings } from './embeddingEngine.js';
import { getProfile } from './profileEngine.js';
import { getRejectedItems, getRecentRecommendedIds, rememberRecommendedIds } from './memoryEngine.js';
import { pickRandom, pickFromScoreBand } from '../utils/random.js';
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

export async function recommend(cleanText, userTokens, contextTokens, contextSignals) {
  let bestAlc = null, bestSnack = null, bestGame = null;
  let wantNonAlc = cleanText.includes('논알콜') || cleanText.includes('무알콜') || cleanText.includes('술빼고');
  let wantOnlySnack = cleanText.includes('안주만') || cleanText.includes('밥만') || cleanText.includes('식사만');
  let wantOnlyAlc = cleanText.includes('술만');

  let isAlcMatched = false;
  let isSnackMatched = false;
  let isLowConfidence = false;

  const userProfile = getProfile();
  const rejectedItems = getRejectedItems();
  const recentIds = getRecentRecommendedIds();

  // Real RAG Logic (MiniLM) + Keyword Boosting
  const queryVec = await embedQuery(cleanText);
  const hasNegativeContext = cleanText.includes('먹었') || cleanText.includes('말고') || cleanText.includes('싫어') || cleanText.includes('별로');

  const alcoholEmbeddings = getAlcoholEmbeddings();
  const snackEmbeddings = getSnackEmbeddings();
  const gameEmbeddings = getGameEmbeddings();

  // 1. 주류 검색
  if (!wantOnlySnack) {
    let alcCandidates = [];
    for (const { item, vector } of alcoholEmbeddings) {
      if (wantNonAlc && item.category !== '논알콜/음료') continue;
      if (!wantNonAlc && item.category === '논알콜/음료' && !userTokens.some(t => item.name_ko.includes(t))) continue;

      let baseSim = cosineSimilarity(queryVec, vector);
      const { score, isMatched } = calculateScore(baseSim, item, userTokens, contextTokens, contextSignals, userProfile, hasNegativeContext, false, SINGLE_CHAR_ALLOW);
      
      let finalScore = score;
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
      const { score, isMatched } = calculateScore(baseSim, item, userTokens, contextTokens, contextSignals, userProfile, hasNegativeContext, true, SINGLE_CHAR_ALLOW);
      
      let finalScore = score;
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

  // 3. 짝꿍 매칭 (Relations) — 최고점 1개 고정을 피하고 상위 밴드에서 랜덤
  if (isSnackMatched && !isAlcMatched && bestSnack) {
    const scored = alcoholsData.map((alc) => ({
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
  } else if (isAlcMatched && !isSnackMatched && bestAlc) {
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
  } else if (bestAlc && bestSnack) {
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
  if (!bestAlc && alcoholsData.length > 0 && !wantOnlySnack) bestAlc = pickRandom(alcoholsData);
  if (!bestSnack && snacksData.length > 0 && !wantOnlyAlc) bestSnack = pickRandom(snacksData);

  // 5. 게임 — 유사도 1등만 고르지 않고 상위권에서 랜덤
  if (gameEmbeddings.length > 0) {
    const gameCandidates = gameEmbeddings.map(({ item, vector }) => ({
      item,
      score: cosineSimilarity(queryVec, vector) - diversityPenalty(item.id, recentIds),
    }));
    bestGame = pickFromScoreBand(gameCandidates, 'score', 0.08, 4)?.item || gameCandidates[0]?.item || null;
  }

  rememberRecommendedIds([bestAlc?.id, bestSnack?.id, bestGame?.id]);

  return { bestAlc, bestSnack, bestGame, isLowConfidence, isAlcMatched, isSnackMatched };
}
