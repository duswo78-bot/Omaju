import { pickRandom } from '../utils/random.js';
import complaintTemplates from '../templates/complaint.json';

export function handleComplaint(text, context) {
  let answer = pickRandom(complaintTemplates);
  if (context.profile?.name && Math.random() > 0.45) {
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
