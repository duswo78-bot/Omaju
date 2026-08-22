import { buildAnswer } from '../engines/answerBuilder.js';

export function handleGreeting(text, context) {
  const answer = buildAnswer({ intent: 'GREETING' });
  // ASKING 상태로 전환 → 다음 메시지에서 사용자가 뭘 원하는지 자연스럽게 물어봄
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'ASKING' };
}
