import { LLM_MODES } from './llm/types.js';
import { getSystemLlmProvider, probeSystemLlm } from './llm/getProvider.js';
import { cloudNlg } from './llm/cloudNlg.js';

export const aiWorker = new Worker(new URL('../workers/aiWorker.js', import.meta.url), {
  type: 'module',
});

export const aiState = {
  isReady: false,
  statusMessage: 'AI 코어 활성화 중...',
  progress: 0,
  mode: LLM_MODES.LITE,
  lastProvider: 'stub',
  /** probe reason: ok | downloadable | downloading | unavailable | web | ... */
  probeReason: 'init',
};

const listeners = new Set();
const pendingTurns = new Map();
let turnSeq = 0;

export function subscribeToAI(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function broadcast(data) {
  listeners.forEach((fn) => fn(data));
}

function postToWorker(message, { timeoutMs = 90000 } = {}) {
  const requestId = `t_${Date.now()}_${++turnSeq}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingTurns.delete(requestId);
      reject(new Error('worker_timeout'));
    }, timeoutMs);

    pendingTurns.set(requestId, {
      resolve: (data) => {
        clearTimeout(timer);
        pendingTurns.delete(requestId);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timer);
        pendingTurns.delete(requestId);
        reject(err);
      },
    });

    aiWorker.postMessage({ ...message, requestId });
  });
}

aiWorker.onmessage = (e) => {
  const { type, data, requestId } = e.data;

  if (type === 'progress') {
    if (data?.status === 'downloading' && data.progress) {
      aiState.statusMessage = `AI 모델 다운로드 중... (${Math.round(data.progress)}%)`;
      aiState.progress = data.progress;
    }
    broadcast(e.data);
    return;
  }

  if (type === 'ready') {
    aiState.isReady = true;
    aiState.statusMessage = '';
    broadcast(e.data);
    return;
  }

  if ((type === 'response' || type === 'error') && requestId && pendingTurns.has(requestId)) {
    const pending = pendingTurns.get(requestId);
    if (type === 'error') pending.reject(new Error(e.data.message || 'worker_error'));
    else pending.resolve(e.data);
    // UI는 runTurn 결과를 직접 쓰므로 response는 브로드캐스트하지 않음
    return;
  }

  broadcast(e.data);
};

aiWorker.onerror = (error) => {
  console.error('AI Worker Error:', error);
  aiState.statusMessage = 'AI 로드 실패. 기본 모드로 전환합니다.';
  aiState.isReady = true;
  broadcast({ type: 'error', error });
};

/**
 * FULL/LITE 오케스트레이션.
 * Capacitor 시스템 LLM은 메인 스레드에서만 호출한다.
 */
export async function runTurn(text, payload = {}) {
  // 미가용(다운로드 중 등)이면 매 턴 재probe
  const probe = await probeSystemLlm({ force: !aiState.mode || aiState.mode === LLM_MODES.LITE });
  const provider = await getSystemLlmProvider();
  const mode = probe.available ? LLM_MODES.FULL : LLM_MODES.LITE;
  aiState.mode = mode;
  aiState.lastProvider = probe.provider || 'stub';
  aiState.probeReason = probe.reason || (probe.available ? 'ok' : 'unavailable');

  let frontDraft = null;
  if (mode === LLM_MODES.FULL) {
    try {
      frontDraft = await provider.generateFront({ text });
    } catch (err) {
      console.warn('LLM Front failed, falling back to rule NLU', err);
      frontDraft = null;
    }
  }

  const workerResult = await postToWorker({
    type: 'turn',
    text,
    payload: { ...payload, frontDraft },
  });

  let answer = workerResult.templateAnswer || workerResult.answer;
  let nlgSource = 'template';

  if (mode === LLM_MODES.FULL) {
    try {
      const back = await provider.generateBack({
        facts: workerResult.facts,
        profile: payload.profile,
      });
      if (back) {
        answer = back;
        nlgSource = 'on_device';
      }
    } catch (err) {
      console.warn('LLM Back failed', err);
    }
  }

  if (nlgSource === 'template') {
    const cloud = await cloudNlg({
      facts: workerResult.facts,
      profile: payload.profile,
    });
    if (cloud) {
      answer = cloud;
      nlgSource = 'cloud';
    }
  }

  return {
    ...workerResult,
    answer,
    mode,
    nlgSource,
    provider: probe.provider || 'stub',
    probeReason: aiState.probeReason,
  };
}

const initialProfile = JSON.parse(
  localStorage.getItem('omaju_user_profile') ||
    '{"favoriteAlcohols":[],"favoriteFoods":[],"favoriteGames":[],"dislikedAlcohols":[],"favoriteMood":[],"monthlyBudget":0}'
);
aiWorker.postMessage({ type: 'init', userProfile: initialProfile });
probeSystemLlm({ force: true }).then((p) => {
  aiState.mode = p.available ? LLM_MODES.FULL : LLM_MODES.LITE;
  aiState.lastProvider = p.provider || 'stub';
  aiState.probeReason = p.reason || (p.available ? 'ok' : 'unavailable');
});
