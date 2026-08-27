import { getMbtiTrait, normalizeMbti } from '../../data/mbtiTraits.js';
import { toDrinkFamily } from '../../data/drinkFamilies.js';

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
  acceptCount: 0,
  rejectCount: 0,
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

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

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
    // 영구 학습 목록 merge (MY ∪ session)
    favoriteAlcohols: uniq([...(my.favoriteAlcohols || []), ...(userProfile.favoriteAlcohols || [])]),
    favoriteFoods: uniq([...(my.favoriteFoods || []), ...(userProfile.favoriteFoods || [])]),
    favoriteGames: uniq([...(my.favoriteGames || []), ...(userProfile.favoriteGames || [])]),
    dislikedAlcohols: uniq([...(my.dislikedAlcohols || []), ...(userProfile.dislikedAlcohols || [])]),
    acceptCount: Number(my.acceptCount) || userProfile.acceptCount || 0,
    rejectCount: Number(my.rejectCount) || userProfile.rejectCount || 0,
  };

  const trait = getMbtiTrait(userProfile.mbti);
  userProfile.mbtiTrait = trait;

  if (userProfile.tolerance && TOLERANCE_ABV[userProfile.tolerance]) {
    userProfile.preferredAbv = TOLERANCE_ABV[userProfile.tolerance];
  } else if (trait?.abv && trait.abv !== 'any') {
    userProfile.preferredAbv = trait.abv;
  }

  if (trait?.moods?.length) {
    userProfile.favoriteMood = [...new Set([...(userProfile.favoriteMood || []), ...trait.moods])];
  }

  recomputeRates();
  return userProfile;
}

function recomputeRates() {
  const a = userProfile.acceptCount || 0;
  const r = userProfile.rejectCount || 0;
  const n = a + r;
  if (n <= 0) {
    userProfile.acceptanceRate = 1;
    userProfile.rejectionRate = 0;
    return;
  }
  userProfile.acceptanceRate = a / n;
  userProfile.rejectionRate = r / n;
}

/** localStorage MY에 다시 쓸 학습 패치 */
export function getLearnedProfilePatch() {
  return {
    favoriteAlcohols: [...(userProfile.favoriteAlcohols || [])],
    favoriteFoods: [...(userProfile.favoriteFoods || [])],
    favoriteGames: [...(userProfile.favoriteGames || [])],
    dislikedAlcohols: [...(userProfile.dislikedAlcohols || [])],
    acceptCount: userProfile.acceptCount || 0,
    rejectCount: userProfile.rejectCount || 0,
    acceptanceRate: userProfile.acceptanceRate,
    rejectionRate: userProfile.rejectionRate,
    // 대화로 주종 힌트가 쌓였고 MY 주종이 비어 있으면 제안
    favoriteDrink: userProfile.favoriteDrink || '',
    favoriteSnack: userProfile.favoriteSnack || '',
  };
}

export function updateProfile(text, alcohols, snacks, games) {
  const t = text.toLowerCase();
  let changed = false;

  if (t.includes('좋아') || t.includes('최애') || t.includes('사랑해') || t.includes('자주')) {
    for (const alc of alcohols) {
      if (t.includes(alc.name_ko) || t.includes(alc.category)) {
        if (!userProfile.favoriteAlcohols.includes(alc.id)) {
          userProfile.favoriteAlcohols.push(alc.id);
          changed = true;
        }
        // MY 주종 비어 있으면 카테고리로 soft fill
        if (!userProfile.favoriteDrink && alc.category) {
          const fam = toDrinkFamily(alc.category);
          const map = {
            soju: '소주',
            beer: '맥주',
            wine: '와인',
            makgeolli: '막걸리',
            highball: '하이볼',
            whiskey: '위스키',
            nonalc: '논알콜',
          };
          if (fam && map[fam]) userProfile.favoriteDrink = map[fam];
        }
      }
    }
    for (const snk of snacks) {
      if (t.includes(snk.name_ko) || t.includes(snk.category)) {
        if (!userProfile.favoriteFoods.includes(snk.id)) {
          userProfile.favoriteFoods.push(snk.id);
          changed = true;
        }
      }
    }
    for (const g of games) {
      if (t.includes(g.name)) {
        if (!userProfile.favoriteGames.includes(g.id)) {
          userProfile.favoriteGames.push(g.id);
          changed = true;
        }
      }
    }
    if (t.includes('매운') && !userProfile.favoriteFoods.includes('spicy')) {
      userProfile.favoriteFoods.push('spicy');
      changed = true;
    }
  }

  if (t.includes('싫어') || t.includes('극혐') || t.includes('별로') || t.includes('안먹')) {
    for (const alc of alcohols) {
      if (t.includes(alc.name_ko) || t.includes(alc.category)) {
        if (!userProfile.dislikedAlcohols.includes(alc.id)) {
          userProfile.dislikedAlcohols.push(alc.id);
          changed = true;
        }
        userProfile.favoriteAlcohols = userProfile.favoriteAlcohols.filter((id) => id !== alc.id);
      }
    }
  }

  return changed;
}

/** 추천 수락(AFFIRM) — 직전 조합을 좋아요에 반영 */
export function acceptRecommendation(rec) {
  if (!rec) return;
  if (rec.bestAlc?.id && !userProfile.favoriteAlcohols.includes(rec.bestAlc.id)) {
    userProfile.favoriteAlcohols.push(rec.bestAlc.id);
  }
  if (rec.bestSnack?.id && !userProfile.favoriteFoods.includes(rec.bestSnack.id)) {
    userProfile.favoriteFoods.push(rec.bestSnack.id);
  }
  if (rec.bestAlc?.category && !userProfile.favoriteDrink) {
    const fam = toDrinkFamily(rec.bestAlc.category);
    const map = {
      soju: '소주',
      beer: '맥주',
      wine: '와인',
      makgeolli: '막걸리',
      highball: '하이볼',
      whiskey: '위스키',
      nonalc: '논알콜',
    };
    if (fam && map[fam]) userProfile.favoriteDrink = map[fam];
  }
  userProfile.acceptCount = (userProfile.acceptCount || 0) + 1;
  recomputeRates();
}

/** 추천 거절(REROLL) — soft dislike + 카운트 */
export function rejectRecommendation(rec) {
  if (!rec) return;
  if (rec.bestAlc?.id && !userProfile.dislikedAlcohols.includes(rec.bestAlc.id)) {
    // soft: 즉시 영구 혐오 대신 목록에만 (점수 엔진이 제외)
    userProfile.dislikedAlcohols.push(rec.bestAlc.id);
    userProfile.favoriteAlcohols = userProfile.favoriteAlcohols.filter((id) => id !== rec.bestAlc.id);
  }
  userProfile.rejectCount = (userProfile.rejectCount || 0) + 1;
  recomputeRates();
}
