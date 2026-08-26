import { Capacitor } from '@capacitor/core';
import { stubProvider } from './stubProvider.js';

let cached = null;
let cachedProbe = null;

/**
 * 플랫폼별 System LLM Provider 선택.
 * Android/iOS 구현이 추가되면 여기서 연결한다.
 */
export async function getSystemLlmProvider() {
  if (cached) return cached;

  // Phase 3에서 androidProvider 동적 import 예정
  if (Capacitor.getPlatform() === 'android') {
    try {
      const mod = await import('./androidProvider.js');
      if (mod?.androidProvider) {
        cached = mod.androidProvider;
        return cached;
      }
    } catch {
      // 플러그인 미설치 시 stub
    }
  }

  if (Capacitor.getPlatform() === 'ios') {
    try {
      const mod = await import('./iosProvider.js');
      if (mod?.iosProvider) {
        cached = mod.iosProvider;
        return cached;
      }
    } catch {
      // no-op
    }
  }

  cached = stubProvider;
  return cached;
}

export async function probeSystemLlm() {
  // 가용(true)만 고정 캐시. 미가용은 매 호출 재probe (모델 다운로드 완료 등 반영)
  if (cachedProbe?.available) return cachedProbe;
  const provider = await getSystemLlmProvider();
  cachedProbe = await provider.probe();
  return cachedProbe;
}

export function resetLlmProviderCache() {
  cached = null;
  cachedProbe = null;
}
