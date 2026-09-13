/**
 * Phase3: 대화 의미 상태 누적
 */

const state = {
  weather: /** @type {string[]} */ ([]),
  mood: /** @type {string|null} */ (null),
  energy: /** @type {string|null} */ (null),
  relation: /** @type {string|null} */ (null),
  nonAlcoholic: false,
  lastBotAsk: /** @type {string|null} */ (null), // recommend | drink | place | clarify | none
  lastIntent: /** @type {string|null} */ (null),
  recommendHistory: /** @type {Array<{ alcohol?: string, snack?: string, ts: number }>} */ ([]),
  exclude: /** @type {string[]} */ ([]),
  turn: 0,
  consecutiveChitchatTurns: 0,
};

export function getDialogueState() {
  return { ...state, weather: [...state.weather], exclude: [...state.exclude], recommendHistory: [...state.recommendHistory] };
}

export function resetDialogueState() {
  state.weather = [];
  state.mood = null;
  state.energy = null;
  state.relation = null;
  state.nonAlcoholic = false;
  state.lastBotAsk = null;
  state.lastIntent = null;
  state.recommendHistory = [];
  state.exclude = [];
  state.turn = 0;
  state.consecutiveChitchatTurns = 0;
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
  const wantsDrink = /말아|한\s*잔|마실|마셔|마시자|술|취하|짠|알콜|하이볼|맥주|소주|칵테일|위스키|와인/.test(frame.rawText || '');
  if (wantsDrink) {
    state.nonAlcoholic = false;
  } else if (frame.intent === 'DECLINE_ALCOHOL' || frame.constraints?.nonAlcoholic || frame.constraints?.onlySnack) {
    state.nonAlcoholic = true;
  } else if ((frame.slots?.alcoholHints || []).length > 0 || (frame.resolved?.alcoholIds || []).length > 0) {
    state.nonAlcoholic = false;
  }
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
  const wantsDrink = /말아|한\s*잔|마실|마셔|마시자|술|취하|짠|알콜|하이볼|맥주|소주|칵테일|위스키|와인/.test(frame.rawText || '');
  if (wantsDrink) {
    state.nonAlcoholic = false;
    if (frame.constraints) {
      delete frame.constraints.onlySnack;
      delete frame.constraints.nonAlcoholic;
    }
  } else if (state.nonAlcoholic && !(frame.slots?.alcoholHints || []).length && !(frame.resolved?.alcoholIds || []).length) {
    frame.constraints = frame.constraints || {};
    frame.constraints.onlySnack = true;
    frame.constraints.nonAlcoholic = true;
  }
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

export function incrementChitchatTurns() {
  state.consecutiveChitchatTurns += 1;
  return state.consecutiveChitchatTurns;
}

export function resetChitchatTurns() {
  state.consecutiveChitchatTurns = 0;
}

export function getConsecutiveChitchatTurns() {
  return state.consecutiveChitchatTurns;
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}
