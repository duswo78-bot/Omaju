import { pickRandom } from '../utils/random.js';
import offtopicTemplates from '../templates/offtopic.json';
import guideTemplates from '../templates/guide.json';
import { composeGuideAnswer } from '../utils/composeGuide.js';

export function handleOfftopic(text, context) {
  let answer = pickRandom(offtopicTemplates);
  if (Math.random() > 0.35) {
    answer += `\n\n${composeGuideAnswer(guideTemplates.redirect || guideTemplates.general)}`;
  }
  if (context.profile?.name && Math.random() > 0.5) {
    answer = `${context.profile.name}님, ${answer}`;
  }
  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
