import { buildAnswer } from '../engines/answerBuilder.js';

export function handleQuestion(text, context) {
  const answer = buildAnswer({ intent: 'QUESTION' });
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'ASKING' };
}
