/**
 * Android AICore — Prompt(S26+, nano-v3) + Rewriting(S25+ feature API)
 * Docs: https://developers.google.com/ml-kit/genai
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { buildFrontPrompt, buildBackPrompt } from './prompts.js';

const OmajuSystemLlm = registerPlugin('OmajuSystemLlm');

export const androidProvider = {
  async probe() {
    if (Capacitor.getPlatform() !== 'android') {
      return {
        available: false,
        reason: 'not_android',
        provider: 'android',
        capabilities: { prompt: 'unavailable', rewriting: 'unavailable' },
      };
    }
    try {
      const result = await OmajuSystemLlm.probe();
      const caps = result?.capabilities || {};
      return {
        available: Boolean(result?.available),
        reason: result?.reason || (result?.available ? 'ok' : 'unavailable'),
        provider: 'android',
        capabilities: {
          prompt: caps.prompt || 'unavailable',
          rewriting: caps.rewriting || 'unavailable',
        },
      };
    } catch (err) {
      return {
        available: false,
        reason: `plugin_error:${err?.message || 'unknown'}`,
        provider: 'android',
        capabilities: { prompt: 'unavailable', rewriting: 'unavailable' },
      };
    }
  },

  async generateFront({ text }) {
    try {
      // FRONT는 짧은 JSON — non-stream이 안정적
      const res = await OmajuSystemLlm.generate({
        purpose: 'front',
        prompt: buildFrontPrompt(text),
        stream: false,
      });
      return (res?.text || '').trim() || null;
    } catch (err) {
      console.warn('[OmajuSystemLlm] front failed', err);
      return null;
    }
  },

  /**
   * @param {{ facts: object, profile?: object, onChunk?: (partialText: string) => void }} args
   */
  async generateBack({ facts, profile, onChunk }) {
    let listener = null;
    try {
      if (typeof onChunk === 'function') {
        listener = await OmajuSystemLlm.addListener('promptChunk', (ev) => {
          if (ev?.purpose && ev.purpose !== 'back') return;
          if (ev?.text) onChunk(String(ev.text));
        });
      }
      const res = await OmajuSystemLlm.generate({
        purpose: 'back',
        prompt: buildBackPrompt(facts, profile),
        stream: true,
      });
      return (res?.text || '').trim() || null;
    } catch (err) {
      console.warn('[OmajuSystemLlm] back failed', err);
      return null;
    } finally {
      try {
        await listener?.remove?.();
      } catch {
        /* ignore */
      }
    }
  },

  async rewriteAnswer(text) {
    try {
      const res = await OmajuSystemLlm.rewrite({ text });
      return (res?.text || '').trim() || null;
    } catch (err) {
      console.warn('[OmajuSystemLlm] rewrite failed', err);
      return null;
    }
  },

  addDownloadListener(cb) {
    return OmajuSystemLlm.addListener('aicoreDownload', cb);
  },
};
