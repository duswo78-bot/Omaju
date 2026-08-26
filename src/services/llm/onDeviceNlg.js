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

export function prepareTemplateForRewrite(templateAnswer) {
  return stripEmoji(templateAnswer);
}
