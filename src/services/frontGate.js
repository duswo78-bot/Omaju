/**
 * FRONT Prompt는 언어적 이해가 필요한 복잡/다중 조건 발화에서 적극 가동하고,
 * 단순 명시 키워드나 명확한 소셜 발화는 룰 NLU로 쾌속 처리합니다.
 */
import { ruleNlu } from '../workers/nlu/ruleNlu.js';
import { cleanTextString } from '../workers/utils/tokenizer.js';

// 복잡한 문맥/의도 전환/제외 신호 탐지 정규식
const COMPLEX_TRIGGER_REGEX =
  /(?:말고|빼고|싫어|제외|안\s*먹|안\s*마|대신|어제.*오늘|과음|숙취|해장|속\s*쓰|속\s*안|기름진|느끼한|담백|가볍게|든든|부담|비싼|고급|가성비)/;

/**
 * @param {string} text
 * @returns {{ run: boolean, reason: string, confidence: number, intent: string }}
 */
export function shouldRunFrontLlm(text) {
  try {
    const raw = String(text || '').trim();
    const clean = cleanTextString(raw);

    // 1. 제외/대비/복합 뉘앙스가 감지되면 무조건 Front LLM 가동 (진짜 지능 발휘)
    if (COMPLEX_TRIGGER_REGEX.test(raw)) {
      return { run: true, reason: 'complex_semantic', confidence: 0.9, intent: 'RECOMMEND' };
    }

    // 2. 문장이 길고(14자 이상) 연결 어미(~는데, ~해서 등)가 있는 다중 조건 발화
    const hasClauses = /(?:는데|해서|지만|하고|거나)(?:\s|$|,|\.)/.test(raw) || raw.includes(',');
    if (raw.length >= 14 && hasClauses) {
      return { run: true, reason: 'multi_clause_context', confidence: 0.85, intent: 'RECOMMEND' };
    }

    const frame = ruleNlu(raw, clean);
    const intent = frame?.intent || 'UNKNOWN';
    const conf = Number(frame?.confidence) || 0;
    const hasHints =
      (frame?.slots?.alcoholHints || []).length > 0 || (frame?.slots?.snackHints || []).length > 0;

    // 3. 단순 일상 인사, 감사, 작별, 단순 리롤은 룰로 0.01초 만에 스킵
    if (['GREETING', 'THANKS', 'GOODBYE', 'REROLL', 'DENY', 'AFFIRM', 'COMPLAINT', 'MOOD'].includes(intent) && conf >= 0.6) {
      return { run: false, reason: 'clear_social', confidence: conf, intent };
    }
    if (intent === 'OFFTOPIC' && conf >= 0.65) {
      return { run: false, reason: 'clear_offtopic', confidence: conf, intent };
    }
    if (intent === 'PLACE' && conf >= 0.75) {
      return { run: false, reason: 'clear_place', confidence: conf, intent };
    }
    if (intent === 'GUIDE' && conf >= 0.75) {
      return { run: false, reason: 'clear_guide', confidence: conf, intent };
    }
    // 단순 직관적 주류/안주 요청 ("소주 안주", "치킨엔 맥주" 등)
    if (intent === 'RECOMMEND' && conf >= 0.8 && hasHints && raw.length < 14) {
      return { run: false, reason: 'clear_simple_recommend', confidence: conf, intent };
    }
    if (intent === 'UNKNOWN' || intent === 'CLARIFY' || conf < 0.6) {
      return { run: true, reason: 'ambiguous', confidence: conf, intent };
    }
    if (intent === 'SMALLTALK' || intent === 'QUESTION') {
      return { run: true, reason: 'open_ended', confidence: conf, intent };
    }

    return { run: conf < 0.75, reason: conf < 0.75 ? 'mid_confidence' : 'confident', confidence: conf, intent };
  } catch {
    return { run: true, reason: 'gate_error', confidence: 0, intent: 'UNKNOWN' };
  }
}
