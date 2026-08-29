import { buildAnswer } from '../engines/answerBuilder.js';
import { setLastBotAsk } from '../semantic/dialogueState.js';

export function handleDeclineAlcohol(text, context) {
  const answer = buildAnswer({
    intent: 'DECLINE_ALCOHOL',
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    profile: context?.profile,
  });

  setLastBotAsk('nonalc_or_snack');

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
