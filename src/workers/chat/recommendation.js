import { recommend } from '../engines/recommendationEngine.js';
import { buildAnswer } from '../engines/answerBuilder.js';
import { updateProfile } from '../engines/profileEngine.js';
import { getLastRecommendation, setLastRecommendation } from '../engines/memoryEngine.js';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import gamesData from '../../data/games.json';

export async function handleRecommendation(text, cleanText, context) {
  // 프로필 업데이트
  updateProfile(text, alcoholsData, snacksData, gamesData);

  // 이전 추천 내역을 통한 문맥(Context) 상속
  const lastRec = getLastRecommendation();
  let contextKeywords = '';
  
  // 사용자가 새로운 주종을 언급하지 않았는데, 직전에 특정 주종에 대해 대화했다면 그 문맥을 이어감
  const alcKeywords = ['소주', '맥주', '막걸리', '와인', '하이볼', '청하', '양주', '논알콜'];
  const hasNewAlc = alcKeywords.some(k => cleanText.includes(k));
  
  if (!hasNewAlc && lastRec && lastRec.bestAlc) {
    contextKeywords += ` ${lastRec.bestAlc.category} ${lastRec.bestAlc.name_ko}`;
  }

  const uiContext = context.uiContext || '';
  const combinedText = `${cleanText} ${contextKeywords} ${uiContext}`.trim();
  const contextTokens = `${contextKeywords} ${uiContext}`.split(' ').filter(Boolean);

  // 추천 엔진 호출 (결합된 문맥 사용하되 사용자 키워드와 문맥 키워드 분리)
  const recResult = await recommend(combinedText, context.tokens, contextTokens, context.signals);

  // 현재 추천 결과를 메모리에 저장 (다음 턴 문맥용)
  setLastRecommendation({ bestAlc: recResult.bestAlc, bestSnack: recResult.bestSnack });

  // 추천 결과가 없으면 알 수 없는 입력으로 처리
  if (!recResult.bestAlc && !recResult.bestSnack) {
    const answer = buildAnswer({ intent: 'UNKNOWN' });
    return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'IDLE' };
  }

  // Answer Builder 호출
  const answer = buildAnswer({
    intent: 'RECOMMEND',
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    bestGame: recResult.bestGame,
    wantOnlyAlc: cleanText.includes('술만'),
    wantOnlySnack: cleanText.includes('안주만') || cleanText.includes('밥만') || cleanText.includes('식사만'),
    skipPrompt: context.skipPrompt,
    matchedOpening: context.matchedOpening
  });

  const reasonParts = [];
  if (recResult.bestAlc) {
    reasonParts.push(
      `${recResult.bestAlc.name_ko}${recResult.bestAlc.abv > 0 ? ` (${recResult.bestAlc.abv}%)` : ''}`
    );
  }
  if (recResult.bestSnack) reasonParts.push(recResult.bestSnack.name_ko);
  if (context.uiContext) reasonParts.push('테이블 선택 맥락 반영');

  return {
    answer,
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    bestGame: recResult.bestGame,
    reason: reasonParts.join(' · ') || null,
    state: 'AWAITING_REC_CONFIRM'
  };
}
