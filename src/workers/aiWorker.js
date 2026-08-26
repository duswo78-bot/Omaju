import { initEmbeddings } from './engines/embeddingEngine.js';
import { routeChat } from './chat/router.js';
import { setState } from './engines/stateMachine.js';
import { pushHistory } from './engines/memoryEngine.js';
import { simpleTokenize, cleanTextString } from './utils/tokenizer.js';
import { buildNluFrame } from './nlu/validate.js';
import { syncMyProfile } from './engines/profileEngine.js';

function buildRecommendation(result) {
  if (!(result.bestAlc || result.bestSnack || result.bestGame)) return null;
  return {
    alcohol: result.bestAlc
      ? {
          id: result.bestAlc.id,
          name_ko: result.bestAlc.name_ko,
          category: result.bestAlc.category,
          abv: result.bestAlc.abv,
          tags: (result.bestAlc.tags || []).slice(0, 3),
        }
      : null,
    snack: result.bestSnack
      ? {
          id: result.bestSnack.id,
          name_ko: result.bestSnack.name_ko,
          category: result.bestSnack.category,
          tags: (result.bestSnack.tags || []).slice(0, 3),
        }
      : null,
    game: result.bestGame
      ? {
          id: result.bestGame.id,
          name: result.bestGame.name,
          description: result.bestGame.description || '',
        }
      : null,
    reason: result.reason || null,
  };
}

function buildFacts(result, frame) {
  const includeGame = Boolean(frame?.slots?.wantGame);
  return {
    intent: frame?.intent || null,
    alcohol: result.bestAlc
      ? {
          id: result.bestAlc.id,
          name_ko: result.bestAlc.name_ko,
          category: result.bestAlc.category,
          abv: result.bestAlc.abv,
        }
      : null,
    snack: result.bestSnack
      ? {
          id: result.bestSnack.id,
          name_ko: result.bestSnack.name_ko,
          category: result.bestSnack.category,
        }
      : null,
    // NLG 환각 방지: 게임 미요청 시 facts에서 제외 (카드 노출은 recommendation에서 별도)
    game:
      includeGame && result.bestGame
        ? { id: result.bestGame.id, name: result.bestGame.name }
        : null,
    reason: result.reason || null,
    moods: frame?.slots?.moods || [],
    weather: frame?.slots?.weather || [],
    matchedOpening: frame?.matchedOpening || null,
  };
}

async function handleTurn(text, payload = {}) {
  // MY 프로필 → Worker 추천 프로필 동기화 (MBTI/주종/주량 포함)
  const synced = syncMyProfile(payload?.profile || null);

  const currentText = (text || '').trim();
  const uiContext = (payload?.opening || '').trim();
  const skipPrompt = Boolean(payload?.skipPrompt && uiContext);
  const enrichedText = uiContext ? `${currentText} ${uiContext}` : currentText;
  const cleanText = cleanTextString(enrichedText);
  const tokens = simpleTokenize(enrichedText);

  const frame = buildNluFrame(enrichedText, cleanText, payload?.frontDraft);

  // MBTI mood 시드: 빈칸 prior만. MY 주종·이미 mood가 있으면 개입하지 않음
  if (
    synced?.mbtiTrait?.moods?.length &&
    (!frame.slots.moods || frame.slots.moods.length === 0) &&
    !synced?.favoriteDrink &&
    (frame.intent === 'GUIDE' || frame.intent === 'RECOMMEND')
  ) {
    frame.slots.moods = [...synced.mbtiTrait.moods];
  }
  // GUIDE인데 힌트가 general이면 MBTI 기본 가이드 힌트 사용
  if (frame.intent === 'GUIDE' && (!frame.guideHint || frame.guideHint === 'general') && synced?.mbtiTrait?.guideHint) {
    frame.guideHint = synced.mbtiTrait.guideHint;
  }

  const signals = {
    moods: frame.slots.moods || [],
    weather: frame.slots.weather || [],
    matchedOpening: frame.matchedOpening,
  };

  pushHistory('user', currentText);

  const context = {
    tokens,
    signals,
    frame,
    isLowConfidence: payload?.isLowConfidence || false,
    skipPrompt,
    matchedOpening: frame.matchedOpening || null,
    profile: { ...(payload?.profile || {}), ...synced, mbtiTrait: synced?.mbtiTrait },
    uiContext,
  };

  const result = await routeChat(currentText, cleanText, context);
  setState(result.state);
  pushHistory('bot', result.answer);

  const recommendation = buildRecommendation(result);
  const facts = buildFacts(result, frame);

  return {
    answer: result.answer,
    templateAnswer: result.answer,
    bestAlc: result.bestAlc,
    bestSnack: result.bestSnack,
    bestGame: result.bestGame,
    recommendation,
    facts,
    frame: {
      intent: frame.intent,
      confidence: frame.confidence,
      source: frame.source,
      slots: frame.slots,
    },
  };
}

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

    // 신규: 메인 스레드 오케스트레이터용
    if (type === 'turn' || type === 'chat') {
      const out = await handleTurn(text, payload);
      postMessage({
        type: 'response',
        requestId: requestId || null,
        answer: out.answer,
        templateAnswer: out.templateAnswer,
        bestAlc: out.bestAlc,
        bestSnack: out.bestSnack,
        bestGame: out.bestGame,
        recommendation: out.recommendation,
        facts: out.facts,
        frame: out.frame,
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
