import { resolveAiAlcoholIds } from './src/data/drinkIdMap.js';
import snacksData from './src/data/snacks.json';
import relationsData from './src/data/relations.json';
import alcoholsData from './src/data/alcohols.json';
import { runConversationTurn } from './src/workers/conversationTurn.js';

function buildScoredSnacks(uiDrinkId) {
  const aiIds = new Set(resolveAiAlcoholIds(uiDrinkId));
  const snackById = new Map(snacksData.map((s) => [s.id, s]));
  const scores = new Map();

  for (const rel of relationsData) {
    if (!aiIds.has(rel.source)) continue;
    const prev = scores.get(rel.target) || 0;
    if (rel.score > prev) scores.set(rel.target, rel.score);
  }

  for (const snack of snacksData) {
    if (snack.bestDrinks?.some((id) => aiIds.has(id))) {
      const prev = scores.get(snack.id) || 0;
      if (prev < 80) scores.set(snack.id, Math.max(prev, 80));
    }
  }

  for (const alc of alcoholsData) {
    if (!aiIds.has(alc.id)) continue;
    for (const snkId of alc.pairings || []) {
      const prev = scores.get(snkId) || 0;
      if (prev < 90) scores.set(snkId, Math.max(prev, 90));
    }
  }

  const matchedAlcs = alcoholsData.filter((a) => aiIds.has(a.id));
  const categoryNames = new Set(matchedAlcs.map((a) => a.category));
  for (const cat of categoryNames) {
    for (const snack of snacksData) {
      if (
        snack.category === `${cat}안주` ||
        snack.tags?.includes(`${cat}안주`) ||
        snack.tags?.includes(cat) ||
        (cat === '백주' && (snack.category === '중식안주' || snack.tags?.includes('중식')))
      ) {
        const prev = scores.get(snack.id) || 0;
        if (prev < 82) scores.set(snack.id, Math.max(prev, 82));
      }
    }
  }

  return [...scores.entries()]
    .map(([id, score]) => {
      const snack = snackById.get(id);
      if (!snack) return null;
      return {
        name_ko: snack.name_ko,
        category: snack.category,
        matchScore: score,
        hasRecipe: Boolean(snack.recipe),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
}

console.log('=== [1. Whiskey Snacks in /recommendation] ===');
const whiskeySnacks = buildScoredSnacks('whiskey');
console.log(`Total Whiskey Snacks Found: ${whiskeySnacks.length}`);
console.log('Top 8 Whiskey Snacks:', whiskeySnacks.slice(0, 8));

console.log('\n=== [2. Baijiu Snacks in /recommendation] ===');
const baijiuSnacks = buildScoredSnacks('baijiu');
console.log(`Total Baijiu Snacks Found: ${baijiuSnacks.length}`);
console.log('Top 8 Baijiu Snacks:', baijiuSnacks.slice(0, 8));

console.log('\n=== [3. Chatbot Baijiu Recommendation Test] ===');
const res1 = await runConversationTurn('연태고량주에 어울리는 안주');
console.log('[INPUT] "연태고량주에 어울리는 안주"');
console.log('  -> Alcohol:', res1.recommendation?.alcohol?.name_ko);
console.log('  -> Snack:', res1.recommendation?.snack?.name_ko);
console.log('  -> Answer:\n', res1.answer);

const res2 = await runConversationTurn('백주 안주 추천해줘');
console.log('\n[INPUT] "백주 안주 추천해줘"');
console.log('  -> Alcohol:', res2.recommendation?.alcohol?.name_ko);
console.log('  -> Snack:', res2.recommendation?.snack?.name_ko);
console.log('  -> Answer:\n', res2.answer);
