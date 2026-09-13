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
import { handlePlace } from './place.js';
import { handleComplaint } from './complaint.js';
import { handleMood } from './mood.js';
import { handleGoodbye } from './goodbye.js';
import { handleDenyAsk } from './deny.js';
import { handleDeclineAlcohol } from './declineAlcohol.js';
import { handleClarify } from './clarify.js';
import { handleCapabilityGuide } from './capabilityGuide.js';
import { handleWittyChitchat } from './wittyChitchat.js';
import { isState, STATES } from '../engines/stateMachine.js';
import { setPendingContextText } from '../engines/memoryEngine.js';
import { decideResponsePolicy } from '../semantic/policy.js';
import { getDialogueState, setLastBotAsk, pushRecommendHistory, resetChitchatTurns } from '../semantic/dialogueState.js';

/**
 * @param {string} text
 * @param {string} cleanText
 * @param {object} context — must include context.frame (NluFrame), optional context.semantic
 */
export async function routeChat(text, cleanText, context) {
  const frame = context.frame;
  const semantic = context.semantic;
  const dialogue = getDialogueState();
  const policy = decideResponsePolicy(semantic || { intent: frame?.intent }, dialogue);

  const wantOnlySnack =
    Boolean(frame?.slots?.constraints?.onlySnack) ||
    /안주만|음식만|야식만|밥만|디저트만|간식만/.test(cleanText) ||
    /^(?:안주|음식|야식|간식|디저트)(?:만|요|만요)?$/.test(cleanText);

  // 0) 술 거부 / 금주 의도 (단, 야식/안주 요청 시 안주 추천으로 즉시 전환)
  if (frame?.intent === 'DECLINE_ALCOHOL' || policy.action === 'decline_alcohol') {
    if (wantOnlySnack || (!/아무것도\s*먹고\s*싶지|아무것도\s*안\s*먹|입맛\s*없|세상이\s*다\s*싫/.test(cleanText) && /야식|안주|음식|먹을|요리|간식/.test(cleanText))) {
      return await finishRecommend(await handleRecommendation(text, cleanText, context));
    }
    if (getDialogueState().consecutiveChitchatTurns >= 3) {
      return handleWittyChitchat(text, context);
    }
    return handleDeclineAlcohol(text, context);
  }

  if (isState(STATES.AWAITING_REC_CONFIRM)) {
    if (frame?.intent === 'REROLL' || frame?.intent === 'DENY') {
      return await finishRecommend(await handleReroll(text, context));
    }
    if (frame?.intent === 'AFFIRM' || frame?.intent === 'THANKS') {
      return handleAccept(context);
    }
    setPendingContextText('');
  }

  // FOLLOWUP: soft ask 이후 긍정 → 추천 / 거절 → 추천하지 않음
  if (isState(STATES.FOLLOWUP)) {
    if (frame?.intent === 'DECLINE_ALCOHOL' || policy.action === 'decline_alcohol') {
      if (wantOnlySnack || /야식|안주|음식|먹을|요리|간식/.test(cleanText)) {
        return await finishRecommend(await handleRecommendation(text, cleanText, context));
      }
      return handleDeclineAlcohol(text, context);
    }
    if (frame?.intent === 'CLARIFY' || policy.action === 'clarify') {
      return handleClarify(text, context);
    }
    if (frame?.intent === 'CAPABILITY_GUIDE' || policy.action === 'capability_guide') {
      return handleCapabilityGuide(text, context);
    }
    if (frame?.intent === 'WITTY_CHITCHAT' || policy.action === 'witty_chitchat') {
      return handleWittyChitchat(text, context);
    }
    if (frame?.intent === 'DENY' || policy.action === 'ack_deny') {
      return handleDenyAsk(text, context);
    }
    if (frame?.intent === 'REROLL') {
      return await finishRecommend(await handleReroll(text, context));
    }
    if (policy.action === 'recommend' || frame?.intent === 'RECOMMEND') {
      return await finishRecommend(await handleRecommendation(text, cleanText, context));
    }
    if (frame?.intent === 'AFFIRM' && (policy.reason === 'affirm_after_ask' || dialogue.lastBotAsk === 'recommend')) {
      return await finishRecommend(await handleRecommendation(text, cleanText, context));
    }
    if (frame?.intent === 'GREETING') return handleGreeting(text, context);
    if (frame?.intent === 'THANKS') return handleThanks(text, context);
    if (frame?.intent === 'GOODBYE') return handleGoodbye(text, context);
    if (frame?.intent === 'OFFTOPIC') return handleOfftopic(text, context);
    if (frame?.intent === 'PLACE' || policy.action === 'place') return handlePlace(text, context);
    if (frame?.intent === 'COMPLAINT' || policy.action === 'apology') {
      setLastBotAsk(policy.askType || 'clarify');
      return frame?.intent === 'COMPLAINT' ? handleComplaint(text, context) : handleUnknown(text, context);
    }
    if (frame?.intent === 'MOOD' || policy.action === 'ask' || policy.action === 'empathy') {
      return handleMood(text, context, policy);
    }
    if (frame?.intent === 'SMALLTALK') return handleSmallTalk(text, context, policy);
    if (frame?.intent === 'GUIDE' || policy.action === 'guide') return handleGuide(text, context);
    if ((frame?.slots?.moods || []).length > 0 || frame?.guideHint === 'mood') {
      return handleMood(text, context, policy);
    }
    return handleSmallTalk(text, context);
  }

  if (isState(STATES.ASKING)) {
    if (frame?.intent === 'DECLINE_ALCOHOL' || policy.action === 'decline_alcohol') {
      if (wantOnlySnack || (!/아무것도\s*먹고\s*싶지|아무것도\s*안\s*먹|입맛\s*없|세상이\s*다\s*싫/.test(cleanText) && /야식|안주|음식|먹을|요리|간식/.test(cleanText))) {
        return await finishRecommend(await handleRecommendation(text, cleanText, context));
      }
      if (getDialogueState().consecutiveChitchatTurns >= 3) {
        return handleWittyChitchat(text, context);
      }
      return handleDeclineAlcohol(text, context);
    }
    if (frame?.intent === 'CLARIFY' || policy.action === 'clarify') {
      return handleClarify(text, context);
    }
    if (frame?.intent === 'CAPABILITY_GUIDE' || policy.action === 'capability_guide') {
      return handleCapabilityGuide(text, context);
    }
    if (frame?.intent === 'WITTY_CHITCHAT' || policy.action === 'witty_chitchat') {
      return handleWittyChitchat(text, context);
    }
    if (frame?.intent === 'DENY' || policy.action === 'ack_deny') {
      return handleDenyAsk(text, context);
    }
    if (frame?.intent === 'AFFIRM' || frame?.intent === 'RECOMMEND' || policy.action === 'recommend') {
      return await finishRecommend(await handleRecommendation(text, cleanText, context));
    }
    if (frame?.intent === 'OFFTOPIC') return handleOfftopic(text, context);
    if (frame?.intent === 'PLACE') return handlePlace(text, context);
    if (frame?.intent === 'COMPLAINT') return handleComplaint(text, context);
    if (frame?.intent === 'MOOD') {
      if (getDialogueState().consecutiveChitchatTurns >= 2) {
        return handleWittyChitchat(text, context);
      }
      return handleMood(text, context, policy);
    }
    if (frame?.intent === 'GOODBYE') return handleGoodbye(text, context);
    if (frame?.intent === 'SMALLTALK') return handleSmallTalk(text, context, policy);
    if (frame?.intent === 'UNKNOWN' || policy.action === 'apology') {
      return handleUnknown(text, context);
    }
    if (frame?.intent === 'GUIDE') return handleGuide(text, context);
  }

  return await dispatchByPolicy(text, cleanText, context, policy, wantOnlySnack);
}

