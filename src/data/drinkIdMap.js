/**
 * UI drink ids (Home/DrinkContext) ↔ AI catalog alcohol ids (alcohols.json)
 */
import alcoholsData from './alcohols.json';

const byCategory = (category) =>
  alcoholsData.filter((a) => a.category === category).map((a) => a.id);

/** Explicit UI id → AI alcohol ids used for pairing lookup */
export const UI_TO_AI_IDS = {
  soju: byCategory('소주'),
  beer: byCategory('맥주'),
  wine: byCategory('와인'),
  whiskey: byCategory('위스키'),
  makgeolli: byCategory('전통주'),
  highball: byCategory('칵테일/하이볼'),
  // Mix drinks → closest catalog alcohols
  somaek: ['alc_soju_cham', 'alc_soju_jinro', 'alc_beer_cass', 'alc_beer_terra'],
  bomb: ['alc_whiskey_shot', 'alc_beer_cass', 'alc_beer_terra'],
  wine_spritzer: ['alc_wine_white', 'alc_wine_sparkling'],
  beer_sangria: ['alc_beer_stella', 'alc_wine_red', 'alc_wine_sparkling'],
  jackcoke: ['alc_whiskey_shot', 'alc_highball_jimbeam'],
  socola: ['alc_soju_cham', 'alc_soju_jinro'],
  sosa: ['alc_soju_cham', 'alc_soju_saero'],
  wine_ade: ['alc_wine_white', 'alc_wine_sparkling'],
  ssacol: ['alc_beer_cass', 'alc_vodka_tonic'],
  maksa: ['alc_makgeolli_jipyeong', 'alc_makgeolli_jangsoo'],
  diesel: ['alc_beer_cass', 'alc_beer_terra'],
  gojin: ['alc_soju_cham', 'alc_beer_cass'],
  // Non-alcohol UI items → light / versatile pairings
  carbonated: ['alc_vodka_tonic', 'alc_highball_earlgrey', 'alc_wine_sparkling'],
  cola: ['alc_whiskey_shot', 'alc_highball_jimbeam', 'alc_beer_budweiser'],
  sprite: ['alc_soju_saero', 'alc_highball_earlgrey', 'alc_cocktail_peach'],
  water: byCategory('소주').slice(0, 3).concat(byCategory('맥주').slice(0, 3)),
};

export function resolveAiAlcoholIds(uiDrinkId) {
  if (UI_TO_AI_IDS[uiDrinkId]?.length) return UI_TO_AI_IDS[uiDrinkId];
  // Fallback: try matching category name_ko fragment
  const match = alcoholsData.find(
    (a) => a.id.includes(uiDrinkId) || a.name_ko.includes(uiDrinkId)
  );
  return match ? [match.id] : byCategory('소주');
}

export function buildPendingContext(drink) {
  if (!drink?.name) return '';
  return `지금 테이블에 ${drink.name}가 있어요. ${drink.name}에 잘 어울리는 안주를 중심으로 추천해주세요.`;
}
