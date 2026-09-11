/**
 * 온디바이스 NLG 가드: rewrite가 술/안주 고유명사를 바꾸면 폐기.
 */

export function namesFromFacts(facts) {
  const names = [];
  if (facts?.alcohol?.name_ko) names.push(facts.alcohol.name_ko);
  if (facts?.snack?.name_ko) names.push(facts.snack.name_ko);
  if (facts?.game?.name) names.push(facts.game.name);
  return names.filter(Boolean);
}

/**
 * rewrite 결과에 facts 고유명사가 모두 포함되는지 확인 (짧은 이름은 완화).
 */
export function rewriteKeepsNames(rewritten, facts) {
  const text = String(rewritten || '');
  const names = namesFromFacts(facts);
  if (!names.length) return true;
  return names.every((name) => {
    if (name.length <= 1) return true;
    return text.includes(name);
  });
}

/**
 * 추천 카드가 있는데 BACK이 "따뜻/시원?" 같은 soft-ask만 하면 폐기.
 * (온디바이스 Prompt가 확정 추천을 질문으로 바꿔 쓰는 경우 방지)
 */
export function backAnswerLooksLikeSoftAsk(answer, facts) {
  const text = String(answer || '').trim();
  if (!text) return true;
  const names = namesFromFacts(facts);
  if (!names.length) return false;
  const mentionsName = names.some((n) => n.length > 1 && text.includes(n));
  if (mentionsName) return false;
  return /(추천\s*할까|어때요|어떠세요|할까요|볼까요|따뜻한\s*거|시원한\s*거|어느\s*쪽|뭐가\s*당기)/.test(
    text
  );
}

/**
 * 다듬기 결과가 원본 템플릿의 가독성(단락/줄바꿈)을 심각하게 훼손하지 않았는지 검증.
 * 원본이 2개 이상의 단락으로 나뉘어 있는데 다듬은 결과가 1줄로 납작하게 뭉개졌다면 가독성 퇴보로 판단하여 폐기합니다.
 */
export function rewritePreservesStructure(original, rewritten) {
  if (!original || !rewritten) return true;
  const origParagraphs = String(original).split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const newParagraphs = String(rewritten).split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (origParagraphs.length >= 2 && newParagraphs.length <= 1) {
    return false;
  }
  return true;
}

/**
 * 템플릿 전처리: 이모지와 줄바꿈(\n)은 온전히 보존하고 가로 연속 공백만 정리합니다.
 */
export function prepareTemplateForRewrite(templateAnswer) {
  return String(templateAnswer || '')
    .replace(/[^\S\r\n]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
