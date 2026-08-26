import { pickRandom } from '../utils/random.js';
import guideTemplates from '../templates/guide.json';

export function handleGuide(text, context) {
  const hint = context.frame?.guideHint || 'general';
  const pool = guideTemplates[hint] || guideTemplates.general;
  let answer = pickRandom(pool);

  if (context.frame?.matchedOpening) {
    answer = `${context.frame.matchedOpening}\n\n${answer}`;
  } else if (context.profile?.name) {
    answer = `${context.profile.name}님, ${answer}`;
  }

  // ASKING: 다음 짧은 긍정 → 추천으로 자연 연결
  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
