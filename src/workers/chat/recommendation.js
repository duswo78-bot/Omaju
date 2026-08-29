import { recommend } from '../engines/recommendationEngine.js';
import { buildAnswer } from '../engines/answerBuilder.js';
import { updateProfile } from '../engines/profileEngine.js';
import { getLastRecommendation, setLastRecommendation } from '../engines/memoryEngine.js';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import gamesData from '../../data/games.json';

export async function handleRecommendation(text, cleanText, context) {
  updateProfile(text, alcoholsData, snacksData, gamesData);

  const lastRec = getLastRecommendation();
  let contextKeywords = '';

  const frame = context.frame;
  const hasNewAlc = (frame?.slots?.alcoholHints || []).length > 0;

  const constraints = frame?.slots?.constraints || {};
  const wantOnlySnack =
    Boolean(constraints.onlySnack) ||
    /안주만|음식만|야식만|밥만|디저트만|간식만/.test(cleanText) ||
    /^(?:안주|음식|야식|간식|디저트)(?:만|요|만요)?$/.test(cleanText);
  const wantOnlyAlc = Boolean(constraints.onlyAlcohol) && !wantOnlySnack;

  if (!hasNewAlc && lastRec && lastRec.bestAlc && !wantOnlySnack) {
    contextKeywords += ` ${lastRec.bestAlc.category} ${lastRec.bestAlc.name_ko}`;
  }

  const uiContext = wantOnlySnack ? '' : (context.uiContext || '');
  const combinedText = `${cleanText} ${contextKeywords} ${uiContext}`.trim();
  const contextTokens = `${contextKeywords} ${uiContext}`.split(' ').filter(Boolean);

  const signals = {
    ...(context.signals || {}),
    energy: context.semantic?.energy || context.signals?.energy || null,
    relation: context.semantic?.relation || context.signals?.relation || null,
    moods: [
      ...(context.signals?.moods || []),
      ...(context.semantic?.catalogMoods || []),
    ],
    weather: [
      ...(context.signals?.weather || []),
      ...(context.semantic?.weather || []),
    ],
  };

  const recResult = await recommend(
    combinedText,
    context.tokens,
    contextTokens,
    signals,
    frame
  );

  if (wantOnlySnack) {
    recResult.bestAlc = null;
  }
  if (wantOnlyAlc) {
    recResult.bestSnack = null;
  }

  setLastRecommendation({ bestAlc: recResult.bestAlc, bestSnack: recResult.bestSnack });

  const hasExplicitAlc = !wantOnlySnack && ((frame?.slots?.alcoholHints || []).length > 0 || (frame?.resolved?.alcoholIds || []).length > 0 || Boolean(context.uiContext));
  const hasExplicitSnack = (frame?.slots?.snackHints || []).length > 0 || (frame?.resolved?.snackIds || []).length > 0;
  const isTargetedSnack = Boolean(!wantOnlySnack && recResult.bestAlc && recResult.bestSnack && (hasExplicitAlc || context.uiContext));

  if (!recResult.bestAlc && !recResult.bestSnack) {
    const answer = buildAnswer({ intent: 'UNKNOWN' });
    return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'IDLE' };
  }

  const isAlone =
    signals.relation === 'alone' ||
    (signals.moods || []).includes('honsul') ||
    /혼자|혼술|혼맥|혼소/.test(cleanText);

  const answer = buildAnswer({
    intent: 'RECOMMEND',
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    bestGame: recResult.bestGame,
    wantOnlyAlc,
    wantOnlySnack,
    isTargetedSnack,
    isAlone,
    skipPrompt: context.skipPrompt,
    matchedOpening: frame?.matchedOpening || context.matchedOpening,
    profile: context.profile,
  });

  const reasonParts = [];
  if (recResult.bestAlc) {
    reasonParts.push(
      `${recResult.bestAlc.name_ko}${recResult.bestAlc.abv > 0 ? ` (${recResult.bestAlc.abv}%)` : ''}`
    );
  }
  if (recResult.bestSnack) reasonParts.push(recResult.bestSnack.name_ko);
  if (context.uiContext) reasonParts.push('테이블 선택 맥락 반영');

  return {
    answer,
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    bestGame: recResult.bestGame,
    reason: reasonParts.join(' · ') || null,
    state: 'AWAITING_REC_CONFIRM',
  };
}
