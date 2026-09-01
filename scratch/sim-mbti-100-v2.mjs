/**
 * Round-2 simulation: 완전히 다른 100케이스.
 * Round-1과 다른 축: 대화 토큰, 날씨, 명시 mood, 학습 좋아요/싫어요,
 * 주량 vs MBTI 충돌, 부분 프로필, 안주-only 신호 등.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MBTI_TRAITS, getMbtiTrait, normalizeMbti } from '../src/data/mbtiTraits.js';
import { calculateScore } from '../src/workers/engines/scoreEngine.js';
import {
  itemMatchesDrinkPreference,
  itemMatchesSnackPreference,
  resolveExcludes,
  isExcludedItem,
  toDrinkFamily,
  pickFallbackFamilies,
  itemDrinkFamily,
} from '../src/data/drinkFamilies.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const alcohols = JSON.parse(readFileSync(join(root, 'src/data/alcohols.json'), 'utf8'));
const snacks = JSON.parse(readFileSync(join(root, 'src/data/snacks.json'), 'utf8'));

const TOLERANCE_ABV = {
  알쓰: 'low',
  가볍게: 'low',
  보통: 'mid',
  잘마심: 'mid',
  술고래: 'high',
};

const MBTIS = Object.keys(MBTI_TRAITS);
const DRINKS = ['소주', '맥주', '와인', '막걸리', '하이볼', '위스키', '논알콜'];
const SNACKS = ['국물류', '볶음/구이', '튀김/전', '해산물', '마른안주', '과일/디저트'];
const TOLERANCES = ['알쓰', '가볍게', '보통', '잘마심', '술고래'];
const MOODS = ['friends', 'romantic', 'celebrate', 'comfort', 'refresh', 'honsul', 'sad', 'happy', 'special'];
const WEATHERS = ['rain', 'hot', 'cold', 'snow', 'any'];

/** deterministic PRNG (mulberry32) — seed ≠ round1 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260826);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rnd() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};

function buildProfile(my) {
  const mbti = normalizeMbti(my.mbti) || '';
  const trait = getMbtiTrait(mbti);
  let preferredAbv = null;
  if (my.tolerance && TOLERANCE_ABV[my.tolerance]) preferredAbv = TOLERANCE_ABV[my.tolerance];
  else if (trait?.abv && trait.abv !== 'any') preferredAbv = trait.abv;

  return {
    name: my.name || '테스터',
    mbti,
    favoriteDrink: my.favoriteDrink || '',
    favoriteSnack: my.favoriteSnack || '',
    tolerance: my.tolerance || '',
    preferredAbv,
    mbtiTrait: trait,
    favoriteAlcohols: my.favoriteAlcohols || [],
    favoriteFoods: my.favoriteFoods || [],
    dislikedAlcohols: my.dislikedAlcohols || [],
    favoriteMood: trait?.moods || [],
  };
}

function drinkMatchesBias(item, biasList) {
  return itemMatchesDrinkPreference(item, biasList);
}

function snackMatchesBias(item, biasList) {
  return itemMatchesSnackPreference(item, biasList);
}

function collectExcludeTokens(tokens = []) {
  const neg = new Set(['싫어', '별로', '말고', '먹었', '빼고', '제외']);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (neg.has(next)) out.push(t);
    if (neg.has(t) && tokens[i - 1]) out.push(tokens[i - 1]);
  }
  return [...new Set(out)];
}

function abvFits(item, preferredAbv) {
  if (!preferredAbv || typeof item.abv !== 'number') return null;
  const abv = item.abv;
  if (preferredAbv === 'low') return abv <= 12;
  if (preferredAbv === 'mid') return abv > 3 && abv < 25;
  if (preferredAbv === 'high') return abv >= 12;
  return null;
}

function rankAll(profile, { moods = [], weather = [], userTokens = [], contextTokens = [] } = {}) {
  const ctx = { moods, weather };
  const hasNeg = userTokens.some((t) => ['싫어', '별로', '말고', '먹었'].includes(t));
  const excl = resolveExcludes(collectExcludeTokens(userTokens));

  const explicitFamilies = [];
  for (const t of userTokens) {
    const fam = toDrinkFamily(t);
    if (fam && fam !== 'other' && !excl.families.includes(fam) && !explicitFamilies.includes(fam)) {
      explicitFamilies.push(fam);
    }
  }
  const favFam = toDrinkFamily(profile.favoriteDrink);
  if (favFam && !excl.families.includes(favFam) && !explicitFamilies.includes(favFam)) {
    explicitFamilies.push(favFam);
  }

  const positiveAlts = explicitFamilies.filter((f) => !excl.families.includes(f));
  const negationOnly = hasNeg && excl.families.length > 0 && positiveAlts.length === 0;
  const fallbackFamilies = negationOnly
    ? pickFallbackFamilies(excl.families, {
        favoriteDrink: profile.favoriteDrink,
        mbtiDrinkBias: profile.mbtiTrait?.drinkBias || [],
      })
    : [];

  const opts = {
    excludedFamilies: excl.families,
    excludedNeedles: excl.needles,
    excludedIds: [...(profile.dislikedAlcohols || [])],
    hasStrongSignal:
      Boolean(profile.favoriteDrink) ||
      Boolean(profile.preferredAbv) ||
      userTokens.length > 0 ||
      moods.length > 0 ||
      fallbackFamilies.length > 0,
    explicitFamilies,
    fallbackFamilies,
  };

  const alcRanked = alcohols
    .filter(
      (item) =>
        !isExcludedItem(item, {
          families: opts.excludedFamilies,
          needles: opts.excludedNeedles,
          ids: opts.excludedIds,
        })
    )
    .map((item) => ({
      item,
      score: calculateScore(0, item, userTokens, contextTokens, ctx, profile, hasNeg, false, [], opts)
        .score,
    }))
    .sort((a, b) => b.score - a.score);
  const snkRanked = snacks
    .map((item) => ({
      item,
      score: calculateScore(0, item, userTokens, contextTokens, ctx, profile, hasNeg, true, [], opts)
        .score,
    }))
    .sort((a, b) => b.score - a.score);
  return { alcRanked, snkRanked, fallbackFamilies, explicitFamilies };
}

function evalCase(c, profile, alcTop, snkTop, moods, weather, userTokens, meta = {}) {
  const trait = profile.mbtiTrait;
  const topAlc = alcTop[0]?.item;
  const topSnk = snkTop[0]?.item;
  const top3Alc = alcTop.slice(0, 3).map((x) => x.item);
  const top5Snk = snkTop.slice(0, 5).map((x) => x.item);
  const { fallbackFamilies = [], excludedFamilies = [] } = meta;
  const topFam = topAlc ? itemDrinkFamily(topAlc) : null;

  const tokenDrinkHit =
    userTokens.length && topAlc
      ? userTokens.some(
          (t) =>
            t.length >= 2 &&
            !['싫어', '별로', '말고', '먹었'].includes(t) &&
            (topAlc.name_ko.includes(t) ||
              topAlc.category.includes(t) ||
              (topAlc.tags || []).some((tag) => tag.includes(t) || t.includes(tag)))
        )
      : null;

  const dislikedAvoided =
    profile.dislikedAlcohols?.length && topAlc
      ? !profile.dislikedAlcohols.includes(topAlc.id)
      : null;

  const learnedFavTop3 =
    profile.favoriteAlcohols?.length
      ? top3Alc.some((a) => profile.favoriteAlcohols.includes(a.id))
      : null;

  const excludedAvoidedTop1 = excludedFamilies.length
    ? !excludedFamilies.includes(topFam)
    : null;

  const fallbackHitTop1 =
    fallbackFamilies.length && topFam ? fallbackFamilies.includes(topFam) : null;

  const alcScores = alcTop.map((x) => x.score);
  const median = alcScores[Math.floor(alcScores.length / 2)];

  return {
    id: c.id,
    scenario: c.scenario,
    mbti: profile.mbti || '(none)',
    favoriteDrink: profile.favoriteDrink || '-',
    favoriteSnack: profile.favoriteSnack || '-',
    tolerance: profile.tolerance || '-',
    preferredAbv: profile.preferredAbv || '-',
    moods: moods.join(',') || '-',
    weather: weather.join(',') || '-',
    tokens: userTokens.join(' ') || '-',
    topAlc: `${topAlc?.name_ko}(${topAlc?.category}/${topAlc?.abv}%)`,
    topSnk: `${topSnk?.name_ko}(${topSnk?.category})`,
    topAlcScore: +(alcTop[0]?.score || 0).toFixed(3),
    separation: +((alcTop[0]?.score || 0) - median).toFixed(3),
    drinkBiasTop1: trait ? drinkMatchesBias(topAlc, trait.drinkBias) : null,
    drinkBiasTop3: trait ? top3Alc.some((a) => drinkMatchesBias(a, trait.drinkBias)) : null,
    snackBiasTop1: trait ? snackMatchesBias(topSnk, trait.snackBias) : null,
    snackBiasTop5: trait ? top5Snk.some((s) => snackMatchesBias(s, trait.snackBias)) : null,
    favDrinkTop1: profile.favoriteDrink
      ? drinkMatchesBias(topAlc, [profile.favoriteDrink])
      : null,
    favDrinkTop3: profile.favoriteDrink
      ? top3Alc.some((a) => drinkMatchesBias(a, [profile.favoriteDrink]))
      : null,
    favSnackTop5: profile.favoriteSnack
      ? top5Snk.some((s) => snackMatchesBias(s, [profile.favoriteSnack]))
      : null,
    abvTop1: abvFits(topAlc, profile.preferredAbv),
    moodTop1:
      moods.length && topAlc?.moods
        ? moods.some((m) => topAlc.moods.some((im) => im.includes(m) || m.includes(im)))
        : null,
    weatherTop1:
      weather.length && topAlc?.weather
        ? weather.some((w) => topAlc.weather.some((iw) => iw.includes(w) || w.includes(iw)))
        : null,
    tokenDrinkHit,
    dislikedAvoided,
    learnedFavTop3,
    excludedAvoidedTop1,
    fallbackHitTop1,
  };
}

function makeCasesV2() {
  const cases = [];
  let id = 0;
  const push = (scenario, fields) => {
    cases.push({ id: ++id, scenario, ...fields });
  };

  // 1) 대화 키워드 주도 (MBTI 없음) — 20
  const talkScripts = [
    { tokens: ['소주', '짠'], expect: '소주' },
    { tokens: ['맥주', '시원'], expect: '맥주' },
    { tokens: ['와인', '분위기'], expect: '와인' },
    { tokens: ['하이볼', '달달'], expect: '하이볼' },
    { tokens: ['위스키', '한잔'], expect: '위스키' },
    { tokens: ['막걸리', '비'], expect: '막걸리' },
    { tokens: ['청하', '깔끔'], expect: '전통주' },
    { tokens: ['치킨', '맥주'], expect: '맥주' },
    { tokens: ['회', '소주'], expect: '소주' },
    { tokens: ['데이트', '와인'], expect: '와인' },
    { tokens: ['혼자', '하이볼'], expect: '하이볼' },
    { tokens: ['회식', '소주'], expect: '소주' },
    { tokens: ['칵테일', '달콤'], expect: '하이볼' },
    { tokens: ['진로', '소주'], expect: '소주' },
    { tokens: ['기네스', '맥주'], expect: '맥주' },
    { tokens: ['스파클링', '와인'], expect: '와인' },
    { tokens: ['피치', '하이볼'], expect: '하이볼' },
    { tokens: ['보드카', '토닉'], expect: '보드카' },
    { tokens: ['복분자', '달콤'], expect: '과실주' },
    { tokens: ['화요', '소주'], expect: '소주' },
  ];
  for (const t of talkScripts) {
    push('talk_tokens', {
      my: { mbti: '', favoriteDrink: '', favoriteSnack: '', tolerance: '' },
      userTokens: t.tokens,
      moods: [],
      weather: [],
      note: t.expect,
    });
  }

  // 2) 날씨 + 명시 mood (MBTI 랜덤) — 16
  for (let i = 0; i < 16; i++) {
    push('weather_mood', {
      my: {
        mbti: MBTIS[i % 16],
        favoriteDrink: '',
        favoriteSnack: '',
        tolerance: pick(['', '보통', '가볍게']),
      },
      userTokens: [],
      moods: [MOODS[i % MOODS.length]],
      weather: [WEATHERS[i % WEATHERS.length]],
    });
  }

  // 3) 주량 vs MBTI abv 충돌 — 16 (모든 MBTI × 반대 주량)
  for (const mbti of MBTIS) {
    const traitAbv = MBTI_TRAITS[mbti].abv;
    const tol =
      traitAbv === 'high' ? '알쓰' : traitAbv === 'low' ? '술고래' : pick(['알쓰', '술고래']);
    push('tolerance_vs_mbti', {
      my: { mbti, favoriteDrink: '', favoriteSnack: '', tolerance: tol },
      userTokens: [],
      moods: [],
      weather: [],
    });
  }

  // 4) 학습 좋아요 + 기피 — 12
  for (let i = 0; i < 12; i++) {
    const liked = pick(alcohols);
    const hated = pick(alcohols.filter((a) => a.id !== liked.id));
    push('learned_like_dislike', {
      my: {
        mbti: pick(MBTIS),
        favoriteDrink: pick(DRINKS),
        favoriteSnack: pick(SNACKS),
        tolerance: pick(TOLERANCES),
        favoriteAlcohols: [liked.id],
        dislikedAlcohols: [hated.id],
      },
      userTokens: [],
      moods: rnd() > 0.5 ? [pick(MOODS)] : [],
      weather: [],
      note: `like=${liked.name_ko},hate=${hated.name_ko}`,
    });
  }

  // 5) 부정 토큰 ("싫어/말고") — 8
  const negPairs = [
    ['소주', '싫어'],
    ['맥주', '별로'],
    ['와인', '말고'],
    ['위스키', '싫어'],
    ['하이볼', '말고'],
    ['막걸리', '별로'],
    ['소주', '먹었'],
    ['맥주', '말고', '와인'],
  ];
  for (const tokens of negPairs) {
    push('negative_tokens', {
      my: {
        mbti: pick(MBTIS),
        favoriteDrink: '',
        favoriteSnack: pick(SNACKS),
        tolerance: '보통',
      },
      userTokens: tokens,
      moods: [],
      weather: [],
    });
  }

  // 6) 부분 프로필 (이름만 / 안주만 / 주종만 / 주량만) — 12
  const partials = [
    { mbti: '', favoriteDrink: '', favoriteSnack: '', tolerance: '' },
    { mbti: '', favoriteDrink: '맥주', favoriteSnack: '', tolerance: '' },
    { mbti: '', favoriteDrink: '', favoriteSnack: '해산물', tolerance: '' },
    { mbti: '', favoriteDrink: '', favoriteSnack: '', tolerance: '알쓰' },
    { mbti: 'ENTP', favoriteDrink: '', favoriteSnack: '', tolerance: '' },
    { mbti: '', favoriteDrink: '위스키', favoriteSnack: '마른안주', tolerance: '' },
    { mbti: 'ISFJ', favoriteDrink: '', favoriteSnack: '국물류', tolerance: '' },
    { mbti: '', favoriteDrink: '하이볼', favoriteSnack: '', tolerance: '술고래' },
    { mbti: 'INTJ', favoriteDrink: '와인', favoriteSnack: '', tolerance: '알쓰' },
    { mbti: 'ESFP', favoriteDrink: '', favoriteSnack: '튀김/전', tolerance: '잘마심' },
    { mbti: '', favoriteDrink: '논알콜', favoriteSnack: '과일/디저트', tolerance: '알쓰' },
    { mbti: 'ESTJ', favoriteDrink: '소주', favoriteSnack: '볶음/구이', tolerance: '' },
  ];
  for (const my of partials) {
    push('partial_profile', {
      my,
      userTokens: [],
      moods: my.mbti ? [] : [pick(['friends', 'comfort'])],
      weather: [],
    });
  }

  // 7) 토큰 + MBTI + MY 동시 (현실 대화) — 16
  const realistic = [
    { mbti: 'INFP', drink: '와인', snack: '과일/디저트', tol: '가볍게', tokens: ['감성', '와인'], moods: ['romantic'] },
    { mbti: 'ESTP', drink: '소주', snack: '튀김/전', tol: '술고래', tokens: ['회식', '텐션'], moods: ['celebrate'] },
    { mbti: 'INFJ', drink: '하이볼', snack: '해산물', tol: '알쓰', tokens: ['조용', '비'], moods: ['honsul'], weather: ['rain'] },
    { mbti: 'ENTJ', drink: '위스키', snack: '해산물', tol: '잘마심', tokens: ['위스키'], moods: ['special'] },
    { mbti: 'ESFJ', drink: '막걸리', snack: '국물류', tol: '보통', tokens: ['막걸리', '전'], moods: ['friends'], weather: ['cold'] },
    { mbti: 'ISTP', drink: '맥주', snack: '마른안주', tol: '보통', tokens: ['맥주', '간단'], moods: ['refresh'] },
    { mbti: 'ENFP', drink: '하이볼', snack: '과일/디저트', tol: '보통', tokens: ['새로운', '달달'], moods: ['happy'] },
    { mbti: 'ISTJ', drink: '소주', snack: '볶음/구이', tol: '잘마심', tokens: ['소주', '삼겹'], moods: ['friends'] },
    { mbti: 'ISFP', drink: '와인', snack: '과일/디저트', tol: '가볍게', tokens: ['분위기'], moods: ['romantic'] },
    { mbti: 'ENTP', drink: '하이볼', snack: '튀김/전', tol: '보통', tokens: ['게임', '하이볼'], moods: ['friends'] },
    { mbti: 'ENFJ', drink: '맥주', snack: '해산물', tol: '가볍게', tokens: ['같이', '회'], moods: ['friends'] },
    { mbti: 'INTP', drink: '위스키', snack: '마른안주', tol: '보통', tokens: ['위스키', '실험'], moods: ['special'] },
    { mbti: 'ESFP', drink: '맥주', snack: '튀김/전', tol: '잘마심', tokens: ['파티', '치킨'], moods: ['celebrate'] },
    { mbti: 'INTJ', drink: '와인', snack: '해산물', tol: '보통', tokens: ['퀄리티', '와인'], moods: ['special'] },
    { mbti: 'ISFJ', drink: '막걸리', snack: '국물류', tol: '가볍게', tokens: ['따뜻한', '국물'], moods: ['comfort'], weather: ['cold'] },
    { mbti: 'ESTJ', drink: '소주', snack: '볶음/구이', tol: '술고래', tokens: ['회식', '소주'], moods: ['celebrate'] },
  ];
  for (const r of realistic) {
    push('realistic_combo', {
      my: {
        mbti: r.mbti,
        favoriteDrink: r.drink,
        favoriteSnack: r.snack,
        tolerance: r.tol,
      },
      userTokens: r.tokens,
      moods: r.moods || [],
      weather: r.weather || [],
    });
  }

  // ensure exactly 100
  if (cases.length !== 100) {
    throw new Error(`Expected 100 cases, got ${cases.length}`);
  }
  return cases.map((c, i) => ({ ...c, id: i + 1 }));
}

function rate(rows, key) {
  const applicable = rows.filter((r) => r[key] !== null && r[key] !== undefined);
  if (!applicable.length) return { n: 0, hit: 0, pct: null };
  const hit = applicable.filter((r) => r[key] === true).length;
  return { n: applicable.length, hit, pct: +((100 * hit) / applicable.length).toFixed(1) };
}

function main() {
  const cases = makeCasesV2();
  const results = [];

  for (const c of cases) {
    const profile = buildProfile(c.my);
    const moods = c.moods || [];
    const weather = c.weather || [];
    const userTokens = c.userTokens || [];
    const { alcRanked, snkRanked, fallbackFamilies } = rankAll(profile, {
      moods,
      weather,
      userTokens,
    });
    const excl = resolveExcludes(collectExcludeTokens(userTokens));
    results.push(
      evalCase(c, profile, alcRanked, snkRanked, moods, weather, userTokens, {
        fallbackFamilies,
        excludedFamilies: excl.families,
      })
    );
  }

  const scenarios = [...new Set(results.map((r) => r.scenario))];
  const summary = {
    total: results.length,
    seed: 20260826,
    round: 2,
    metrics: {
      drinkBiasTop1: rate(results, 'drinkBiasTop1'),
      drinkBiasTop3: rate(results, 'drinkBiasTop3'),
      snackBiasTop1: rate(results, 'snackBiasTop1'),
      snackBiasTop5: rate(results, 'snackBiasTop5'),
      favDrinkTop1: rate(results, 'favDrinkTop1'),
      favDrinkTop3: rate(results, 'favDrinkTop3'),
      favSnackTop5: rate(results, 'favSnackTop5'),
      abvTop1: rate(results, 'abvTop1'),
      moodTop1: rate(results, 'moodTop1'),
      weatherTop1: rate(results, 'weatherTop1'),
      tokenDrinkHit: rate(results, 'tokenDrinkHit'),
      dislikedAvoided: rate(results, 'dislikedAvoided'),
      learnedFavTop3: rate(results, 'learnedFavTop3'),
      excludedAvoidedTop1: rate(results, 'excludedAvoidedTop1'),
      fallbackHitTop1: rate(results, 'fallbackHitTop1'),
    },
    byScenario: {},
  };

  for (const s of scenarios) {
    const subset = results.filter((r) => r.scenario === s);
    summary.byScenario[s] = {
      n: subset.length,
      drinkBiasTop3: rate(subset, 'drinkBiasTop3'),
      favDrinkTop3: rate(subset, 'favDrinkTop3'),
      snackBiasTop5: rate(subset, 'snackBiasTop5'),
      favSnackTop5: rate(subset, 'favSnackTop5'),
      abvTop1: rate(subset, 'abvTop1'),
      tokenDrinkHit: rate(subset, 'tokenDrinkHit'),
      dislikedAvoided: rate(subset, 'dislikedAvoided'),
      learnedFavTop3: rate(subset, 'learnedFavTop3'),
      excludedAvoidedTop1: rate(subset, 'excludedAvoidedTop1'),
      fallbackHitTop1: rate(subset, 'fallbackHitTop1'),
      moodTop1: rate(subset, 'moodTop1'),
      weatherTop1: rate(subset, 'weatherTop1'),
      avgSeparation: +(subset.reduce((a, r) => a + r.separation, 0) / subset.length).toFixed(3),
    };
  }

  // tolerance should dominate MBTI abv when set
  const tolClash = results.filter((r) => r.scenario === 'tolerance_vs_mbti');
  summary.toleranceDominatesAbv = rate(tolClash, 'abvTop1');

  const failToken = results.filter((r) => r.tokenDrinkHit === false).slice(0, 10);
  const failFav = results.filter((r) => r.favDrinkTop3 === false).slice(0, 10);
  const failAbv = results.filter((r) => r.abvTop1 === false).slice(0, 10);
  const failLearned = results.filter((r) => r.learnedFavTop3 === false).slice(0, 8);

  const out = {
    generatedAt: new Date().toISOString(),
    catalog: { alcohols: alcohols.length, snacks: snacks.length },
    summary,
    failures: {
      tokenDrinkHit: failToken,
      favDrinkTop3: failFav,
      abvTop1: failAbv,
      learnedFavTop3: failLearned,
    },
    results,
  };

  const outPath = join(__dirname, 'sim-mbti-100-v2-results.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log('=== Round-2 MBTI/MY 100-case simulation (DIFFERENT set) ===');
  console.log(`seed=${summary.seed} cases=${results.length}`);
  console.log('\n[Overall]');
  for (const [k, v] of Object.entries(summary.metrics)) {
    if (v.pct == null) console.log(`  ${k}: n/a`);
    else console.log(`  ${k}: ${v.hit}/${v.n} = ${v.pct}%`);
  }
  console.log('\n[By scenario]');
  for (const [s, v] of Object.entries(summary.byScenario)) {
    console.log(
      `  ${s} (n=${v.n}): token=${v.tokenDrinkHit.pct ?? '-'}% favDrink3=${v.favDrinkTop3.pct ?? '-'}% drinkBias3=${v.drinkBiasTop3.pct ?? '-'}% abv=${v.abvTop1.pct ?? '-'}% fallback=${v.fallbackHitTop1.pct ?? '-'}% exclOk=${v.excludedAvoidedTop1.pct ?? '-'}% learned3=${v.learnedFavTop3.pct ?? '-'}% sep=${v.avgSeparation}`
    );
  }
  console.log(
    `\n[tolerance_vs_mbti] abv top1 fit (tolerance should win): ${summary.toleranceDominatesAbv.pct}%`
  );
  console.log(
    `[negation] excludedAvoided=${summary.metrics.excludedAvoidedTop1.pct}% fallbackHit=${summary.metrics.fallbackHitTop1.pct}%`
  );
  console.log('\n[Sample failures: token]');
  failToken.forEach((x) =>
    console.log(`  #${x.id} ${x.tokens} -> ${x.topAlc}`)
  );
  console.log('\n[Sample failures: favDrink]');
  failFav.forEach((x) =>
    console.log(`  #${x.id} ${x.scenario} ${x.mbti} fav=${x.favoriteDrink} -> ${x.topAlc}`)
  );
  console.log('\n[Sample failures: abv]');
  failAbv.forEach((x) =>
    console.log(`  #${x.id} ${x.scenario} pref=${x.preferredAbv} tol=${x.tolerance} -> ${x.topAlc}`)
  );
  console.log(`\nWrote ${outPath}`);
}

main();
