// 점수 계산 엔진
export function calculateScore(baseSim, item, userTokens, contextTokens, contextSignals, profile, hasNegativeContext, isSnack = false, SINGLE_CHAR_ALLOW = []) {
  let score = baseSim;
  let isMatched = false;
  let isContextMatched = false;

  // 1-1. User Keyword Score (강력한 가중치)
  for (const t of userTokens) {
    if (t.length < 2 && !SINGLE_CHAR_ALLOW.includes(t)) continue;
    const matchCondition = item.name_ko.includes(t) || t.includes(item.name_ko) || item.category.includes(t) || item.tags.some(tag => tag.includes(t) || t.includes(tag));
    
    if (matchCondition) {
      isMatched = true; // 유저가 직접 말한 토큰과 매칭됨
      if (hasNegativeContext) score -= 5.0;
      else score += 5.0; // 명시적 의도이므로 매우 높게 부스트
    }
  }

  // 1-2. Context Keyword Score (약한 가중치)
  for (const t of contextTokens) {
    if (t.length < 2 && !SINGLE_CHAR_ALLOW.includes(t)) continue;
    const matchCondition = item.name_ko.includes(t) || t.includes(item.name_ko) || item.category.includes(t) || item.tags.some(tag => tag.includes(t) || t.includes(tag));
    
    if (matchCondition) {
      isContextMatched = true;
      if (!hasNegativeContext) score += 1.0; // 문맥은 부스트를 약하게
    }
  }

  // 2. Mood / Weather (Context) Score
  if (contextSignals.moods && contextSignals.moods.length > 0) {
    for (const m of contextSignals.moods) {
      if (item.moods && item.moods.some(am => am.includes(m) || m.includes(am))) score += 0.5;
    }
  }
  
  if (contextSignals.weather && contextSignals.weather.length > 0) {
    for (const w of contextSignals.weather) {
      if (item.weather && item.weather.some(aw => aw.includes(w) || w.includes(aw))) score += 0.5;
    }
  }

  // 3. Profile Score
  if (!isSnack) {
    if (profile.favoriteAlcohols.includes(item.id)) score += 0.3;
    if (profile.dislikedAlcohols.includes(item.id)) score -= 0.5;
  } else {
    if (profile.favoriteFoods.includes(item.id)) score += 0.3;
    // 향후 dislikedFoods 추가 시 적용
  }

  // 향후 추가될 Hook들
  // Budget
  // let budgetScore = calculateBudgetScore(item.priceLevel, profile.monthlyBudget);
  // score += budgetScore;

  // Season
  // let seasonScore = calculateSeasonScore(item.season);
  // score += seasonScore;

  // Time
  // let timeScore = calculateTimeScore(item.time);
  // score += timeScore;

  return { score, isMatched };
}
