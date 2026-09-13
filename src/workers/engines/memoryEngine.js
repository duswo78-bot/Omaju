let chatHistory = []; // 최근 대화 기록 (최대 8턴)
let lastRecommendation = null;
let pendingContextText = '';
let rejectedItems = new Set(); // 사용자가 거절한 아이템 ID 목록 (단기 기억)
let recentRecommendedIds = []; // 최근 추천된 술/안주/게임 ID (다양성용)

const DRINK_HINTS = ['소주', '맥주', '와인', '막걸리', '하이볼', '위스키', '칵테일', '전통주', '논알콜', '청하'];
const SNACK_HINTS = [
  '치킨', '피자', '삼겹살', '고기', '탕', '찌개', '전', '파전', '김치전',
  '샐러드', '회', '라면', '어묵탕', '골뱅이', '먹태', '마른안주', '떡볶이',
  '튀김', '순대', '국밥', '곱창', '막창', '조개탕', '치즈', '과일', '나초',
  '감자튀김', '팝콘', '스테이크', '육회', '오뎅'
];
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

export function clearConversationMemory() {
  chatHistory = [];
  lastRecommendation = null;
  pendingContextText = '';
  rejectedItems.clear();
  recentRecommendedIds = [];
}

export function pushHistory(role, text) {
  chatHistory.push({ role, text, ts: Date.now() });
  if (chatHistory.length > 16) {
    chatHistory = chatHistory.slice(-16); // 최대 16개 (8턴) 유지
  }
}

/**
 * 최근 대화에서 NLU/BACK에 넘길 짧은 맥락 요약.
 * @returns {{ alcoholHints: string[], snackHints: string[], exclude: string[], moods: string[], notes: string[] }}
 */
export function getDialogueContext(limitTurns = 4) {
  const recent = chatHistory.slice(-limitTurns * 2);
  let alcoholHints = [];
  let snackHints = [];
  const exclude = [];
  const moods = [];
  const notes = [];

  for (const turn of recent) {
    const t = String(turn.text || '');
    if (!t.trim()) continue;
    if (turn.role === 'user') {
      notes.push(`사용자: ${t.slice(0, 80)}`);

      // 취향 번복 / 정정(Override) 시그널 감지 ("아니다", "그거 말고", "바꿀래", "소주 말고 맥주" 등)
      const hasChangeOfMind = /아니(?:다|요|야)?|바꿀래|그거\s*말고|아까\s*말한\s*거\s*말고|생각\s*바뀌/.test(t);

      // "A 말고", "A 빼고", "A 제외" 패턴
      const excludeRe = /([가-힣A-Za-z0-9]{2,10})\s*(?:말고|제외|빼고|말구)/g;
      let em;
      while ((em = excludeRe.exec(t)) !== null) {
        if (em[1]) {
          exclude.push(em[1]);
          alcoholHints = alcoholHints.filter((a) => a !== em[1]);
          snackHints = snackHints.filter((s) => s !== em[1]);
        }
      }

      // 새 주종이 언급되고 번복 시그널이 있으면 이전 주종 누적값 초기화
      const foundNewDrinks = DRINK_HINTS.filter((d) => t.includes(d) && !t.includes(`${d} 말고`) && !t.includes(`${d} 빼고`));
      if (hasChangeOfMind && foundNewDrinks.length > 0) {
        alcoholHints = [];
      }

      for (const d of DRINK_HINTS) {
        if (t.includes(d)) {
          if (/싫|별로|말고|제외|빼고|먹었/.test(t)) {
            exclude.push(d);
            alcoholHints = alcoholHints.filter((a) => a !== d);
          } else if (!exclude.includes(d)) {
            alcoholHints.push(d);
          }
        }
      }

      // 새 안주가 언급되고 번복 시그널이 있으면 이전 안주 누적값 초기화
      const foundNewSnacks = SNACK_HINTS.filter((s) => t.includes(s) && !t.includes(`${s} 말고`) && !t.includes(`${s} 빼고`));
      if (hasChangeOfMind && foundNewSnacks.length > 0) {
        snackHints = [];
      }

      for (const s of SNACK_HINTS) {
        if (t.includes(s)) {
          if (/싫|별로|말고|제외|빼고|먹었/.test(t)) {
            exclude.push(s);
            snackHints = snackHints.filter((item) => item !== s);
          } else if (!exclude.includes(s)) {
            snackHints.push(s);
          }
        }
      }

      for (const [kw, mood] of MOOD_HINTS) {
        if (t.includes(kw) && !moods.includes(mood)) moods.push(mood);
      }
    } else {
      notes.push(`오마주: ${t.slice(0, 60)}`);
    }
  }

  // 직전 추천 주종은 제외/번복 상태가 아닐 때만 참고
  if (lastRecommendation?.bestAlc?.category) {
    const lastCat = lastRecommendation.bestAlc.category;
    if (!exclude.includes(lastCat) && !alcoholHints.includes(lastCat)) {
      alcoholHints.push(lastCat);
    }
  }

  return {
    alcoholHints: [...new Set(alcoholHints)],
    snackHints: [...new Set(snackHints)],
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
  if (!slots.snackHints?.length && ctx.snackHints.length) {
    slots.snackHints = ctx.snackHints.slice(0, 4);
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

