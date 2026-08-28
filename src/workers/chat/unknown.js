import { buildAnswer } from '../engines/answerBuilder.js';
import { setLastBotAsk } from '../semantic/dialogueState.js';

/**
 * 알아듣지 못한 말 → 자연스럽게 사과하고, 필요한 힌트를 다시 받는다.
 */
export function handleUnknown(text, context) {
  const answer = buildAnswer({ intent: 'UNKNOWN', profile: context.profile });
  setLastBotAsk('clarify');
  return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'ASKING' };
}
