import { recommend } from '../engines/recommendationEngine.js';
import { buildAnswer } from '../engines/answerBuilder.js';
import { getPendingContextText, getLastRecommendation, addRejectedItem } from '../engines/memoryEngine.js';

export async function handleReroll(text, context) {
  const lastRec = getLastRecommendation();
  if (lastRec) {
    if (lastRec.bestAlc) addRejectedItem(lastRec.bestAlc.id);
    if (lastRec.bestSnack) addRejectedItem(lastRec.bestSnack.id);
  }

  const pendingText = getPendingContextText();
  const combinedText = pendingText ? `${pendingText} ${text}` : text;
  const contextTokens = pendingText ? pendingText.split(' ').filter(Boolean) : [];
  const frame = context.frame;

  const recResult = await recommend(
    combinedText,
    context.tokens,
    contextTokens,
    context.signals,
    frame
  );

  const constraints = frame?.slots?.constraints || {};
  const wantOnlyAlc = Boolean(constraints.onlyAlcohol);
  const wantOnlySnack = Boolean(constraints.onlySnack);

  if (!recResult.bestAlc && !recResult.bestSnack) {
    const answer = buildAnswer({ intent: 'UNKNOWN' });
    return { answer, bestAlc: null, bestSnack: null, bestGame: null, state: 'IDLE' };
  }

  const answer = buildAnswer({
    intent: 'REROLL',
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    wantOnlyAlc,
    wantOnlySnack,
    skipPrompt: false,
    matchedOpening: null,
    profile: context.profile,
  });

  const reasonParts = [];
  if (recResult.bestAlc) reasonParts.push(recResult.bestAlc.name_ko);
  if (recResult.bestSnack) reasonParts.push(recResult.bestSnack.name_ko);

  return {
    answer,
    bestAlc: recResult.bestAlc,
    bestSnack: recResult.bestSnack,
    bestGame: recResult.bestGame,
    reason: reasonParts.length ? `다른 조합 · ${reasonParts.join(' + ')}` : null,
    state: 'AWAITING_REC_CONFIRM',
  };
}
