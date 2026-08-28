import { pickRandom } from '../utils/random.js';
import denyTemplates from '../templates/deny.json';
import { setLastBotAsk } from '../semantic/dialogueState.js';

/**
 * soft ask("오늘 한 잔?")에 대한 거절 — 추천으로 넘어가지 않음
 */
export function handleDenyAsk(text, context) {
  let answer = pickRandom(denyTemplates);
  if (context.profile?.name && Math.random() > 0.55) {
    answer = `${context.profile.name}님, ${answer}`;
  }
  setLastBotAsk('clarify');
  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
