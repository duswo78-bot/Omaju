import guideTemplates from '../templates/guide.json';
import { composeGuideAnswer } from '../utils/composeGuide.js';

export function handleGuide(text, context) {
  const hint = context.frame?.guideHint || 'general';
  const pool = guideTemplates[hint] || guideTemplates.general;
  let answer = composeGuideAnswer(pool);

  if (context.frame?.matchedOpening) {
    answer = `${context.frame.matchedOpening}\n\n${answer}`;
  } else if (context.profile?.name) {
    answer = `${context.profile.name}님, ${answer}`;
  }

  const trait = context.profile?.mbtiTrait;
  if (trait?.tip && Math.random() > 0.55) {
    const code = trait.code || context.profile?.mbti || '';
    answer += `\n\n(${code}${trait.label ? ` · ${trait.label}` : ''}: ${trait.tip})`;
  }

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
