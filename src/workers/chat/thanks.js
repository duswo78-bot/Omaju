import { buildAnswer } from '../engines/answerBuilder.js';

export function handleThanks(text, context) {
  const answer = buildAnswer({ intent: 'THANKS' });
  // 감사 인사 후에도 ASKING 상태로 전환하여 추가 추천 제안 가능
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'ASKING' };
}
