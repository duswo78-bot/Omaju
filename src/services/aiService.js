export const aiWorker = new Worker(new URL('../workers/aiWorker.js', import.meta.url), { type: 'module' });

export const aiState = {
  isReady: false,
  statusMessage: "AI 코어 활성화 중...",
  progress: 0,
};

const listeners = new Set();

export function subscribeToAI(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

aiWorker.onmessage = (e) => {
  const { type, data } = e.data;
  
  if (type === 'progress') {
    if (data.status === 'downloading' && data.progress) {
      aiState.statusMessage = `AI 모델 다운로드 중... (${Math.round(data.progress)}%)`;
      aiState.progress = data.progress;
    }
  } else if (type === 'ready') {
    aiState.isReady = true;
    aiState.statusMessage = "";
  }
  
  // 모든 리스너에게 메시지 브로드캐스트
  listeners.forEach(fn => fn(e.data));
};

aiWorker.onerror = (error) => {
  console.error("AI Worker Error:", error);
  aiState.statusMessage = "AI 로드 실패. 기본 모드로 전환합니다.";
  aiState.isReady = true; // 실패해도 UI 차단을 풀기 위함
  listeners.forEach(fn => fn({ type: 'error', error }));
};

// 모듈이 로드되자마자 즉시 백그라운드에서 AI 초기화 시작!
const initialProfile = JSON.parse(localStorage.getItem('omaju_user_profile') || '{"favoriteAlcohols":[],"favoriteFoods":[],"favoriteGames":[],"dislikedAlcohols":[],"favoriteMood":[],"monthlyBudget":0}');
aiWorker.postMessage({ type: 'init', userProfile: initialProfile });
