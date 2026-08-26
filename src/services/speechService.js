import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

/**
 * 네이티브 STT — Android는 시스템 음성 인식 UI(popup)로 안정 동작.
 * (inline + on-device 옵션이 일부 기기에서 네이티브 크래시를 유발함)
 */

let webRecognition = null;
let nativeSessionActive = false;

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
    try {
      await SpeechRecognition.removeAllListeners();
    } catch { /* ignore */ }

    nativeSessionActive = true;

    try {
      // popup:true = Android RecognizerIntent 시스템 UI (기기 STT, 크래시 적음)
      const result = await SpeechRecognition.start({
        language,
        maxResults: 1,
        popup: true,
        partialResults: false,
        prompt: '말씀해 주세요',
      });

      const text = (result?.matches && result.matches[0]) || '';
      if (text) {
        onPartial?.(text);
        onFinal?.(text);
      }
    } catch (err) {
      const msg = err?.message || String(err) || '음성 인식 오류';
      // 사용자가 시스템 UI에서 취소한 경우는 조용히 종료
      if (!/cancel|stopped|abort/i.test(msg)) {
        onError?.(msg);
      }
    } finally {
      nativeSessionActive = false;
      onEnd?.();
    }
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
    if (!nativeSessionActive) return '';
    try {
      await SpeechRecognition.stop();
    } catch { /* ignore */ }
    try {
      await SpeechRecognition.forceStop({ timeout: 800 });
    } catch { /* ignore */ }
    nativeSessionActive = false;
    return '';
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
