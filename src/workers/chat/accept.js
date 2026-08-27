import { getLastRecommendation } from '../engines/memoryEngine.js';
import { acceptRecommendation } from '../engines/profileEngine.js';
import { pickRandom } from '../utils/random.js';

const ACCEPT_LINES = [
  '마음에 드셨다니 다행이에요! 다음에도 취향 맞춰 볼게요. 🥂',
  '좋은 선택이에요. 이 조합, 기억해 둘게요!',
  '오케이, 취향 노트에 남겨둘게요. 또 필요하면 불러 주세요!',
  '역시 안목이 있으시네요. 비슷한 결로 더 찾아드릴 수 있어요.',
];

/**
 * AWAITING_REC_CONFIRM 중 AFFIRM — 재추천하지 않고 수락 학습만.
 */
export function handleAccept(context) {
  const last = getLastRecommendation();
  acceptRecommendation(last);

  const name = context.profile?.name ? `${context.profile.name}님, ` : '';
  const detail =
    last?.bestAlc || last?.bestSnack
      ? ` (${[last.bestAlc?.name_ko, last.bestSnack?.name_ko].filter(Boolean).join(' + ')})`
      : '';

  return {
    answer: `${name}${pickRandom(ACCEPT_LINES)}${detail}`,
    bestAlc: last?.bestAlc || null,
    bestSnack: last?.bestSnack || null,
    bestGame: null,
    reason: '취향 학습(수락)',
    state: 'IDLE',
    accepted: true,
  };
}
