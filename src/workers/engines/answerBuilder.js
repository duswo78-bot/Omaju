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
import offtopicTemplates from '../templates/offtopic.json';
import guideTemplates from '../templates/guide.json';
import complaintTemplates from '../templates/complaint.json';
import moodTemplates from '../templates/mood.json';
import goodbyeTemplates from '../templates/goodbye.json';
import denyTemplates from '../templates/deny.json';
import { composeGuideAnswer } from '../utils/composeGuide.js';

// Helper to replace template variables
function formatTemplate(template, bestAlc, bestSnack, bestGame) {
  let text = template;
  if (bestAlc) {
    const alcTags = [...(bestAlc.tags || [])].sort(() => 0.5 - Math.random()).slice(0, 2);
    const abvInfo = bestAlc.abv > 0 ? `(도수 ${bestAlc.abv}%)` : '(논알콜)';
    const priceEmoji = bestAlc.priceLevel <= 1 ? '💰' : bestAlc.priceLevel <= 2 ? '💰💰' : '💰💰💰';
    
    text = text.replace(/\{alcName\}/g, bestAlc.name_ko)
               .replace(/\{a0\}/g, alcTags[0] || '')
               .replace(/\{a1\}/g, alcTags[1] || alcTags[0] || '')
               .replace(/\{abvInfo\}/g, abvInfo)
               .replace(/\{priceEmoji\}/g, priceEmoji);
  }
  
  if (bestSnack) {
    const snkTags = [...(bestSnack.tags || [])].sort(() => 0.5 - Math.random()).slice(0, 2);
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

const targetedSnackTemplates = [
  "선택하신 **{alcName}**에 딱 어울리는 안주로 **{snkName}**을(를) 추천해 드려요! {s0} 매력이 {a0} 술맛과 찰떡궁합이거든요. 🍽️",
  "**{alcName}** {abvInfo}과(와) 함께라면 **{snkName}**이(가) 최고의 짝꿍이죠! {s0} 안주가 술의 풍미를 한층 더 살려줄 거예요.",
  "오늘의 {alcName} 페어링 픽은 바로 **{snkName}**입니다! 🍷 {s0} 맛이 어우러져서 기분 좋게 즐기실 수 있어요.",
  "**{alcName}** 안주 고민 끝! **{snkName}** 한 접시 곁들여 보세요. {s0} 감칠맛이 {a0} 술맛을 200% 끌어올려 줍니다. ✨",
  "지금 고르신 **{alcName}**에는 무조건 **{snkName}** 조합을 추천합니다! {s0} 매력이 입안을 꽉 채워줄 거예요.",
  "**{alcName}**에 곁들일 훌륭한 안주를 찾으셨군요! **{snkName}**이(가) 제격입니다. {s0} 풍미가 술맛을 완벽하게 받쳐줄 거예요.",
];

export function buildAnswer({ intent, bestAlc, bestSnack, bestGame, wantOnlyAlc, wantOnlySnack, isTargetedSnack, skipPrompt, matchedOpening, profile }) {
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

  // 프로필 기반 개인화 인사 추가 (최초 1회성이나 랜덤)
  if (profile && profile.name) {
    if (empathy && Math.random() > 0.3) {
      empathy = `${profile.name}님, ${empathy}`;
    } else if (!empathy) {
      empathy = `${profile.name}님!`;
    }
  }

  // MBTI 타입별 특징 힌트 (단정 금지, 경향 표현)
  if (profile?.mbtiTrait && (intent === 'RECOMMEND' || intent === 'REROLL') && Math.random() > 0.35) {
    const t = profile.mbtiTrait;
    const code = t.code || profile.mbti?.toUpperCase();
    const label = t.label || '';
    const tip = t.tip || '';
    const mbtiMsg = tip
      ? `\n(${code}${label ? ` · ${label}` : ''}: ${tip})`
      : `\n(${code} 경향을 살짝 반영해 골랐어요.)`;
    empathy = empathy ? `${empathy}${mbtiMsg}` : mbtiMsg.trim();
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
      if (bestAlc && bestSnack) {
        if (isTargetedSnack) {
          explanation += " " + formatTemplate(pickRandom(targetedSnackTemplates), bestAlc, bestSnack, bestGame);
        } else {
          explanation += " " + formatTemplate(pickRandom(comboTemplates), bestAlc, bestSnack, bestGame);
        }
      }
      break;
    case 'SMALLTALK':
      explanation = pickRandom(smalltalkTemplates);
      break;
    case 'MOOD':
      explanation = pickRandom(
        Array.isArray(moodTemplates) ? moodTemplates : moodTemplates.ask || moodTemplates.empathy || []
      );
      break;
    case 'GOODBYE':
      explanation = pickRandom(goodbyeTemplates);
      break;
    case 'UNKNOWN':
      explanation = pickRandom(unknownTemplates);
      break;
    case 'OFFTOPIC':
      explanation = pickRandom(offtopicTemplates);
      break;
    case 'COMPLAINT':
      explanation = pickRandom(complaintTemplates);
      break;
    case 'DENY':
      explanation = pickRandom(denyTemplates);
      break;
    case 'GUIDE':
      explanation = composeGuideAnswer(guideTemplates.general);
      break;
    case 'RECOMMEND':
    default:
      if (bestAlc && bestSnack) {
        if (isTargetedSnack) {
          explanation = formatTemplate(pickRandom(targetedSnackTemplates), bestAlc, bestSnack, bestGame);
        } else {
          explanation = formatTemplate(pickRandom(comboTemplates), bestAlc, bestSnack, bestGame);
        }
      } else if (bestAlc && wantOnlyAlc) {
        explanation = formatTemplate(pickRandom(alcoholTemplates), bestAlc, null, bestGame);
      } else if (bestSnack && wantOnlySnack) {
        explanation = formatTemplate(pickRandom(snackTemplates), null, bestSnack, bestGame);
      }
      
      // 프로필 취향 반영 문구 추가 (랜덤)
      if (profile) {
        if (profile.favoriteDrink && bestAlc && Math.random() > 0.5) {
          reason = `(평소 ${profile.favoriteDrink}을(를) 좋아하시는 취향을 고려해 골라봤어요!)`;
        } else if (profile.favoriteSnack && bestSnack && Math.random() > 0.5) {
          reason = `(평소 ${profile.favoriteSnack}을(를) 즐기시니 이 안주도 맘에 드실 거예요!)`;
        }
      }
      
      // 게임 추천이 있으면 텍스트에 덧붙임
      if (bestGame) {
        closing = formatTemplate(pickRandom(gameTemplates), null, null, bestGame);
      }
      break;
  }

  // 3. 마무리 (Closing)
  // 조립
  let finalAnswer = [empathy, reason, explanation, closing].filter(part => part.trim().length > 0).join('\n\n');
  return finalAnswer;
}
