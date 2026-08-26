import { handleGreeting } from './greeting.js';
import { handleThanks } from './thanks.js';
import { handleRecommendation } from './recommendation.js';
import { handleReroll } from './reroll.js';
import { handleSmallTalk } from './smalltalk.js';
import { handleQuestion } from './question.js';
import { handleUnknown } from './unknown.js';
import { isState, STATES } from '../engines/stateMachine.js';
import { setPendingContextText } from '../engines/memoryEngine.js';

/**
 * @param {string} text
 * @param {string} cleanText
 * @param {object} context — must include context.frame (NluFrame)
 */
export async function routeChat(text, cleanText, context) {
  const frame = context.frame;

  if (isState(STATES.AWAITING_REC_CONFIRM)) {
    if (frame?.intent === 'REROLL') {
      return await handleReroll(text, context);
    }
    setPendingContextText('');
  }

  if (isState(STATES.FOLLOWUP)) {
    const intent = frame?.intent || 'RECOMMEND';
    if (intent === 'REROLL') return await handleReroll(text, context);
    if (intent === 'GREETING') return handleGreeting(text, context);
    if (intent === 'THANKS') return handleThanks(text, context);
    return await handleRecommendation(text, cleanText, context);
  }

  if (isState(STATES.ASKING)) {
    const positives = ['응', '좋아', 'ㅇㅇ', '네', '그래', '고고', 'ㅇ', '부탁', '해줘', '골라'];
    if (positives.some((p) => cleanText.includes(p)) && cleanText.length <= 6) {
      return await handleRecommendation(text, cleanText, context);
    }
  }

  const intent = frame?.intent || 'RECOMMEND';

  switch (intent) {
    case 'GREETING':
      return handleGreeting(text, context);
    case 'THANKS':
      return handleThanks(text, context);
    case 'REROLL':
      return await handleReroll(text, context);
    case 'SMALLTALK':
      return handleSmallTalk(text, context);
    case 'QUESTION':
      return handleQuestion(text, context);
    case 'CLARIFY':
    case 'UNKNOWN':
      return handleUnknown(text, context);
    case 'RECOMMEND':
    default:
      return await handleRecommendation(text, cleanText, context);
  }
}
