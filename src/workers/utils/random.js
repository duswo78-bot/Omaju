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

/** 최고점 근처 후보 풀에서 랜덤 선택 (항상 1등만 고르는 문제 방지) */
export function pickFromScoreBand(candidates, scoreKey = 'score', band = 0.12, minPool = 5) {
  if (!candidates?.length) return null;
  const sorted = [...candidates].sort((a, b) => (b[scoreKey] ?? 0) - (a[scoreKey] ?? 0));
  const max = sorted[0][scoreKey] ?? 0;
  let pool = sorted.filter((c) => max - (c[scoreKey] ?? 0) <= band);
  if (pool.length < minPool) pool = sorted.slice(0, Math.min(minPool, sorted.length));
  return pickRandom(pool);
}

/** 가중 비복원 샘플링: 점수 높은 항목이 더 자주 나오되 매번 목록이 달라짐 */
export function weightedSample(items, count, scoreOf = (x) => x.score ?? 0) {
  if (!items?.length || count <= 0) return [];
  const pool = items.map((item) => ({ item, weight: Math.max(0.01, Number(scoreOf(item)) || 0.01) }));
  const picked = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    idx = Math.min(idx, pool.length - 1);
    picked.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return picked;
}
