let chatHistory = []; // 최근 대화 기록 (최대 8턴)
let lastRecommendation = null;
let pendingContextText = '';
let rejectedItems = new Set(); // 사용자가 거절한 아이템 ID 목록 (단기 기억)
let recentRecommendedIds = []; // 최근 추천된 술/안주/게임 ID (다양성용)

export function getHistory() {
  return chatHistory;
}

export function pushHistory(role, text) {
  chatHistory.push({ role, text, ts: Date.now() });
  if (chatHistory.length > 16) {
    chatHistory = chatHistory.slice(-16); // 최대 16개 (8턴) 유지
  }
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

