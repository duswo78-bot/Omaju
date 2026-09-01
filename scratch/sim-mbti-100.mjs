/**
 * MY + MBTI soft scoring 100-case simulation (no embeddings).
 * baseSim=0 → profile/MBTI/favorite/abv 효과만 측정.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MBTI_TRAITS, getMbtiTrait, normalizeMbti } from '../src/data/mbtiTraits.js';
import { calculateScore } from '../src/workers/engines/scoreEngine.js';

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

const DRINKS = ['소주', '맥주', '와인', '막걸리', '하이볼', '위스키', '논알콜', ''];
const SNACKS = ['국물류', '볶음/구이', '튀김/전', '해산물', '마른안주', '과일/디저트', ''];
const TOLERANCES = ['알쓰', '가볍게', '보통', '잘마심', '술고래', ''];
const MBTIS = Object.keys(MBTI_TRAITS);

const SNACK_KEY_MAP = {
  국물류: ['국물', '탕', '찌개', '전골', '라면', '우동'],
  '볶음/구이': ['볶음', '구이', '삼겹', '곱창', '고기'],
  '튀김/전': ['튀김', '전', '치킨', '까스'],
  해산물: ['회', '해산물', '새우', '오징어', '조개'],
  마른안주: ['마른', '견과', '쥐포', '안주'],
  '과일/디저트': ['과일', '디저트', '달콤', '치즈'],
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
    favoriteAlcohols: [],
    favoriteFoods: [],
    dislikedAlcohols: [],
    favoriteMood: trait?.moods || [],
  };
}

function drinkMatchesBias(item, biasList) {
  if (!biasList?.length) return false;
  return biasList.some(
    (d) =>
      item.category === d ||
      item.category?.includes(d) ||
      (item.tags || []).some((t) => t.includes(d) || d.includes(t)) ||
      item.name_ko?.includes(d)
  );
}

function snackMatchesBias(item, biasList) {
  if (!biasList?.length) return false;
  const blob = `${item.name_ko} ${item.category || ''} ${(item.tags || []).join(' ')}`;
  return biasList.some((s) => {
    const keys = SNACK_KEY_MAP[s] || [s];
    return keys.some((k) => blob.includes(k)) || item.category === s;
  });
}

function abvFits(item, preferredAbv) {
  if (!preferredAbv || typeof item.abv !== 'number') return null;
  const abv = item.abv;
  if (preferredAbv === 'low') return abv <= 12;
  if (preferredAbv === 'mid') return abv > 3 && abv < 25;
  if (preferredAbv === 'high') return abv >= 12;
  return null;
}

function rankAll(profile, moods = [], weather = []) {
  const ctx = { moods, weather };
  const alcRanked = alcohols
    .map((item) => ({
      item,
      score: calculateScore(0, item, [], [], ctx, profile, false, false).score,
    }))
    .sort((a, b) => b.score - a.score);
  const snkRanked = snacks
    .map((item) => ({
      item,
      score: calculateScore(0, item, [], [], ctx, profile, false, true).score,
    }))
    .sort((a, b) => b.score - a.score);
  return { alcRanked, snkRanked };
}

function evalCase(c, profile, alcTop, snkTop, moods) {
  const trait = profile.mbtiTrait;
  const topAlc = alcTop[0]?.item;
  const topSnk = snkTop[0]?.item;
  const top3Alc = alcTop.slice(0, 3).map((x) => x.item);
  const top5Snk = snkTop.slice(0, 5).map((x) => x.item);

  const drinkBiasTop1 = trait ? drinkMatchesBias(topAlc, trait.drinkBias) : null;
  const drinkBiasTop3 = trait ? top3Alc.some((a) => drinkMatchesBias(a, trait.drinkBias)) : null;
  const snackBiasTop1 = trait ? snackMatchesBias(topSnk, trait.snackBias) : null;
  const snackBiasTop5 = trait ? top5Snk.some((s) => snackMatchesBias(s, trait.snackBias)) : null;

  const favDrinkTop1 = profile.favoriteDrink
    ? drinkMatchesBias(topAlc, [profile.favoriteDrink])
    : null;
  const favDrinkTop3 = profile.favoriteDrink
    ? top3Alc.some((a) => drinkMatchesBias(a, [profile.favoriteDrink]))
    : null;
  const favSnackTop5 = profile.favoriteSnack
    ? top5Snk.some((s) => snackMatchesBias(s, [profile.favoriteSnack]))
    : null;

  const abvTop1 = abvFits(topAlc, profile.preferredAbv);
  const moodTop1 =
    moods.length && topAlc?.moods
      ? moods.some((m) => topAlc.moods.some((im) => im.includes(m) || m.includes(im)))
      : null;

  // "의미 있는 정렬": MBTI/취향이 있을 때 top1 score > median of catalog
  const alcScores = alcTop.map((x) => x.score);
  const median = alcScores[Math.floor(alcScores.length / 2)];
  const separation = (alcTop[0]?.score || 0) - median;

  return {
    id: c.id,
    scenario: c.scenario,
    mbti: profile.mbti || '(none)',
    favoriteDrink: profile.favoriteDrink || '-',
    favoriteSnack: profile.favoriteSnack || '-',
    tolerance: profile.tolerance || '-',
    preferredAbv: profile.preferredAbv || '-',
    moods: moods.join(',') || '-',
    topAlc: `${topAlc?.name_ko}(${topAlc?.category}/${topAlc?.abv}%)`,
    topSnk: `${topSnk?.name_ko}(${topSnk?.category})`,
    topAlcScore: +(alcTop[0]?.score || 0).toFixed(3),
    separation: +separation.toFixed(3),
    drinkBiasTop1,
    drinkBiasTop3,
    snackBiasTop1,
    snackBiasTop5,
    favDrinkTop1,
    favDrinkTop3,
    favSnackTop5,
    abvTop1,
    moodTop1,
  };
}

function makeCases() {
  const cases = [];
  let id = 0;

  // A. 16 MBTI only (no favorite) — 2 mood modes each = 32
  for (const mbti of MBTIS) {
    cases.push({
      id: ++id,
      scenario: 'mbti_only',
      my: { mbti, favoriteDrink: '', favoriteSnack: '', tolerance: '' },
      useTraitMoods: false,
    });
    cases.push({
      id: ++id,
      scenario: 'mbti_mood_seed',
      my: { mbti, favoriteDrink: '', favoriteSnack: '', tolerance: '' },
      useTraitMoods: true,
    });
  }

  // B. 16 MBTI + aligned favoriteDrink (first drinkBias) = 16
  for (const mbti of MBTIS) {
    const bias = MBTI_TRAITS[mbti].drinkBias[0];
    const fav = DRINKS.includes(bias) ? bias : bias.includes('칵테일') ? '하이볼' : bias;
    cases.push({
      id: ++id,
      scenario: 'mbti_plus_fav_aligned',
      my: {
        mbti,
        favoriteDrink: fav === '막걸리' ? '막걸리' : fav,
        favoriteSnack: MBTI_TRAITS[mbti].snackBias[0] || '',
        tolerance: '',
      },
      useTraitMoods: false,
    });
  }

  // C. 16 MBTI + conflicting favorite (opposite-ish) = 16
  const conflictMap = {
    소주: '와인',
    맥주: '위스키',
    와인: '소주',
    막걸리: '위스키',
    하이볼: '소주',
    위스키: '맥주',
    칵테일: '소주',
    전통주: '위스키',
  };
  for (const mbti of MBTIS) {
    const first = MBTI_TRAITS[mbti].drinkBias[0];
    const conflict = conflictMap[first] || '소주';
    cases.push({
      id: ++id,
      scenario: 'mbti_vs_fav_conflict',
      my: { mbti, favoriteDrink: conflict, favoriteSnack: '', tolerance: '보통' },
      useTraitMoods: false,
    });
  }

  // D. tolerance extremes × 4 MBTI samples = 12
  const sampleMbti = ['ISFJ', 'ENFP', 'ESTP', 'INTJ'];
  for (const mbti of sampleMbti) {
    for (const tol of ['알쓰', '술고래', '보통']) {
      cases.push({
        id: ++id,
        scenario: 'tolerance_abv',
        my: { mbti, favoriteDrink: '', favoriteSnack: '', tolerance: tol },
        useTraitMoods: false,
      });
    }
  }

  // E. favorite-only (no MBTI) for each drink = 7
  for (const drink of DRINKS.filter(Boolean)) {
    cases.push({
      id: ++id,
      scenario: 'fav_drink_only',
      my: { mbti: '', favoriteDrink: drink, favoriteSnack: '튀김/전', tolerance: '보통' },
      useTraitMoods: false,
    });
  }

  // F. snack-only favorites = 6
  for (const snack of SNACKS.filter(Boolean)) {
    cases.push({
      id: ++id,
      scenario: 'fav_snack_only',
      my: { mbti: '', favoriteDrink: '맥주', favoriteSnack: snack, tolerance: '' },
      useTraitMoods: false,
    });
  }

  // G. empty baseline = 1
  cases.push({
    id: ++id,
    scenario: 'empty_baseline',
    my: { mbti: '', favoriteDrink: '', favoriteSnack: '', tolerance: '' },
    useTraitMoods: false,
  });

  // H. realistic MY mixes to fill to 100
  const mixes = [
    { mbti: 'INFP', favoriteDrink: '와인', favoriteSnack: '과일/디저트', tolerance: '가볍게' },
    { mbti: 'ESTJ', favoriteDrink: '소주', favoriteSnack: '볶음/구이', tolerance: '잘마심' },
    { mbti: 'ESFP', favoriteDrink: '맥주', favoriteSnack: '튀김/전', tolerance: '보통' },
    { mbti: 'INTP', favoriteDrink: '하이볼', favoriteSnack: '마른안주', tolerance: '보통' },
    { mbti: 'ENFJ', favoriteDrink: '와인', favoriteSnack: '해산물', tolerance: '알쓰' },
    { mbti: 'ISTP', favoriteDrink: '맥주', favoriteSnack: '마른안주', tolerance: '잘마심' },
    { mbti: 'ESFJ', favoriteDrink: '막걸리', favoriteSnack: '국물류', tolerance: '보통' },
    { mbti: 'ENTJ', favoriteDrink: '위스키', favoriteSnack: '해산물', tolerance: '술고래' },
    { mbti: 'ISFP', favoriteDrink: '와인', favoriteSnack: '과일/디저트', tolerance: '가볍게' },
    { mbti: 'ENTP', favoriteDrink: '하이볼', favoriteSnack: '튀김/전', tolerance: '보통' },
  ];
  for (const my of mixes) {
    cases.push({ id: ++id, scenario: 'realistic_mix', my, useTraitMoods: true });
  }

  // pad/truncate to exactly 100
  while (cases.length < 100) {
    const mbti = MBTIS[cases.length % MBTIS.length];
    cases.push({
      id: ++id,
      scenario: 'pad_randomish',
      my: {
        mbti,
        favoriteDrink: DRINKS[cases.length % DRINKS.length],
        favoriteSnack: SNACKS[cases.length % SNACKS.length],
        tolerance: TOLERANCES[cases.length % TOLERANCES.length],
      },
      useTraitMoods: cases.length % 2 === 0,
    });
  }
  return cases.slice(0, 100).map((c, i) => ({ ...c, id: i + 1 }));
}

function rate(rows, key) {
  const applicable = rows.filter((r) => r[key] !== null && r[key] !== undefined);
  if (!applicable.length) return { n: 0, hit: 0, pct: null };
  const hit = applicable.filter((r) => r[key] === true).length;
  return { n: applicable.length, hit, pct: +((100 * hit) / applicable.length).toFixed(1) };
}

function main() {
  const cases = makeCases();
  const results = [];

  for (const c of cases) {
    const profile = buildProfile(c.my);
    const moods = c.useTraitMoods && profile.mbtiTrait?.moods ? [...profile.mbtiTrait.moods] : [];
    const { alcRanked, snkRanked } = rankAll(profile, moods);
    results.push(evalCase(c, profile, alcRanked, snkRanked, moods));
  }

  const scenarios = [...new Set(results.map((r) => r.scenario))];
  const summary = {
    total: results.length,
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
      avgSeparation: +(
        subset.reduce((a, r) => a + r.separation, 0) / subset.length
      ).toFixed(3),
    };
  }

  // MBTI별 drinkBias top3 hit
  const byMbti = {};
  for (const mbti of MBTIS) {
    const subset = results.filter((r) => r.mbti === mbti);
    byMbti[mbti] = {
      n: subset.length,
      drinkBiasTop3: rate(subset, 'drinkBiasTop3'),
      snackBiasTop5: rate(subset, 'snackBiasTop5'),
      abvTop1: rate(subset, 'abvTop1'),
    };
  }
  summary.byMbti = byMbti;

  // conflict: fav should beat MBTI (favoriteDrink weight 0.45 > MBTI 0.3)
  const conflicts = results.filter((r) => r.scenario === 'mbti_vs_fav_conflict');
  summary.conflictFavWinsTop3 = rate(conflicts, 'favDrinkTop3');
  summary.conflictMbtiStillTop3 = rate(conflicts, 'drinkBiasTop3');

  // empty baseline separation should be ~0
  const empty = results.find((r) => r.scenario === 'empty_baseline');
  summary.emptyBaseline = empty
    ? { topAlc: empty.topAlc, topAlcScore: empty.topAlcScore, separation: empty.separation }
    : null;

  // sample failures
  const failDrink = results.filter((r) => r.drinkBiasTop3 === false).slice(0, 8);
  const failFav = results.filter((r) => r.favDrinkTop3 === false).slice(0, 8);
  const failAbv = results.filter((r) => r.abvTop1 === false).slice(0, 8);

  const out = {
    generatedAt: new Date().toISOString(),
    catalog: { alcohols: alcohols.length, snacks: snacks.length },
    summary,
    failures: { drinkBiasTop3: failDrink, favDrinkTop3: failFav, abvTop1: failAbv },
    results,
  };

  const outPath = join(__dirname, 'sim-mbti-100-results.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  // Console report
  console.log('=== MBTI/MY 100-case simulation ===');
  console.log(`catalog: ${alcohols.length} alcohols, ${snacks.length} snacks`);
  console.log(`cases: ${results.length}`);
  console.log('\n[Overall hit rates]');
  for (const [k, v] of Object.entries(summary.metrics)) {
    if (v.pct == null) console.log(`  ${k}: n/a`);
    else console.log(`  ${k}: ${v.hit}/${v.n} = ${v.pct}%`);
  }
  console.log('\n[By scenario]');
  for (const [s, v] of Object.entries(summary.byScenario)) {
    console.log(
      `  ${s} (n=${v.n}): drinkBiasTop3=${v.drinkBiasTop3.pct ?? '-'}% favDrinkTop3=${v.favDrinkTop3.pct ?? '-'}% snackTop5=${v.snackBiasTop5.pct ?? v.favSnackTop5.pct ?? '-'}% abv=${v.abvTop1.pct ?? '-'}% sep=${v.avgSeparation}`
    );
  }
  console.log('\n[Conflict: MY favorite vs MBTI]');
  console.log(
    `  favDrinkTop3 wins: ${summary.conflictFavWinsTop3.pct}% | mbti drinkBias still in top3: ${summary.conflictMbtiStillTop3.pct}%`
  );
  console.log('\n[Empty baseline]', summary.emptyBaseline);
  console.log('\n[MBTI drinkBiasTop3]');
  for (const [m, v] of Object.entries(byMbti)) {
    console.log(`  ${m}: ${v.drinkBiasTop3.pct ?? '-'}% (n=${v.n}) snack5=${v.snackBiasTop5.pct ?? '-'}% abv=${v.abvTop1.pct ?? '-'}%`);
  }
  console.log(`\nWrote ${outPath}`);
}

main();
