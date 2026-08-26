/** @typedef {'GREETING'|'THANKS'|'REROLL'|'SMALLTALK'|'QUESTION'|'RECOMMEND'|'GUIDE'|'OFFTOPIC'|'AFFIRM'|'DENY'|'CLARIFY'|'UNKNOWN'} NluIntent */

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
 */

/**
 * @typedef {Object} NluFrame
 * @property {NluIntent} intent
 * @property {NluSlots} slots
 * @property {{ alcoholIds?: string[], snackIds?: string[] }} [resolved]
 * @property {number} confidence
 * @property {number} [domainScore]
 * @property {string} [needsClarification]
 * @property {string} [guideHint] — 유도 질문 힌트 키
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
