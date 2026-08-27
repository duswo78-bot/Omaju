/**
 * FRONT Prompt는 애매할 때만 — 규칙 NLU가 이미 확실하면 스킵 (똑똑함+속도).
 */
import { ruleNlu } from '../workers/nlu/ruleNlu.js';
import { cleanTextString } from '../workers/utils/tokenizer.js';

/**
 * @param {string} text
 * @returns {{ run: boolean, reason: string, confidence: number, intent: string }}
 */
export function shouldRunFrontLlm(text) {
  try {
    const raw = String(text || '');
    const clean = cleanTextString(raw);
    const frame = ruleNlu(raw, clean);
    const intent = frame?.intent || 'UNKNOWN';
    const conf = Number(frame?.confidence) || 0;
    const hasHints =
      (frame?.slots?.alcoholHints || []).length > 0 || (frame?.slots?.snackHints || []).length > 0;

    if (['GREETING', 'THANKS', 'REROLL', 'DENY', 'AFFIRM'].includes(intent) && conf >= 0.6) {
      return { run: false, reason: 'clear_social', confidence: conf, intent };
    }
    if (intent === 'OFFTOPIC' && conf >= 0.65) {
      return { run: false, reason: 'clear_offtopic', confidence: conf, intent };
    }
    if (intent === 'GUIDE' && conf >= 0.7) {
      return { run: false, reason: 'clear_guide', confidence: conf, intent };
    }
    if (intent === 'RECOMMEND' && conf >= 0.72 && hasHints) {
      return { run: false, reason: 'clear_recommend', confidence: conf, intent };
    }
    if (intent === 'UNKNOWN' || intent === 'CLARIFY' || conf < 0.55) {
      return { run: true, reason: 'ambiguous', confidence: conf, intent };
    }
    if (intent === 'SMALLTALK' || intent === 'QUESTION') {
      return { run: true, reason: 'open_ended', confidence: conf, intent };
    }
    // 중간 신뢰도는 FRONT로 슬롯 보강
    return { run: conf < 0.7, reason: conf < 0.7 ? 'mid_confidence' : 'confident', confidence: conf, intent };
  } catch {
    return { run: true, reason: 'gate_error', confidence: 0, intent: 'UNKNOWN' };
  }
}
