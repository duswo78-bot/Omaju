import { pickRandom } from '../utils/random.js';
import smalltalkTemplates from '../templates/smalltalk.json';
import { setLastBotAsk } from '../semantic/dialogueState.js';
import { composeSemanticReply } from '../semantic/composeEmpathy.js';

/**
 * 날씨·일상 잡담. 의미가 있으면 soft ask로 추천 연결.
 */
export function handleSmallTalk(text, context, policy = {}) {
  const semantic = context.semantic;
  const wantAsk = policy.action === 'ask' || semantic?.openToRecommend === 'soft';

  let answer;
  if (semantic && (semantic.weather?.length || semantic.mood)) {
    answer = composeSemanticReply(semantic, wantAsk ? 'ask' : 'empathy');
  } else {
    answer = pickRandom(smalltalkTemplates);
  }

  if (context.frame?.matchedOpening && Math.random() > 0.45) {
    answer = `${context.frame.matchedOpening}\n\n${answer}`;
  }

  setLastBotAsk(wantAsk ? 'recommend' : null);

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'FOLLOWUP',
  };
}
