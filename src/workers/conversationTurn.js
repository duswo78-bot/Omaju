import { routeChat } from './chat/router.js';
import { setState, resetState } from './engines/stateMachine.js';
import {
  pushHistory,
  getHistory,
  getLastRecommendation,
  applyDialogueContextToFrame,
  clearConversationMemory,
} from './engines/memoryEngine.js';
import { simpleTokenize, cleanTextString } from './utils/tokenizer.js';
import { buildNluFrame } from './nlu/validate.js';
import alcoholsData from '../data/alcohols.json';
import snacksData from '../data/snacks.json';
import { syncMyProfile, getLearnedProfilePatch } from './engines/profileEngine.js';
import { getMbtiTrait } from '../data/mbtiTraits.js';
import {
  annotateGlossary,
  buildSemanticFrame,
  inheritDialogueState,
  updateDialogueStateFromFrame,
  resetDialogueState,
  getDialogueState,
  getLastBotAsk,
} from './semantic/index.js';

function resolveIdsFromHints(frame) {
  if (!frame?.slots) return;
  const alcHints = frame.slots.alcoholHints || [];
  const snkHints = frame.slots.snackHints || [];
  const alcoholIds = [];
  const snackIds = [];
  for (const h of alcHints) {
    for (const a of alcoholsData) {
      if (a.category === h || a.name_ko?.includes(h) || (a.tags || []).some((t) => String(t).includes(h))) {
        alcoholIds.push(a.id);
      }
    }
  }
  for (const h of snkHints) {
    for (const s of snacksData) {
      if (s.category === h || s.name_ko?.includes(h)) snackIds.push(s.id);
    }
  }
  frame.resolved = {
    alcoholIds: [...new Set([...(frame.resolved?.alcoholIds || []), ...alcoholIds])].slice(0, 12),
    snackIds: [...new Set([...(frame.resolved?.snackIds || []), ...snackIds])].slice(0, 24),
  };
}

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

/** 시나리오/테스트용 대화 상태 초기화 */
export function resetConversation() {
  resetDialogueState();
  clearConversationMemory();
  resetState();
}

/**
 * 한 턴 실행 (Worker와 시뮬이 공유)
 * @param {string} text
 * @param {object} [payload]
 */
export async function runConversationTurn(text, payload = {}) {
  const synced = syncMyProfile(payload?.profile || null);

  const currentText = (text || '').trim();
  const uiContext = (payload?.opening || '').trim();
  const skipPrompt = Boolean(payload?.skipPrompt && uiContext);
  const enrichedText = uiContext ? `${currentText} ${uiContext}` : currentText;
  const cleanText = cleanTextString(enrichedText);
  const tokens = simpleTokenize(enrichedText);

  const frame = buildNluFrame(enrichedText, cleanText, payload?.frontDraft, {
    historyLength: getHistory().length,
    hasPreviousRecommendation: Boolean(getLastRecommendation()),
  });
  applyDialogueContextToFrame(frame);
  resolveIdsFromHints(frame);
  if (frame.slots?.mbti) {
    synced.mbti = frame.slots.mbti;
    synced.mbtiTrait = getMbtiTrait(frame.slots.mbti);
  }

  const glossary = annotateGlossary(enrichedText);
  let semantic = buildSemanticFrame(frame, glossary);
  semantic = inheritDialogueState(semantic);

  if (semantic.weather?.length) {
    frame.slots.weather = [...new Set([...(frame.slots.weather || []), ...semantic.weather])];
  }
  if (semantic.catalogMoods?.length || semantic.emotionLabels?.length) {
    frame.slots.moods = [
      ...new Set([
        ...(frame.slots.moods || []),
        ...(semantic.catalogMoods || []),
        ...(semantic.emotionLabels || []),
      ]),
    ];
  }
  if (semantic.energy === 'low' && !(frame.slots.constraints || {}).light) {
    frame.slots.constraints = { ...(frame.slots.constraints || {}), light: true };
  }
  if (semantic.constraints?.onlySnack) {
    frame.slots.constraints = { ...(frame.slots.constraints || {}), onlySnack: true };
  }
  if (semantic.constraints?.nonAlcoholic) {
    frame.slots.constraints = { ...(frame.slots.constraints || {}), nonAlcoholic: true };
  }
  updateDialogueStateFromFrame(semantic);

  if (
    synced?.mbtiTrait?.moods?.length &&
    (!frame.slots.moods || frame.slots.moods.length === 0) &&
    !synced?.favoriteDrink &&
    (frame.intent === 'GUIDE' || frame.intent === 'RECOMMEND')
  ) {
    frame.slots.moods = [...synced.mbtiTrait.moods];
  }
  if (frame.intent === 'GUIDE' && (!frame.guideHint || frame.guideHint === 'general') && synced?.mbtiTrait?.guideHint) {
    frame.guideHint = synced.mbtiTrait.guideHint;
  }

  const signals = {
    moods: frame.slots.moods || [],
    weather: frame.slots.weather || [],
    energy: semantic.energy || null,
    relation: semantic.relation || null,
    matchedOpening: frame.matchedOpening,
  };

  pushHistory('user', currentText);

  const context = {
    tokens,
    signals,
    frame,
    semantic,
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
  facts.dialogueNotes = frame.dialogueNotes || [];
  facts.exclude = frame.slots?.constraints?.exclude || frame.dialogueExclude || [];
  facts.semantic = {
    weather: semantic.weather,
    mood: semantic.mood,
    energy: semantic.energy,
    relation: semantic.relation,
    openToRecommend: semantic.openToRecommend,
  };

  return {
    answer: result.answer,
    templateAnswer: result.answer,
    bestAlc: result.bestAlc,
    bestSnack: result.bestSnack,
    bestGame: result.bestGame,
    recommendation,
    placeSearch: result.placeSearch || null,
    facts,
    profilePatch: getLearnedProfilePatch(),
    frame: {
      intent: frame.intent,
      confidence: frame.confidence,
      source: frame.source,
      slots: frame.slots,
    },
    semantic: {
      weather: semantic.weather,
      mood: semantic.mood,
      energy: semantic.energy,
      relation: semantic.relation,
      openToRecommend: semantic.openToRecommend,
      intent: semantic.intent,
      catalogMoods: semantic.catalogMoods,
    },
    dialogue: getDialogueState(),
    lastBotAsk: getLastBotAsk(),
    state: result.state,
  };
}
