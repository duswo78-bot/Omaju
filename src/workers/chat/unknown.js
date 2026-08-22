import { buildAnswer } from '../engines/answerBuilder.js';

export function handleUnknown(text, context) {
  const answer = buildAnswer({ intent: 'UNKNOWN' });
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'IDLE' };
}
