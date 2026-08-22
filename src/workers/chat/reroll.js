import { recommend } from '../engines/recommendationEngine.js';
import { buildAnswer } from '../engines/answerBuilder.js';
import { getPendingContextText, getLastRecommendation, addRejectedItem } from '../engines/memoryEngine.js';

export async function handleReroll(text, context) {
  // 사용자가 거절한 아이템 기억
  const lastRec = getLastRecommendation();
  if (lastRec) {
    if (lastRec.bestAlc) addRejectedItem(lastRec.bestAlc.id);
    if (lastRec.bestSnack) addRejectedItem(lastRec.bestSnack.id);
  }

  // 이전 컨텍스트 텍스트(pendingContextText)가 있다면 그것과 합쳐서 추천 진행
  const pendingText = getPendingContextText();
  const combinedText = pendingText ? `${pendingText} ${text}` : text;
  const contextTokens = pendingText ? pendingText.split(' ').filter(Boolean) : [];
  
  // 추천 엔진 재호출 (내부에서 rejectedItems를 참고함)
  const recResult = await recommend(combinedText, context.tokens, contextTokens, context.signals);
  
  // 추천 결과가 없으면 알 수 없는 입력으로 처리
  if (!recResult.bestAlc && !recResult.bestSnack) {
    const answer = buildAnswer({ intent: 'UNKNOWN' });
    return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'IDLE' };
  }

  // Answer Builder로 재추천 응답 생성
  const answer = buildAnswer({
    intent: 'REROLL',
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    wantOnlyAlc: combinedText.includes('술만'),
    wantOnlySnack: combinedText.includes('안주만') || combinedText.includes('밥만') || combinedText.includes('식사만'),
    skipPrompt: false,
    matchedOpening: null
  });

  const reasonParts = [];
  if (recResult.bestAlc) reasonParts.push(recResult.bestAlc.name_ko);
  if (recResult.bestSnack) reasonParts.push(recResult.bestSnack.name_ko);

  return {
    answer,
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    bestGame: recResult.bestGame,
    reason: reasonParts.length ? `다른 조합 · ${reasonParts.join(' + ')}` : null,
    state: 'AWAITING_REC_CONFIRM'
  };
}
