import { LLM_MODES } from './llm/types.js';
import { getSystemLlmProvider, probeSystemLlm } from './llm/getProvider.js';
import { cloudNlg } from './llm/cloudNlg.js';
import { prepareTemplateForRewrite, rewriteKeepsNames } from './llm/onDeviceNlg.js';

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
  capabilities: { prompt: 'unavailable', rewriting: 'unavailable' },
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
 * 온디바이스 우선 오케스트레이션.
 * - Front: Prompt 가능 시만 LLM draft, 아니면 규칙 NLU
 * - Brain: 항상 Worker (로컬)
 * - Back: Prompt → Rewriting → 템플릿 → (최후) 클라우드
 *
 * @param {string} text
 * @param {object} [payload]
 * @param {(stage: string, label: string) => void} [payload.onProgress] UI 단계 표시
 * @param {(partial: { answer: string, recommendation?: object|null, nlgSource: string }) => void} [payload.onPartial]
 *        워커 템플릿이 나온 직후 먼저 보여 주고, BACK 완료 후 최종으로 교체
 */
export async function runTurn(text, payload = {}) {
  const { onProgress, onPartial, ...turnPayload } = payload;
  const notify = (stage, label) => {
    try {
      onProgress?.(stage, label);
    } catch {
      /* ignore UI errors */
    }
  };

  notify('probe', '기기 AI 확인 중…');
  const probe = await probeSystemLlm({
    force: !aiState.mode || aiState.mode === LLM_MODES.LITE,
  });
  const provider = await getSystemLlmProvider();
  const caps = probe.capabilities || {};
  const promptOk = caps.prompt === 'available';
  const rewriteOk = caps.rewriting === 'available';
  const mode = probe.available || promptOk || rewriteOk ? LLM_MODES.FULL : LLM_MODES.LITE;

  aiState.mode = mode;
  aiState.lastProvider = probe.provider || 'stub';
  aiState.probeReason = probe.reason || (mode === LLM_MODES.FULL ? 'ok' : 'unavailable');
  aiState.capabilities = caps;

  let frontDraft = null;
  let onDevicePath = 'none';

  if (promptOk && provider.generateFront) {
    notify('front', '의도 파악 중… (온디바이스)');
    try {
      frontDraft = await provider.generateFront({ text });
      if (frontDraft) onDevicePath = 'prompt';
    } catch (err) {
      console.warn('LLM Front failed, rule NLU', err);
      frontDraft = null;
    }
  }

  notify('worker', '술·안주 고르는 중…');
  const workerResult = await postToWorker({
    type: 'turn',
    text,
    payload: { ...turnPayload, frontDraft },
  });

  let answer = workerResult.templateAnswer || workerResult.answer;
  let nlgSource = 'template';

  // 템플릿을 먼저 보여 체감 대기 시간을 줄임 (BACK은 이어서 교체)
  if (typeof onPartial === 'function' && answer) {
    try {
      onPartial({
        answer,
        recommendation: workerResult.recommendation || null,
        nlgSource: 'template',
        pendingPolish: Boolean(promptOk || rewriteOk),
      });
    } catch {
      /* ignore */
    }
  }

  if (promptOk && provider.generateBack) {
    notify('back', '문장 다듬는 중… (온디바이스)');
    try {
      const back = await provider.generateBack({
        facts: workerResult.facts,
        profile: turnPayload.profile,
      });
      if (back) {
        answer = back;
        nlgSource = 'on_device_prompt';
        onDevicePath = 'prompt';
      }
    } catch (err) {
      console.warn('LLM Back failed', err);
    }
  }

  if (nlgSource === 'template' && rewriteOk && provider.rewriteAnswer) {
    notify('rewrite', '말투 다듬는 중…');
    try {
      const prepared = prepareTemplateForRewrite(answer);
      const rewritten = await provider.rewriteAnswer(prepared);
      if (rewritten && rewriteKeepsNames(rewritten, workerResult.facts)) {
        answer = rewritten;
        nlgSource = 'on_device_rewriting';
        if (onDevicePath === 'none') onDevicePath = 'rewriting';
      }
    } catch (err) {
      console.warn('Rewriting Back failed', err);
    }
  }

  // 온디바이스가 전혀 없을 때만 클라우드 NLG
  if (nlgSource === 'template' && onDevicePath === 'none') {
    notify('cloud', '응답 다듬는 중…');
    const cloud = await cloudNlg({
      facts: workerResult.facts,
      profile: turnPayload.profile,
    });
    if (cloud) {
      answer = cloud;
      nlgSource = 'cloud';
    }
  }

  notify('done', '');

  return {
    ...workerResult,
    answer,
    mode,
    nlgSource,
    onDevicePath,
    provider: probe.provider || 'stub',
    probeReason: aiState.probeReason,
    capabilities: caps,
  };
}

const initialProfile = JSON.parse(
  localStorage.getItem('omaju_user_profile') ||
    '{"favoriteAlcohols":[],"favoriteFoods":[],"favoriteGames":[],"dislikedAlcohols":[],"favoriteMood":[],"monthlyBudget":0}'
);
aiWorker.postMessage({ type: 'init', userProfile: initialProfile });
probeSystemLlm({ force: true }).then((p) => {
  const caps = p.capabilities || {};
  const on =
    p.available || caps.prompt === 'available' || caps.rewriting === 'available';
  aiState.mode = on ? LLM_MODES.FULL : LLM_MODES.LITE;
  aiState.lastProvider = p.provider || 'stub';
  aiState.probeReason = p.reason || (on ? 'ok' : 'unavailable');
  aiState.capabilities = caps;
});
