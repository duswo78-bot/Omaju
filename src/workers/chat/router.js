import { detectIntent } from '../engines/intentDetector.js';
import { handleGreeting } from './greeting.js';
import { handleThanks } from './thanks.js';
import { handleRecommendation } from './recommendation.js';
import { handleReroll } from './reroll.js';
import { handleSmallTalk } from './smalltalk.js';
import { handleQuestion } from './question.js';
import { handleUnknown } from './unknown.js';
import { getState, isState, STATES } from '../engines/stateMachine.js';
import { setPendingContextText } from '../engines/memoryEngine.js';

export async function routeChat(text, cleanText, context) {
  const currentState = getState();
  
  // 상태에 따른 처리 (예: 이전 대기 상태에서 거절/재추천인 경우)
  if (isState(STATES.AWAITING_REC_CONFIRM)) {
    if (cleanText.includes('별로') || cleanText.includes('다른') || cleanText.includes('다시') || cleanText.includes('패스') || cleanText.includes('싫어')) {
      return await handleReroll(text, context);
    } else {
      // 일반 대화로 복귀 시 pendingContext를 날리고 다시 판단
      setPendingContextText('');
    }
  }

  // FOLLOWUP 상태: 스몰톡/공감 후 다음 입력 → 자연스럽게 추천으로 이어줌
  // 단, 명확한 인사/감사/거절이 아닌 경우에만
  if (isState(STATES.FOLLOWUP)) {
    const intent = await detectIntent(text, cleanText, context.isLowConfidence);
    // 명확한 거절/인사/감사가 아니면 추천으로 자동 라우팅
    if (intent === 'REROLL') return await handleReroll(text, context);
    if (intent === 'GREETING') return handleGreeting(text, context);
    if (intent === 'THANKS') return handleThanks(text, context);
    // 나머지(추천 요청, 스몰톡 연장, 질문 등)는 모두 추천으로 자연스럽게 넘김
    return await handleRecommendation(text, cleanText, context);
  }

  // ASKING 상태: 인사/질문 후 다음 입력 → 추천이나 일반 대화로 자연 연결
  if (isState(STATES.ASKING)) {
    // ASKING에서는 일반 Intent 판단을 그대로 진행하되, 
    // 키워드 없는 짧은 입력도 추천으로 넘길 수 있게 함
    // (사용자가 "응" "좋아" "ㅇㅇ" 같은 짧은 긍정을 했을 때)
    const positives = ['응', '좋아', 'ㅇㅇ', '네', '그래', '고고', 'ㅇ', '부탁', '해줘', '골라'];
    if (positives.some(p => cleanText.includes(p)) && cleanText.length <= 6) {
      return await handleRecommendation(text, cleanText, context);
    }
    // 그 외에는 일반 Intent 판단 흐름으로
  }

  // Intent 판단
  const intent = await detectIntent(text, cleanText, context.isLowConfidence);

  switch (intent) {
    case 'GREETING':
      return handleGreeting(text, context);
    case 'THANKS':
      return handleThanks(text, context);
    case 'REROLL':
      return await handleReroll(text, context);
    case 'SMALLTALK':
      return handleSmallTalk(text, context);
    case 'QUESTION':
      return handleQuestion(text, context);
    case 'UNKNOWN':
      return handleUnknown(text, context);
    case 'RECOMMEND':
    default:
      return await handleRecommendation(text, cleanText, context);
  }
}
