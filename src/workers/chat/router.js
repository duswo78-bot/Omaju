import { handleGreeting } from './greeting.js';
import { handleThanks } from './thanks.js';
import { handleRecommendation } from './recommendation.js';
import { handleReroll } from './reroll.js';
import { handleAccept } from './accept.js';
import { handleSmallTalk } from './smalltalk.js';
import { handleQuestion } from './question.js';
import { handleUnknown } from './unknown.js';
import { handleGuide } from './guide.js';
import { handleOfftopic } from './offtopic.js';
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
    if (frame?.intent === 'REROLL' || frame?.intent === 'DENY') {
      return await handleReroll(text, context);
    }
    if (frame?.intent === 'AFFIRM' || frame?.intent === 'THANKS') {
      return handleAccept(context);
    }
    setPendingContextText('');
  }

  if (isState(STATES.FOLLOWUP)) {
    const intent = frame?.intent || 'GUIDE';
    if (intent === 'REROLL' || intent === 'DENY') return await handleReroll(text, context);
    if (intent === 'GREETING') return handleGreeting(text, context);
    if (intent === 'THANKS') return handleThanks(text, context);
    if (intent === 'OFFTOPIC') return handleOfftopic(text, context);
    if (intent === 'GUIDE') return handleGuide(text, context);
    if (intent === 'AFFIRM' || intent === 'RECOMMEND') {
      return await handleRecommendation(text, cleanText, context);
    }
    return handleGuide(text, context);
  }

  if (isState(STATES.ASKING)) {
    if (frame?.intent === 'AFFIRM' || frame?.intent === 'RECOMMEND') {
      return await handleRecommendation(text, cleanText, context);
    }
    if (frame?.intent === 'DENY') {
      return handleGuide(text, { ...context, frame: { ...frame, guideHint: 'general' } });
    }
    if (frame?.intent === 'OFFTOPIC') return handleOfftopic(text, context);
    // ASKING 중 새 힌트가 오면 추천/가이드로
    if (frame?.intent === 'GUIDE') return handleGuide(text, context);
  }

  const intent = frame?.intent || 'GUIDE';

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
    case 'GUIDE':
      return handleGuide(text, context);
    case 'OFFTOPIC':
      return handleOfftopic(text, context);
    case 'AFFIRM':
      return await handleRecommendation(text, cleanText, context);
    case 'DENY':
      return handleGuide(text, { ...context, frame: { ...frame, guideHint: 'general' } });
    case 'CLARIFY':
    case 'UNKNOWN':
      return handleUnknown(text, context);
    case 'RECOMMEND':
      return await handleRecommendation(text, cleanText, context);
    default:
      return handleGuide(text, context);
  }
}
