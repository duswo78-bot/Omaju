/**
 * Android AICore — Prompt(S26+) + Rewriting(S25+)
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
      const res = await OmajuSystemLlm.generate({
        purpose: 'front',
        prompt: buildFrontPrompt(text),
      });
      return (res?.text || '').trim() || null;
    } catch (err) {
      console.warn('[OmajuSystemLlm] front failed', err);
      return null;
    }
  },

  async generateBack({ facts, profile }) {
    try {
      const res = await OmajuSystemLlm.generate({
        purpose: 'back',
        prompt: buildBackPrompt(facts, profile),
      });
      return (res?.text || '').trim() || null;
    } catch (err) {
      console.warn('[OmajuSystemLlm] back failed', err);
      return null;
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
