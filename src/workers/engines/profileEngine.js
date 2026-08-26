import { getMbtiTrait, normalizeMbti } from '../../data/mbtiTraits.js';

let userProfile = {
  // MY UI 필드
  name: '',
  gender: '',
  mbti: '',
  favoriteDrink: '',
  favoriteSnack: '',
  tolerance: '',
  // 학습/점수용
  favoriteAlcohols: [],
  favoriteFoods: [],
  favoriteGames: [],
  dislikedAlcohols: [],
  favoriteMood: [],
  monthlyBudget: 0,
  acceptanceRate: 1.0,
  rejectionRate: 0.0,
  recentHistory: [],
  preferredAbv: null, // 'low'|'mid'|'high'|null
  mbtiTrait: null,
};

const TOLERANCE_ABV = {
  알쓰: 'low',
  가볍게: 'low',
  보통: 'mid',
  잘마심: 'mid',
  술고래: 'high',
};

export function getProfile() {
  return userProfile;
}

/**
 * MY(localStorage) 프로필을 Worker 추천 프로필에 동기화
 */
export function syncMyProfile(my) {
  if (!my || typeof my !== 'object') return userProfile;

  userProfile = {
    ...userProfile,
    name: my.name || userProfile.name || '',
    gender: my.gender || userProfile.gender || '',
    mbti: normalizeMbti(my.mbti) || userProfile.mbti || '',
    favoriteDrink: my.favoriteDrink || userProfile.favoriteDrink || '',
    favoriteSnack: my.favoriteSnack || userProfile.favoriteSnack || '',
    tolerance: my.tolerance || userProfile.tolerance || '',
  };

  const trait = getMbtiTrait(userProfile.mbti);
  userProfile.mbtiTrait = trait;

  // 주량 → 선호 도수
  if (userProfile.tolerance && TOLERANCE_ABV[userProfile.tolerance]) {
    userProfile.preferredAbv = TOLERANCE_ABV[userProfile.tolerance];
  } else if (trait?.abv && trait.abv !== 'any') {
    userProfile.preferredAbv = trait.abv;
  }

  // MBTI moods를 favoriteMood에 soft merge
  if (trait?.moods?.length) {
    userProfile.favoriteMood = [...new Set([...(userProfile.favoriteMood || []), ...trait.moods])];
  }

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
