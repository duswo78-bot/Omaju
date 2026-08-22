import { buildAnswer } from '../engines/answerBuilder.js';

export function handleSmallTalk(text, context) {
  // 감정/상황이 감지된 경우 matchedOpening(공감 오프닝)이 있음
  // → 공감 문장 + 추천 유도를 함께 전달
  const answer = buildAnswer({ 
    intent: 'SMALLTALK',
    matchedOpening: context.matchedOpening 
  });
  // FOLLOWUP 상태로 전환하여 다음 입력을 자동으로 추천으로 이어줌
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'FOLLOWUP' };
}
