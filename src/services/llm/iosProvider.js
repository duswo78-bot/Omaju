/**
 * iOS Foundation Models 연동 자리 (Phase 5).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { buildFrontPrompt, buildBackPrompt } from './prompts.js';

const OmajuSystemLlm = registerPlugin('OmajuSystemLlm');

export const iosProvider = {
  async probe() {
    if (Capacitor.getPlatform() !== 'ios') {
      return { available: false, reason: 'not_ios', provider: 'ios' };
    }
    try {
      const result = await OmajuSystemLlm.probe();
      return {
        available: Boolean(result?.available),
        reason: result?.reason || (result?.available ? 'ok' : 'unavailable'),
        provider: 'ios',
      };
    } catch {
      return { available: false, reason: 'plugin_missing', provider: 'ios' };
    }
  },

  async generateFront({ text }) {
    try {
      const res = await OmajuSystemLlm.generate({
        purpose: 'front',
        prompt: buildFrontPrompt(text),
      });
      return (res?.text || '').trim() || null;
    } catch {
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
    } catch {
      return null;
    }
  },
};
