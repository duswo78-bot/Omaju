/** @typedef {'GREETING'|'THANKS'|'REROLL'|'SMALLTALK'|'QUESTION'|'RECOMMEND'|'CLARIFY'|'UNKNOWN'} NluIntent */

/**
 * @typedef {Object} NluConstraints
 * @property {boolean} [onlyAlcohol]
 * @property {boolean} [onlySnack]
 * @property {boolean} [nonAlcoholic]
 * @property {string[]} [exclude]
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
 * @property {string} [needsClarification]
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
  'CLARIFY',
  'UNKNOWN',
];

/**
 * @param {Partial<NluFrame> & { rawText: string }} partial
 * @returns {NluFrame}
 */
export function emptyFrame(partial) {
  return {
    intent: partial.intent || 'RECOMMEND',
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
    needsClarification: partial.needsClarification,
    source: partial.source || 'rule',
    rawText: partial.rawText,
    matchedOpening: partial.matchedOpening || null,
  };
}
