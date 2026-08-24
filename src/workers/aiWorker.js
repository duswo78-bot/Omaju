import { initEmbeddings } from './engines/embeddingEngine.js';
import { initIntentEmbeddings } from './engines/intentDetector.js';
import { routeChat } from './chat/router.js';
import { setState, STATES } from './engines/stateMachine.js';
import { pushHistory } from './engines/memoryEngine.js';
import { simpleTokenize, cleanTextString } from './utils/tokenizer.js';
import emotionsDataJson from '../data/emotions.json';
import situationsDataJson from '../data/situations.json';

// 상황/감정에서 매칭된 weather/mood 키워드 추출 + 공감 오프닝 문장 선택
function detectContextSignals(text) {
  const signals = { moods: [], weather: [], matchedOpening: null, detectedEmotion: null, detectedSituation: null };
  
  // 감정 매칭 (영어 mood 값으로 출력 — DB의 item.moods 필드와 일치시킴)
  for (const emo of emotionsDataJson) {
    if (emo.keywords.some(k => text.includes(k))) {
      signals.detectedEmotion = emo;
      if (emo.id === 'emo_stress') signals.moods.push('stressed', 'friends', 'refresh');
      if (emo.id === 'emo_sad') signals.moods.push('sad', 'comfort', 'honsul');
      if (emo.id === 'emo_happy') signals.moods.push('happy', 'celebrate', 'friends');
      if (emo.id === 'emo_tired') signals.moods.push('tired', 'comfort', 'honsul');
      // 매칭된 감정의 openings 중 랜덤 하나를 공감 오프닝으로 선택
      if (emo.openings && emo.openings.length > 0) {
        signals.matchedOpening = emo.openings[Math.floor(Math.random() * emo.openings.length)];
      }
      break; // 가장 먼저 매칭된 감정 하나만
    }
  }

  // 상황 매칭 (영어 weather/mood 값으로 출력 — DB의 item.weather 필드와 일치시킴)
  for (const sit of situationsDataJson) {
    if (sit.keywords.some(k => text.includes(k))) {
      signals.detectedSituation = sit;
      if (sit.id === 'sit_rain') signals.weather.push('rain', 'humid');
      if (sit.id === 'sit_snow') signals.weather.push('cold', 'winter');
      if (sit.id === 'sit_hoesik') signals.moods.push('friends', 'celebrate');
      if (sit.id === 'sit_date') signals.moods.push('romantic', 'special');
      if (sit.id === 'sit_honsul') signals.moods.push('honsul', 'comfort');
      if (sit.id === 'sit_party') signals.moods.push('celebrate', 'friends', 'happy');
      // 상황의 오프닝이 감정보다 더 구체적이므로 덮어쓰기
      if (sit.openings && sit.openings.length > 0) {
        signals.matchedOpening = sit.openings[Math.floor(Math.random() * sit.openings.length)];
      }
      break;
    }
  }

  return signals;
}

// 오케스트레이터 이벤트 리스너
self.addEventListener('message', async (event) => {
  const { type, text, payload } = event.data;

  try {
    if (type === 'init') {
      // 1. 초기화
      await initEmbeddings(postMessage);
      await initIntentEmbeddings();
      postMessage({ type: 'ready' });
      return;
    }

    if (type === 'chat') {
      // 2. 입력 텍스트 전처리
      const currentText = text.trim();
      const uiContext = (payload?.opening || '').trim();
      const skipPrompt = Boolean(payload?.skipPrompt && uiContext);
      const enrichedText = uiContext ? `${currentText} ${uiContext}` : currentText;
      const cleanText = cleanTextString(enrichedText);
      const tokens = simpleTokenize(enrichedText);
      const signals = detectContextSignals(enrichedText);

      pushHistory('user', currentText);

      // 감정/상황 감지 시 해당 DB의 공감 오프닝 문장을 자동 연결
      let matchedOpening = signals.matchedOpening || null;

      // 3. Router 호출 (Intent 파악 및 응답 생성)
      const context = {
        tokens,
        signals,
        isLowConfidence: payload?.isLowConfidence || false,
        skipPrompt,
        matchedOpening,
        profile: payload?.profile || null,
        uiContext
      };

      const result = await routeChat(currentText, cleanText, context);

      // 4. 상태 업데이트 및 결과 반환
      setState(result.state);
      pushHistory('bot', result.answer);

      const recommendation = (result.bestAlc || result.bestSnack || result.bestGame)
        ? {
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
          }
        : null;

      postMessage({
        type: 'response',
        answer: result.answer,
        bestAlc: result.bestAlc,
        bestSnack: result.bestSnack,
        bestGame: result.bestGame,
        recommendation,
      });
    }
  } catch (error) {
    console.error('AI Worker Error:', error);
    postMessage({
      type: 'error',
      message: 'AI 모델 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});