async function dispatchByPolicy(text, cleanText, context, policy, wantOnlySnack = false) {
  const intent = context.frame?.intent || 'GUIDE';

  switch (policy.action) {
    case 'decline_alcohol':
      if (wantOnlySnack || /야식|안주|음식|먹을|요리|간식/.test(cleanText)) {
        return await finishRecommend(await handleRecommendation(text, cleanText, context));
      }
      return handleDeclineAlcohol(text, context);
    case 'clarify':
      return handleClarify(text, context);
    case 'capability_guide':
      return handleCapabilityGuide(text, context);
    case 'witty_chitchat':
      return handleWittyChitchat(text, context);
    case 'ack_deny':
      return handleDenyAsk(text, context);
    case 'recommend':
      return await finishRecommend(
        intent === 'REROLL'
          ? await handleReroll(text, context)
          : await handleRecommendation(text, cleanText, context)
      );
    case 'place':
      return handlePlace(text, context);
    case 'ask':
    case 'empathy':
      return handleMood(text, context, policy);
    case 'apology':
      if (intent === 'COMPLAINT') return handleComplaint(text, context);
      if (intent === 'OFFTOPIC' || intent === 'WITTY_CHITCHAT') return handleWittyChitchat(text, context);
      return handleUnknown(text, context);
    case 'social':
      if (intent === 'GREETING') return handleGreeting(text, context);
      if (intent === 'THANKS') return handleThanks(text, context);
      if (intent === 'GOODBYE') return handleGoodbye(text, context);
      if (intent === 'QUESTION') return handleQuestion(text, context);
      return handleGuide(text, context);
    case 'guide':
    default:
      if (intent === 'SMALLTALK') return handleSmallTalk(text, context, policy);
      setLastBotAsk(policy.askType || 'clarify');
      return handleGuide(text, context);
  }
}

async function finishRecommend(result) {
  setLastBotAsk(null);
  resetChitchatTurns();
  if (result?.bestAlc || result?.bestSnack) {
    pushRecommendHistory({
      alcohol: result.bestAlc?.name_ko,
      snack: result.bestSnack?.name_ko,
    });
  }
  return result;
}
