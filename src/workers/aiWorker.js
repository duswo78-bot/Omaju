import { initEmbeddings } from './engines/embeddingEngine.js';
import { syncMyProfile } from './engines/profileEngine.js';
import { runConversationTurn } from './conversationTurn.js';

self.addEventListener('message', async (event) => {
  const { type, text, payload, requestId } = event.data;

  try {
    if (type === 'init') {
      if (payload?.userProfile || event.data?.userProfile) {
        syncMyProfile(payload?.userProfile || event.data.userProfile);
      }
      await initEmbeddings(postMessage);
      postMessage({ type: 'ready' });
      return;
    }

    if (type === 'turn' || type === 'chat') {
      const out = await runConversationTurn(text, payload);
      postMessage({
        type: 'response',
        requestId: requestId || null,
        answer: out.answer,
        templateAnswer: out.templateAnswer,
        bestAlc: out.bestAlc,
        bestSnack: out.bestSnack,
        bestGame: out.bestGame,
        recommendation: out.recommendation,
        placeSearch: out.placeSearch || null,
        facts: out.facts,
        frame: out.frame,
        semantic: out.semantic || null,
        profilePatch: out.profilePatch || null,
      });
    }
  } catch (error) {
    console.error('AI Worker Error:', error);
    postMessage({
      type: 'error',
      requestId: requestId || null,
      message: 'AI 모델 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      detail: String(error?.message || error || ''),
    });
  }
});
