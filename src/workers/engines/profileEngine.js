let userProfile = {
  favoriteAlcohols: [],
  favoriteFoods: [],
  favoriteGames: [],
  dislikedAlcohols: [],
  favoriteMood: [],
  monthlyBudget: 0,
  // 향후 확장 훅 (추천 수락률, 거절률, 최근 기록, 선호 도수 등)
  acceptanceRate: 1.0,
  rejectionRate: 0.0,
  recentHistory: [],
  preferredAbv: null
};

export function getProfile() {
  return userProfile;
}

export function updateProfile(text, alcohols, snacks, games) {
  const t = text.toLowerCase();
  
  if (t.includes('좋아') || t.includes('최애') || t.includes('사랑해') || t.includes('자주')) {
    for (const alc of alcohols) {
      if (t.includes(alc.name_ko) || t.includes(alc.category)) {
        if (!userProfile.favoriteAlcohols.includes(alc.id)) userProfile.favoriteAlcohols.push(alc.id);
      }
    }
    for (const snk of snacks) {
      if (t.includes(snk.name_ko) || t.includes(snk.category)) {
        if (!userProfile.favoriteFoods.includes(snk.id)) userProfile.favoriteFoods.push(snk.id);
      }
    }
    for (const g of games) {
      if (t.includes(g.name)) {
        if (!userProfile.favoriteGames.includes(g.id)) userProfile.favoriteGames.push(g.id);
      }
    }
    if (t.includes('매운') && !userProfile.favoriteFoods.includes('spicy')) {
      userProfile.favoriteFoods.push('spicy');
    }
  }

  if (t.includes('싫어') || t.includes('극혐') || t.includes('별로') || t.includes('안먹')) {
    for (const alc of alcohols) {
      if (t.includes(alc.name_ko) || t.includes(alc.category)) {
        if (!userProfile.dislikedAlcohols.includes(alc.id)) userProfile.dislikedAlcohols.push(alc.id);
      }
    }
  }
}
