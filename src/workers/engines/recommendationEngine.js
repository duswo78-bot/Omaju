import { cosineSimilarity } from '../utils/math.js';
import { calculateScore } from './scoreEngine.js';
import { embedQuery, getAlcoholEmbeddings, getSnackEmbeddings, getGameEmbeddings } from './embeddingEngine.js';
import { getProfile } from './profileEngine.js';
import { getRejectedItems } from './memoryEngine.js';
import { pickRandom } from '../utils/random.js';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import gamesData from '../../data/games.json';
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

const SINGLE_CHAR_ALLOW = ['비', '눈', '회', '파', '단', '짠', '맵', '쓴', '빵', '밥', '면', '탕', '전', '편', '떡', '술'];

export async function recommend(cleanText, userTokens, contextTokens, contextSignals) {
  const isMock = false; // 향후 환경 변수 등으로 제어 가능

  let bestAlc = null, bestSnack = null, bestGame = null;
  let wantNonAlc = cleanText.includes('논알콜') || cleanText.includes('무알콜') || cleanText.includes('술빼고');
  let wantOnlySnack = cleanText.includes('안주만') || cleanText.includes('밥만') || cleanText.includes('식사만');
  let wantOnlyAlc = cleanText.includes('술만');

  let isAlcMatched = false;
  let isSnackMatched = false;
  let isLowConfidence = false;

  const userProfile = getProfile();

  if (isMock) {
    // Mock Logic (생략되지만 필요 시 복원 가능)
    // 현재는 바로 Real RAG 로직으로 진행
  }

  // Real RAG Logic (MiniLM) + Keyword Boosting
  const queryVec = await embedQuery(cleanText);
  const hasNegativeContext = cleanText.includes('먹었') || cleanText.includes('말고') || cleanText.includes('싫어') || cleanText.includes('별로');

  const alcoholEmbeddings = getAlcoholEmbeddings();
  const snackEmbeddings = getSnackEmbeddings();
  const gameEmbeddings = getGameEmbeddings();

  // 메모리 엔진에서 거절된 아이템 목록을 불러오기
  const rejectedItems = getRejectedItems();

  // 1. 주류 검색
  if (!wantOnlySnack) {
    let alcCandidates = [];
    for (const { item, vector } of alcoholEmbeddings) {
      if (wantNonAlc && item.category !== '논알콜/음료') continue;
      if (!wantNonAlc && item.category === '논알콜/음료' && !userTokens.some(t => item.name_ko.includes(t))) continue;

      let baseSim = cosineSimilarity(queryVec, vector);
      const { score, isMatched } = calculateScore(baseSim, item, userTokens, contextTokens, contextSignals, userProfile, hasNegativeContext, false, SINGLE_CHAR_ALLOW);
      
      let finalScore = score;
      // 거절된 아이템은 큰 페널티를 주어 제외되도록 함
      if (rejectedItems.includes(item.id)) {
        finalScore -= 100.0;
      }
      
      if (isMatched) isAlcMatched = true;
      alcCandidates.push({ item, score: finalScore });
    }
    
    if (alcCandidates.length > 0) {
      alcCandidates.sort((a, b) => b.score - a.score);
      const maxScore = alcCandidates[0].score;
      if (maxScore < 0.2 && !isAlcMatched) isLowConfidence = true;
      
      // 최상위 점수와 0.05 이내로 차이나는 후보들 중 랜덤으로 선택 (항상 똑같은 결과 방지)
      const topCandidates = alcCandidates.filter(c => maxScore - c.score < 0.05);
      bestAlc = pickRandom(topCandidates).item;
    }
  }

  // 2. 안주 검색
  if (!wantOnlyAlc) {
    let snkCandidates = [];
    for (const { item, vector } of snackEmbeddings) {
      let baseSim = cosineSimilarity(queryVec, vector);
      const { score, isMatched } = calculateScore(baseSim, item, userTokens, contextTokens, contextSignals, userProfile, hasNegativeContext, true, SINGLE_CHAR_ALLOW);
      
      let finalScore = score;
      if (rejectedItems.includes(item.id)) {
        finalScore -= 100.0;
      }

      if (isMatched) isSnackMatched = true;
      snkCandidates.push({ item, score: finalScore });
    }

    if (snkCandidates.length > 0) {
      snkCandidates.sort((a, b) => b.score - a.score);
      const maxScore = snkCandidates[0].score;
      if (maxScore < 0.2 && !isSnackMatched) isLowConfidence = true;

      // 최상위 점수와 0.05 이내로 차이나는 후보들 중 랜덤 선택
      const topCandidates = snkCandidates.filter(c => maxScore - c.score < 0.05);
      bestSnack = pickRandom(topCandidates).item;
    }
  }

  // 3. 짝꿍 매칭 (Relations DB 활용 강화)
  if (isSnackMatched && !isAlcMatched && bestSnack) {
    // 안주가 매칭됐으면 relations.json에서 가장 궁합 점수가 높은 술을 찾음
    let bestRelScore = 0;
    let bestRelAlc = null;
    for (const alc of alcoholsData) {
      const relScore = getRelationScore(alc.id, bestSnack.id);
      if (relScore > bestRelScore) {
        bestRelScore = relScore;
        bestRelAlc = alc;
      }
    }
    // relations에 점수가 있으면 그걸 우선, 없으면 기존 bestDrinks 사용
    if (bestRelAlc && bestRelScore >= 70) {
      bestAlc = bestRelAlc;
    } else if (bestSnack.bestDrinks && bestSnack.bestDrinks.length > 0) {
      const drinkId = pickRandom(bestSnack.bestDrinks);
      bestAlc = alcoholsData.find(a => a.id === drinkId) || bestAlc;
    }
    isLowConfidence = false;
  } else if (isAlcMatched && !isSnackMatched && bestAlc) {
    // 술이 매칭됐으면 relations.json에서 가장 궁합 점수가 높은 안주를 찾음
    let bestRelScore = 0;
    let bestRelSnack = null;
    for (const snk of snacksData) {
      const relScore = getRelationScore(bestAlc.id, snk.id);
      if (relScore > bestRelScore && !rejectedItems.includes(snk.id)) {
        bestRelScore = relScore;
        bestRelSnack = snk;
      }
    }
    if (bestRelSnack && bestRelScore >= 70) {
      bestSnack = bestRelSnack;
    } else {
      const matchingSnacks = snacksData.filter(s => s.bestDrinks && s.bestDrinks.includes(bestAlc.id));
      if (matchingSnacks.length > 0) bestSnack = pickRandom(matchingSnacks);
    }
    isLowConfidence = false;
  } else if (bestAlc && bestSnack) {
    // 둘 다 있을 때: relations.json에 더 좋은 궁합이 있으면 안주를 교체
    const currentRelScore = getRelationScore(bestAlc.id, bestSnack.id);
    if (currentRelScore < 70) {
      let betterSnack = null;
      let betterScore = currentRelScore;
      for (const snk of snacksData) {
        const relScore = getRelationScore(bestAlc.id, snk.id);
        if (relScore > betterScore && !rejectedItems.includes(snk.id)) {
          betterScore = relScore;
          betterSnack = snk;
        }
      }
      if (betterSnack) bestSnack = betterSnack;
    }
  }

  // 4. Fallback (완전 랜덤)
  if (!bestAlc && alcoholsData.length > 0 && !wantOnlySnack) bestAlc = pickRandom(alcoholsData);
  if (!bestSnack && snacksData.length > 0 && !wantOnlyAlc) bestSnack = pickRandom(snacksData);

  // 5. 게임 검색
  if (gameEmbeddings.length > 0) {
    let maxGameSim = -Infinity;
    for (const { item, vector } of gameEmbeddings) {
      let sim = cosineSimilarity(queryVec, vector);
      if (sim > maxGameSim) {
        maxGameSim = sim;
        bestGame = item;
      }
    }
  }

  return { bestAlc, bestSnack, bestGame, isLowConfidence, isAlcMatched, isSnackMatched };
}
