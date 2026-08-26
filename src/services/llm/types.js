/**
 * @typedef {Object} LlmProbeResult
 * @property {boolean} available
 * @property {string} [reason]
 * @property {'android'|'ios'|'stub'|'cloud'} [provider]
 */

/**
 * @typedef {Object} SystemLlmProvider
 * @property {() => Promise<LlmProbeResult>} probe
 * @property {(input: { text: string, history?: object[] }) => Promise<string|null>} generateFront
 * @property {(input: { facts: object, profile?: object|null }) => Promise<string|null>} generateBack
 */

export const LLM_MODES = {
  FULL: 'FULL',
  LITE: 'LITE',
};
