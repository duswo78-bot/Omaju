import { buildAnswer } from '../engines/answerBuilder.js';

export function handleGoodbye(text, context) {
  const answer = buildAnswer({
    intent: 'GOODBYE',
    profile: context.profile,
  });
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'ENDED' };
}