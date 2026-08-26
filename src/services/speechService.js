import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

/**
 * 네이티브(안드로이드/iOS) STT — 기기 SpeechRecognizer / SFSpeechRecognizer 사용.
 * 웹은 Web Speech API 폴백(지원 브라우저만).
 */

let webRecognition = null;
let partialHandle = null;
let listeningHandle = null;
let errorHandle = null;

function isNative() {
  return Capacitor.isNativePlatform();
}

async function ensureNativeReady() {
  const { available } = await SpeechRecognition.available();
  if (!available) {
    throw new Error('이 기기에서 음성 인식을 사용할 수 없습니다.');
  }

  const perm = await SpeechRecognition.checkPermissions();
  if (perm.speechRecognition !== 'granted') {
    const req = await SpeechRecognition.requestPermissions();
    if (req.speechRecognition !== 'granted') {
      throw new Error('마이크/음성 인식 권한이 필요합니다.');
    }
  }
}

async function cleanupNativeListeners() {
  try {
    if (partialHandle) await partialHandle.remove();
  } catch { /* ignore */ }
  try {
    if (listeningHandle) await listeningHandle.remove();
  } catch { /* ignore */ }
  try {
    if (errorHandle) await errorHandle.remove();
  } catch { /* ignore */ }
  partialHandle = null;
  listeningHandle = null;
  errorHandle = null;
  try {
    await SpeechRecognition.removeAllListeners();
  } catch { /* ignore */ }
}

/**
 * @param {{
 *   language?: string,
 *   onPartial?: (text: string) => void,
 *   onFinal?: (text: string) => void,
 *   onEnd?: () => void,
 *   onError?: (message: string) => void,
 * }} options
 */
export async function startListening(options = {}) {
  const {
    language = 'ko-KR',
    onPartial,
    onFinal,
    onEnd,
    onError,
  } = options;

  if (isNative()) {
    await ensureNativeReady();
    await cleanupNativeListeners();

    let preferOnDevice = false;
    try {
      const od = await SpeechRecognition.isOnDeviceRecognitionAvailable({ language });
      preferOnDevice = Boolean(od?.available);
    } catch {
      preferOnDevice = false;
    }

    partialHandle = await SpeechRecognition.addListener('partialResults', (event) => {
      const text = (event.matches && event.matches[0]) || event.accumulatedText || '';
      if (!text) return;
      if (event.forced || (event.matches && event.matches.length && !event.isRestarting)) {
        // 최종에 가까운 결과도 partial로 올 수 있음 — onPartial로 흘리고 stop 시 onFinal 보정
        onPartial?.(text);
      } else {
        onPartial?.(text);
      }
    });

    listeningHandle = await SpeechRecognition.addListener('listeningState', (event) => {
      const state = event?.status || event?.state;
      if (state === 'stopped' || state === 'error') {
        onEnd?.();
      }
    });

    errorHandle = await SpeechRecognition.addListener('error', (event) => {
      const msg = event?.message || event?.error || '음성 인식 오류';
      onError?.(String(msg));
      onEnd?.();
    });

    await SpeechRecognition.start({
      language,
      maxResults: 1,
      partialResults: true,
      popup: false,
      prompt: '말씀해 주세요',
      useOnDeviceRecognition: preferOnDevice,
      allowForSilence: 1200,
    });
    return;
  }

  // Web fallback
  const WebSR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!WebSR) {
    throw new Error('이 브라우저에서는 음성 입력을 지원하지 않습니다. 앱에서 사용해 주세요.');
  }

  if (webRecognition) {
    try { webRecognition.stop(); } catch { /* ignore */ }
  }

  webRecognition = new WebSR();
  webRecognition.lang = language;
  webRecognition.continuous = false;
  webRecognition.interimResults = true;

  webRecognition.onresult = (e) => {
    let interim = '';
    let finalText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    if (interim) onPartial?.(interim);
    if (finalText) {
      onFinal?.(finalText.trim());
      onPartial?.(finalText.trim());
    }
  };
  webRecognition.onerror = (e) => {
    onError?.(e?.error || 'speech_error');
    onEnd?.();
  };
  webRecognition.onend = () => onEnd?.();
  webRecognition.start();
}

export async function stopListening() {
  if (isNative()) {
    let last = '';
    try {
      const cached = await SpeechRecognition.getLastPartialResult?.();
      last = cached?.result || cached?.text || cached?.matches?.[0] || '';
    } catch { /* ignore */ }
    try {
      await SpeechRecognition.stop();
    } catch { /* ignore */ }
    try {
      await SpeechRecognition.forceStop?.();
    } catch { /* ignore */ }
    await cleanupNativeListeners();
    return last;
  }

  if (webRecognition) {
    try { webRecognition.stop(); } catch { /* ignore */ }
    webRecognition = null;
  }
  return '';
}

export function speechPlatformLabel() {
  if (isNative()) return 'device';
  if (window.SpeechRecognition || window.webkitSpeechRecognition) return 'web';
  return 'none';
}
