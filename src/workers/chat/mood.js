import { pickRandom } from '../utils/random.js';
import moodTemplates from '../templates/mood.json';
import { setLastBotAsk } from '../semantic/dialogueState.js';
import { composeSemanticReply } from '../semantic/composeEmpathy.js';

/**
 * 기분/감정 공감. policy에 따라 공감만 or 공감+추천 제안.
 */
export function handleMood(text, context, policy = {}) {
  const action = policy.action || 'ask';
  const opening = context.frame?.matchedOpening || context.matchedOpening || '';
  const semantic = context.semantic;

  let answer;
  if (semantic && (semantic.weather?.length || semantic.mood)) {
    answer = composeSemanticReply(semantic, action === 'empathy' ? 'empathy' : 'ask');
  } else {
    const pool = action === 'empathy' ? moodTemplates.empathy : moodTemplates.ask;
    answer = pickRandom(pool || moodTemplates.ask);
  }

  if (opening && Math.random() > 0.4) {
    answer = `${opening}\n\n${answer}`;
  } else if (context.profile?.name && Math.random() > 0.55) {
    answer = `${context.profile.name}님, ${answer}`;
  }

  if (action === 'ask' || policy.askType === 'recommend') {
    setLastBotAsk('recommend');
  } else {
    setLastBotAsk(null);
  }

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'FOLLOWUP',
  };
}
