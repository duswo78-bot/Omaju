import { handleClarify } from './clarify.js';
import { handleCapabilityGuide } from './capabilityGuide.js';
import { handleWittyChitchat } from './wittyChitchat.js';

/**
 * 3단계 폴백 계층 (Fallback Hierarchy)
 * 1단계: intent/slot이 애매하면 → handleClarify ("혹시 이런 말씀이신가요?")
 * 2단계: 아예 매칭이 안 되거나 도메인 범위 질문이면 → handleCapabilityGuide ("이런 것들을 도와드릴 수 있어요")
 * 3단계: 엉뚱한 잡담/세상만사 질문이면 → handleWittyChitchat (스몰토크로 재치 있게 받아넘기기)
 */
export function handleUnknown(text, context) {
  const frame = context?.frame;
  const domainScore = frame?.domainScore ?? 0;
  const hasPartialSignal =
    (frame?.slots?.alcoholHints || []).length > 0 ||
    (frame?.slots?.snackHints || []).length > 0 ||
    (frame?.slots?.moods || []).length > 0 ||
    frame?.guideHint;

  // 1단계: partial signal이나 후보가 있으면 Clarify
  if (hasPartialSignal && frame?.guideHint !== 'general') {
    return handleClarify(text, context);
  }

  // 2단계: 명시적 도움말/사용법/기능 요청일 때만 Capability Guide 제공
  if (/도움말|사용법|기능|뭘\s*할수|뭐할수|할수있는게|가이드|메뉴판/.test(text)) {
    return handleCapabilityGuide(text, context);
  }

  // 3단계: 그 외 모든 일상 발화 / 모호한 질문은 바텐더의 Witty Chit-chat으로 따뜻하게 수용
  return handleWittyChitchat(text, context);
}
