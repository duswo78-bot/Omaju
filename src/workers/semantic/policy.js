import { getLastBotAsk } from './dialogueState.js';

/**
 * Phase4: 공감 → 대화 → 추천 응답 정책
 * @typedef {'empathy'|'ask'|'recommend'|'place'|'apology'|'social'|'guide'} PolicyAction
 *
 * @param {import('./frame.js').SemanticFrame} frame
 * @param {object} [dialogue]
 * @returns {{ action: PolicyAction, askType: string|null, reason: string }}
 */
export function decideResponsePolicy(frame, dialogue = {}) {
  const intent = frame?.intent || 'UNKNOWN';
  const lastAsk = dialogue.lastBotAsk || getLastBotAsk();
  const open = frame?.openToRecommend || 'no';
  const hasSignal = Boolean(frame?.mood || frame?.weather?.length || frame?.relation);
  const hasEntity = (frame?.alcoholHints || []).length > 0 || (frame?.snackHints || []).length > 0;
  const hardConstraint = Boolean(
    frame?.constraints?.onlyAlcohol ||
      frame?.constraints?.onlySnack ||
      frame?.constraints?.nonAlcoholic ||
      frame?.constraints?.hangover
  );
  // "맥주 추천해줘"처럼 주종/안주가 이미 있으면 추가 질문 없이 바로 추천
  const readyToRecommend =
    intent === 'RECOMMEND' ||
    open === 'hard' ||
    hardConstraint ||
    (hasEntity && (intent === 'GUIDE' || intent === 'AFFIRM' || open === 'soft'));

  if (intent === 'DECLINE_ALCOHOL') {
    return { action: 'decline_alcohol', askType: 'nonalc_or_snack', reason: 'decline_alcohol' };
  }
  if (intent === 'CLARIFY') {
    return { action: 'clarify', askType: 'clarify_candidate', reason: 'ambiguous_candidate' };
  }
  if (intent === 'CAPABILITY_GUIDE') {
    return { action: 'capability_guide', askType: 'domain_guide', reason: 'scope_guidance' };
  }
  if (intent === 'WITTY_CHITCHAT' || intent === 'OFFTOPIC') {
    return { action: 'witty_chitchat', askType: 'chitchat_pivot', reason: 'witty_smalltalk' };
  }
  if (intent === 'GREETING' || intent === 'THANKS' || intent === 'GOODBYE' || intent === 'QUESTION') {
    return { action: 'social', askType: intent === 'GREETING' ? 'clarify' : null, reason: 'social_intent' };
  }
  if (intent === 'COMPLAINT') {
    return { action: 'apology', askType: 'clarify', reason: 'repair' };
  }
  if (intent === 'UNKNOWN') {
    return { action: 'apology', askType: 'clarify', reason: 'unknown_fallback' };
  }
  if (intent === 'PLACE' || frame?.placeQuery) {
    return { action: 'place', askType: 'place', reason: 'place_intent' };
  }

  // 직전 soft ask / clarify 이후 긍정·추천 → 추천
  if (
    (intent === 'AFFIRM' || intent === 'RECOMMEND' || intent === 'THANKS') &&
    (lastAsk === 'recommend' || lastAsk === 'clarify')
  ) {
    // clarify 직후 THANKS만으로는 추천하지 않음
    if (intent === 'THANKS' && lastAsk === 'clarify') {
      return { action: 'social', askType: null, reason: 'thanks_after_clarify' };
    }
    if (intent === 'AFFIRM' || intent === 'RECOMMEND') {
      return { action: 'recommend', askType: null, reason: 'affirm_after_ask' };
    }
  }

  // 명시 추천·주종 힌트가 있으면 날씨/감정 soft-ask로 가로채지 않음
  if (readyToRecommend) {
    return { action: 'recommend', askType: null, reason: hasEntity ? 'entity_recommend' : 'explicit_recommend' };
  }

  // "오늘 한 잔?" soft ask에 대한 거절 — 추천/리롤로 보내지 않음
  if (intent === 'DENY' && (lastAsk === 'recommend' || lastAsk === 'clarify' || lastAsk === 'drink')) {
    return { action: 'ack_deny', askType: 'clarify', reason: 'deny_soft_ask' };
  }
  // 이미 추천을 받은 뒤의 "다른거/싫어"만 리롤
  if (intent === 'REROLL') {
    return { action: 'recommend', askType: null, reason: 'reroll' };
  }
  if (intent === 'DENY') {
    return { action: 'ack_deny', askType: 'clarify', reason: 'deny_general' };
  }

  // 감정/날씨만 있고 추천 의사가 약할 때: 공감 (+ 선택적 soft ask)
  // hasSignal만으로 묻지 않음 — 날씨 상속 때문에 "맥주 추천"이 질문으로 새는 것 방지
  if (intent === 'MOOD' || intent === 'SMALLTALK') {
    if (open === 'soft') {
      return { action: 'ask', askType: 'recommend', reason: 'empathy_then_ask' };
    }
    return { action: 'empathy', askType: null, reason: 'empathy_only' };
  }

  if (intent === 'GUIDE' || open === 'soft') {
    return { action: 'guide', askType: 'clarify', reason: 'need_hint' };
  }

  if (intent === 'AFFIRM') {
    return { action: 'recommend', askType: null, reason: 'affirm_default' };
  }

  return { action: 'apology', askType: 'clarify', reason: 'fallback' };
}
