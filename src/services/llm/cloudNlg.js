import { buildBackPrompt } from './prompts.js';

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * SpaceXAI(xAI) NLG — 브라우저에서 프록시로만 호출.
 * @returns {Promise<string|null>}
 */
export async function cloudNlg({ facts, profile } = {}) {
  // 명시적 설정이 있을 때만 호출 (DEV에서 /api 기본 호출 시 매 턴 실패 요청이 나감)
  const base = (import.meta.env.VITE_NLG_API_BASE || '').replace(/\/$/, '');
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/nlg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facts,
        profileName: profile?.name || null,
        prompt: buildBackPrompt(facts, profile),
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data?.answer || data?.text || '').trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
