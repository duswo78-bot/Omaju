/**
 * Android AICore / ML Kit GenAI Prompt API 연동 자리.
 * Phase 3에서 Capacitor 플러그인(OmajuSystemLlm)을 연결한다.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { buildFrontPrompt, buildBackPrompt } from './prompts.js';

const OmajuSystemLlm = registerPlugin('OmajuSystemLlm');

export const androidProvider = {
  async probe() {
    if (Capacitor.getPlatform() !== 'android') {
      return { available: false, reason: 'not_android', provider: 'android' };
    }
    try {
      const result = await OmajuSystemLlm.probe();
      return {
        available: Boolean(result?.available),
        reason: result?.reason || (result?.available ? 'ok' : 'unavailable'),
        provider: 'android',
      };
    } catch {
      return { available: false, reason: 'plugin_missing', provider: 'android' };
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
