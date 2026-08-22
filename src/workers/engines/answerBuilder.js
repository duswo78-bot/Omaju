import { pickRandom } from '../utils/random.js';
import comboTemplates from '../templates/combo.json';
import alcoholTemplates from '../templates/alcohol.json';
import snackTemplates from '../templates/snack.json';
import greetingTemplates from '../templates/greeting.json';
import thanksTemplates from '../templates/thanks.json';
import rerollTemplates from '../templates/reroll.json';
import smalltalkTemplates from '../templates/smalltalk.json';
import unknownTemplates from '../templates/unknown.json';
import questionTemplates from '../templates/question.json';
import gameTemplates from '../templates/game.json';

// Helper to replace template variables
function formatTemplate(template, bestAlc, bestSnack, bestGame) {
  let text = template;
  if (bestAlc) {
    const alcTags = [...bestAlc.tags].sort(() => 0.5 - Math.random()).slice(0, 2);
    const abvInfo = bestAlc.abv > 0 ? `(도수 ${bestAlc.abv}%)` : '(논알콜)';
    const priceEmoji = bestAlc.priceLevel <= 1 ? '💰' : bestAlc.priceLevel <= 2 ? '💰💰' : '💰💰💰';
    
    text = text.replace(/\{alcName\}/g, bestAlc.name_ko)
               .replace(/\{a0\}/g, alcTags[0] || '')
               .replace(/\{a1\}/g, alcTags[1] || alcTags[0] || '')
               .replace(/\{abvInfo\}/g, abvInfo)
               .replace(/\{priceEmoji\}/g, priceEmoji);
  }
  
  if (bestSnack) {
    const snkTags = [...bestSnack.tags].sort(() => 0.5 - Math.random()).slice(0, 2);
    // priceLevel field is missing from snacks, just use default
    const priceEmoji = '💰💰';

    text = text.replace(/\{snkName\}/g, bestSnack.name_ko)
               .replace(/\{s0\}/g, snkTags[0] || '')
               .replace(/\{s1\}/g, snkTags[1] || snkTags[0] || '')
               .replace(/\{priceEmoji\}/g, priceEmoji);
  }

  if (bestGame) {
    text = text.replace(/\{gameName\}/g, bestGame.name)
               .replace(/\{gameDesc\}/g, bestGame.description || '재미있는 게임입니다!');
  }
  
  return text;
}

export function buildAnswer({ intent, bestAlc, bestSnack, bestGame, wantOnlyAlc, wantOnlySnack, skipPrompt, matchedOpening }) {
  let empathy = "";
  let reason = "";
  let explanation = "";
  let closing = "";

  // 1. 공감 (Empathy) & 도입부
  if (matchedOpening && !skipPrompt) {
    empathy = matchedOpening;
  } else if (skipPrompt && intent === 'RECOMMEND') {
    const skipIntros = ["좋습니다! 바로 준비해 드릴게요. 🍸", "오마카세 모드 발동! 🚀"];
    empathy = pickRandom(skipIntros);
  }

  // 2. 추천 이유 및 페어링 설명 (Reason & Explanation)
  switch (intent) {
    case 'GREETING':
      explanation = pickRandom(greetingTemplates);
      break;
    case 'THANKS':
      explanation = pickRandom(thanksTemplates);
      break;
    case 'QUESTION':
      explanation = pickRandom(questionTemplates);
      break;
    case 'REROLL':
      explanation = pickRandom(rerollTemplates);
      // 재추천의 경우 explanation 뒤에 추천 멘트가 붙을 수 있음
      if (bestAlc && bestSnack) explanation += " " + formatTemplate(pickRandom(comboTemplates), bestAlc, bestSnack, bestGame);
      break;
    case 'SMALLTALK':
      explanation = pickRandom(smalltalkTemplates);
      break;
    case 'UNKNOWN':
      explanation = pickRandom(unknownTemplates);
      break;
    case 'RECOMMEND':
    default:
      if (bestAlc && bestSnack) {
        explanation = formatTemplate(pickRandom(comboTemplates), bestAlc, bestSnack, bestGame);
      } else if (bestAlc && wantOnlyAlc) {
        explanation = formatTemplate(pickRandom(alcoholTemplates), bestAlc, null, bestGame);
      } else if (bestSnack && wantOnlySnack) {
        explanation = formatTemplate(pickRandom(snackTemplates), null, bestSnack, bestGame);
      }
      
      // 게임 추천이 있으면 텍스트에 덧붙임
      if (bestGame) {
        closing = formatTemplate(pickRandom(gameTemplates), null, null, bestGame);
      }
      break;
  }

  // 3. 마무리 (Closing)
  // 게임 등 추가 제안이 있으면 closing에 들어감

  // 조립
  let finalAnswer = [empathy, reason, explanation, closing].filter(part => part.trim().length > 0).join('\n\n');
  return finalAnswer;
}
