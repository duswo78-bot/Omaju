/** 시스템 온디바이스 LLM 미가용 시 Provider */

export const stubProvider = {
  async probe() {
    return { available: false, reason: 'no_system_llm', provider: 'stub' };
  },
  async generateFront() {
    return null;
  },
  async generateBack() {
    return null;
  },
};
