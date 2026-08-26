import { pickRandom } from '../utils/random.js';
import offtopicTemplates from '../templates/offtopic.json';
import guideTemplates from '../templates/guide.json';

export function handleOfftopic(text, context) {
  let answer = pickRandom(offtopicTemplates);
  // 한 번 더 부드럽게 유도 붙이기
  if (Math.random() > 0.4) {
    answer += `\n\n${pickRandom(guideTemplates.redirect || guideTemplates.general)}`;
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
