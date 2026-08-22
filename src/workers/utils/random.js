const recentPicks = new Set();
const MAX_RECENT_PICKS = 5;

export function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  if (arr.length === 1) return arr[0];

  let candidate = arr[Math.floor(Math.random() * arr.length)];
  let attempts = 0;
  
  // 요소가 긴 문자열(템플릿)이면서 최근에 선택된 적이 있다면 다시 뽑음 (최대 10번 시도)
  while (typeof candidate === 'string' && candidate.length > 20 && recentPicks.has(candidate) && attempts < 10) {
    candidate = arr[Math.floor(Math.random() * arr.length)];
    attempts++;
  }

  // 선택된 템플릿 기록 (연속 중복 방지)
  if (typeof candidate === 'string' && candidate.length > 20) {
    recentPicks.add(candidate);
    if (recentPicks.size > MAX_RECENT_PICKS) {
      const firstItem = recentPicks.values().next().value;
      recentPicks.delete(firstItem);
    }
  }

  return candidate;
}
