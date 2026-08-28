/**
 * Phase3: 대화 의미 상태 누적
 */

const state = {
  weather: /** @type {string[]} */ ([]),
  mood: /** @type {string|null} */ (null),
  energy: /** @type {string|null} */ (null),
  relation: /** @type {string|null} */ (null),
  lastBotAsk: /** @type {string|null} */ (null), // recommend | drink | place | clarify | none
  lastIntent: /** @type {string|null} */ (null),
  recommendHistory: /** @type {Array<{ alcohol?: string, snack?: string, ts: number }>} */ ([]),
  exclude: /** @type {string[]} */ ([]),
  turn: 0,
};

export function getDialogueState() {
  return { ...state, weather: [...state.weather], exclude: [...state.exclude], recommendHistory: [...state.recommendHistory] };
}

export function resetDialogueState() {
  state.weather = [];
  state.mood = null;
  state.energy = null;
  state.relation = null;
  state.lastBotAsk = null;
  state.lastIntent = null;
  state.recommendHistory = [];
  state.exclude = [];
  state.turn = 0;
}

/**
 * 이번 턴 SemanticFrame으로 상태 갱신 (명시값 우선, 빈 슬롯은 상속)
 * @param {import('./frame.js').SemanticFrame} frame
 */
export function updateDialogueStateFromFrame(frame) {
  state.turn += 1;
  if (frame.weather?.length) state.weather = uniq([...frame.weather]);
  if (frame.mood) state.mood = frame.mood;
  if (frame.energy) state.energy = frame.energy;
  if (frame.relation) state.relation = frame.relation;
  if (frame.intent) state.lastIntent = frame.intent;
  const ex = frame.constraints?.exclude || [];
  if (ex.length) state.exclude = uniq([...state.exclude, ...ex]);
  return getDialogueState();
}

/**
 * 빈 semantic 슬롯에 대화 상태 상속
 * @param {import('./frame.js').SemanticFrame} frame
 */
export function inheritDialogueState(frame) {
  if (!frame.weather?.length && state.weather.length) frame.weather = [...state.weather];
  if (!frame.mood && state.mood) frame.mood = state.mood;
  if (!frame.energy && state.energy) frame.energy = state.energy;
  if (!frame.relation && state.relation) frame.relation = state.relation;
  if (state.exclude.length) {
    frame.constraints = frame.constraints || {};
    frame.constraints.exclude = uniq([...(frame.constraints.exclude || []), ...state.exclude]);
  }
  return frame;
}

export function setLastBotAsk(askType) {
  state.lastBotAsk = askType || null;
}

export function getLastBotAsk() {
  return state.lastBotAsk;
}

export function pushRecommendHistory(rec) {
  if (!rec) return;
  state.recommendHistory = [
    { alcohol: rec.alcohol, snack: rec.snack, ts: Date.now() },
    ...state.recommendHistory,
  ].slice(0, 8);
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}
