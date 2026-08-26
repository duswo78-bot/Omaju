import { pickRandom } from './random.js';

/**
 * openings × asks × examples 조합으로 유도 멘트 다양화.
 * @param {{ openings?: string[], asks?: string[], examples?: string[] } | string[]} pool
 */
export function composeGuideAnswer(pool) {
  if (Array.isArray(pool)) {
    return pickRandom(pool);
  }
  if (!pool || typeof pool !== 'object') return '';

  const openings = pool.openings || [];
  const asks = pool.asks || [];
  const examples = pool.examples || [];

  const parts = [];
  if (openings.length) parts.push(pickRandom(openings));
  if (asks.length) parts.push(pickRandom(asks));
  // 예시는 70% 확률로만 붙여 반복감 감소
  if (examples.length && Math.random() < 0.7) parts.push(pickRandom(examples));

  return parts.filter(Boolean).join('\n');
}
