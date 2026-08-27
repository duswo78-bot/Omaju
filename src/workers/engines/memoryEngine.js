let chatHistory = []; // 최근 대화 기록 (최대 8턴)
let lastRecommendation = null;
let pendingContextText = '';
let rejectedItems = new Set(); // 사용자가 거절한 아이템 ID 목록 (단기 기억)
let recentRecommendedIds = []; // 최근 추천된 술/안주/게임 ID (다양성용)

const DRINK_HINTS = ['소주', '맥주', '와인', '막걸리', '하이볼', '위스키', '칵테일', '전통주', '논알콜', '청하'];
const MOOD_HINTS = [
  ['비', 'rain'],
  ['비오', 'rain'],
  ['더워', 'hot'],
  ['더운', 'hot'],
  ['추워', 'cold'],
  ['추운', 'cold'],
  ['슬프', 'sad'],
  ['우울', 'sad'],
  ['행복', 'happy'],
  ['신나', 'happy'],
  ['축하', 'celebrate'],
  ['회식', 'friends'],
  ['데이트', 'romantic'],
  ['혼자', 'honsul'],
];

export function getHistory() {
  return chatHistory;
}

export function pushHistory(role, text) {
  chatHistory.push({ role, text, ts: Date.now() });
  if (chatHistory.length > 16) {
    chatHistory = chatHistory.slice(-16); // 최대 16개 (8턴) 유지
  }
}

/**
 * 최근 대화에서 NLU/BACK에 넘길 짧은 맥락 요약.
 * @returns {{ alcoholHints: string[], exclude: string[], moods: string[], notes: string[] }}
 */
export function getDialogueContext(limitTurns = 4) {
  const recent = chatHistory.slice(-limitTurns * 2);
  const alcoholHints = [];
  const exclude = [];
  const moods = [];
  const notes = [];

  for (const turn of recent) {
    const t = String(turn.text || '');
    if (!t.trim()) continue;
    if (turn.role === 'user') {
      notes.push(`사용자: ${t.slice(0, 80)}`);
      for (const d of DRINK_HINTS) {
        if (t.includes(d)) {
          if (/싫|별로|말고|제외|빼고|먹었/.test(t)) exclude.push(d);
          else alcoholHints.push(d);
        }
      }
      for (const [kw, mood] of MOOD_HINTS) {
        if (t.includes(kw) && !moods.includes(mood)) moods.push(mood);
      }
    } else {
      notes.push(`오마주: ${t.slice(0, 60)}`);
    }
  }

  if (lastRecommendation?.bestAlc?.category) {
    alcoholHints.push(lastRecommendation.bestAlc.category);
  }

  return {
    alcoholHints: [...new Set(alcoholHints)],
    exclude: [...new Set(exclude)],
    moods: [...new Set(moods)],
    notes: notes.slice(-6),
  };
}

/** 현재 frame 슬롯에 대화 맥락을 soft-merge (이번 턴 명시 힌트가 우선) */
export function applyDialogueContextToFrame(frame) {
  if (!frame?.slots) return frame;
  const ctx = getDialogueContext(3);
  const slots = frame.slots;
  slots.constraints = slots.constraints || {};
  slots.constraints.exclude = [...new Set([...(slots.constraints.exclude || []), ...ctx.exclude])];

  if (!slots.alcoholHints?.length && ctx.alcoholHints.length) {
    slots.alcoholHints = ctx.alcoholHints.slice(0, 4);
  }
  if (!slots.moods?.length && ctx.moods.length) {
    slots.moods = ctx.moods.slice(0, 3);
  }
  frame.dialogueNotes = ctx.notes;
  frame.dialogueExclude = ctx.exclude;
  return frame;
}

export function getLastRecommendation() {
  return lastRecommendation;
}

export function setLastRecommendation(rec) {
  lastRecommendation = rec;
}

export function getPendingContextText() {
  return pendingContextText;
}

export function setPendingContextText(text) {
  pendingContextText = text;
}

export function getRejectedItems() {
  return Array.from(rejectedItems);
}

export function addRejectedItem(id) {
  if (id) {
    rejectedItems.add(id);
    // 메모리가 너무 커지지 않게 유지 (최근 10개)
    if (rejectedItems.size > 10) {
      const first = rejectedItems.values().next().value;
      rejectedItems.delete(first);
    }
  }
}

export function clearRejectedItems() {
  rejectedItems.clear();
}

export function rememberRecommendedIds(ids = []) {
  for (const id of ids) {
    if (!id) continue;
    recentRecommendedIds = [id, ...recentRecommendedIds.filter((x) => x !== id)].slice(0, 16);
  }
}

export function getRecentRecommendedIds() {
  return recentRecommendedIds;
}

