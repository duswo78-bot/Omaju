import { annotateGlossary } from './glossary/index.js';

/**
 * @typedef {'no'|'soft'|'hard'} RecommendOpenness
 * @typedef {'alone'|'friends'|'date'|'work'|null} RelationTag
 *
 * @typedef {Object} SemanticFrame
 * @property {string[]} weather
 * @property {'positive'|'negative'|'neutral'|null} mood
 * @property {'low'|'mid'|'high'|null} energy
 * @property {string[]} emotionLabels
 * @property {RelationTag} relation
 * @property {string[]} alcoholHints
 * @property {string[]} snackHints
 * @property {object} constraints
 * @property {string|null} placeQuery
 * @property {string|null} intent
 * @property {number} confidence
 * @property {RecommendOpenness} openToRecommend
 * @property {string} rawText
 * @property {object} glossary
 */

/**
 * NluFrame + Glossary → SemanticFrame
 * Intent는 보조 필드.
 * @param {import('../nlu/schema.js').NluFrame} nluFrame
 * @param {ReturnType<typeof annotateGlossary>} [glossary]
 * @returns {SemanticFrame}
 */
export function buildSemanticFrame(nluFrame, glossary) {
  const g = glossary || annotateGlossary(nluFrame?.rawText || '');
  const slots = nluFrame?.slots || {};
  const constraints = { ...(slots.constraints || {}) };

  if (g.idioms?.hangover) constraints.hangover = true;

  const weather = uniq([...(slots.weather || []), ...(g.weather || [])]);
  const emotionLabels = uniq([...(g.emotion?.labels || [])]);
  const catalogMoods = uniq([...(slots.moods || []), ...(g.emotion?.catalogMoods || [])]);

  if (g.idioms?.light) constraints.light = true;
  if (g.idioms?.hangover) constraints.hangover = true;
  if (g.idioms?.nonAlcoholic) constraints.nonAlcoholic = true;
  if (g.idioms?.wantSnack && !constraints.onlyAlcohol) constraints.onlySnack = constraints.onlySnack || false;

  let mood = g.emotion?.valence || g.idioms?.valence || null;
  if (!mood && catalogMoods.length) {
    const neg = ['sad', 'stressed', 'tired', 'comfort'];
    const pos = ['happy', 'celebrate'];
    if (catalogMoods.some((m) => neg.includes(m))) mood = 'negative';
    else if (catalogMoods.some((m) => pos.includes(m))) mood = 'positive';
    else mood = 'neutral';
  }

  let energy = g.emotion?.energy || g.idioms?.energy || null;
  if (!energy && mood === 'negative') energy = 'low';
  if (!energy && mood === 'positive') energy = 'high';

  /** @type {RelationTag} */
  // 관계는 관용/명시 단서만 사용 (감정 catalog의 friends 편향으로 오탐하지 않음)
  let relation = g.idioms?.relation || null;
  if (!relation) {
    const explicit = slots.moods || [];
    if (explicit.includes('honsul')) relation = 'alone';
    else if (explicit.includes('romantic')) relation = 'date';
  }

  /** @type {RecommendOpenness} */
  let openToRecommend = 'no';
  const intent = nluFrame?.intent || null;
  if (intent === 'RECOMMEND' || intent === 'AFFIRM' || g.idioms?.openToRecommend === 'hard') {
    openToRecommend = 'hard';
  } else if (
    intent === 'GUIDE' ||
    g.idioms?.openToRecommend === 'soft' ||
    g.idioms?.wantDrink ||
    g.idioms?.wantSnack
  ) {
    openToRecommend = 'soft';
  } else if (mood || weather.length) {
    openToRecommend = 'soft';
  }

  if (intent === 'MOOD' || intent === 'SMALLTALK') {
    openToRecommend = openToRecommend === 'hard' ? 'hard' : 'soft';
  }
  if (intent === 'UNKNOWN' || intent === 'COMPLAINT' || intent === 'OFFTOPIC') {
    openToRecommend = 'soft';
  }
  if (intent === 'GOODBYE' || intent === 'THANKS') openToRecommend = 'no';

  return {
    weather,
    mood,
    energy,
    emotionLabels,
    catalogMoods,
    relation,
    alcoholHints: [...(slots.alcoholHints || [])],
    snackHints: [...(slots.snackHints || [])],
    constraints,
    placeQuery: slots.placeQuery || null,
    intent,
    confidence: Number(nluFrame?.confidence) || 0.5,
    openToRecommend,
    rawText: nluFrame?.rawText || g.raw || '',
    glossary: g,
  };
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}
