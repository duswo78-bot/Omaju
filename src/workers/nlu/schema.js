/**
 * NluIntent
 * - MOOD: 기분/감정 공감 전용 (SMALLTALK로 보내지 않음)
 * - SMALLTALK: 날씨·일상 잡담 전용
 * - GOODBYE: 대화 종료
 * @typedef {'GREETING'|'THANKS'|'REROLL'|'SMALLTALK'|'QUESTION'|'RECOMMEND'|'GUIDE'|'OFFTOPIC'|'AFFIRM'|'DENY'|'CLARIFY'|'UNKNOWN'|'PLACE'|'COMPLAINT'|'MOOD'|'GOODBYE'} NluIntent
 */

/**
 * @typedef {Object} NluConstraints
 * @property {boolean} [onlyAlcohol]
 * @property {boolean} [onlySnack]
 * @property {boolean} [nonAlcoholic]
 * @property {string[]} [exclude]
 * @property {boolean} [spicy]
 * @property {boolean} [light]
 * @property {boolean} [cheap]
 * @property {boolean} [hangover]
 */

/**
 * @typedef {Object} NluSlots
 * @property {string[]} [alcoholHints]
 * @property {string[]} [snackHints]
 * @property {boolean} [wantGame]
 * @property {string[]} [moods]
 * @property {string[]} [weather]
 * @property {NluConstraints} [constraints]
 * @property {string} [placeQuery] — PLACE intent 시 카카오 검색 키워드
 */

/**
 * @typedef {Object} NluFrame
 * @property {NluIntent} intent
 * @property {NluSlots} slots
 * @property {{ alcoholIds?: string[], snackIds?: string[] }} [resolved]
 * @property {number} confidence
 * @property {number} [domainScore]
 * @property {string} [needsClarification]
 * @property {string} [guideHint] — 가이드 응답 힌트 키
 * @property {'llm_front'|'rule'|'merged'} source
 * @property {string} rawText
 * @property {string} [matchedOpening]
 */

export const INTENTS = [
  'GREETING',
  'THANKS',
  'REROLL',
  'SMALLTALK',
  'QUESTION',
  'RECOMMEND',
  'GUIDE',
  'OFFTOPIC',
  'AFFIRM',
  'DENY',
  'CLARIFY',
  'UNKNOWN',
  'PLACE',
  'COMPLAINT',
  'MOOD',
  'GOODBYE',
];

/**
 * @param {Partial<NluFrame> & { rawText: string }} partial
 * @returns {NluFrame}
 */
export function emptyFrame(partial) {
  return {
    intent: partial.intent || 'GUIDE',
    slots: {
      alcoholHints: [],
      snackHints: [],
      wantGame: false,
      moods: [],
      weather: [],
      constraints: {},
      placeQuery: undefined,
      ...(partial.slots || {}),
    },
    resolved: partial.resolved || { alcoholIds: [], snackIds: [] },
    confidence: typeof partial.confidence === 'number' ? partial.confidence : 0.5,
    domainScore: typeof partial.domainScore === 'number' ? partial.domainScore : 0,
    needsClarification: partial.needsClarification,
    guideHint: partial.guideHint,
    source: partial.source || 'rule',
    rawText: partial.rawText,
    matchedOpening: partial.matchedOpening || null,
  };
}
