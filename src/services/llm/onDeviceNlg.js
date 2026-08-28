/**
 * 온디바이스 NLG 가드: rewrite가 술/안주 고유명사를 바꾸면 폐기.
 */

function stripEmoji(text) {
  return String(text || '')
    .replace(/\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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

export function prepareTemplateForRewrite(templateAnswer) {
  return stripEmoji(templateAnswer);
}
