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

function attachParticle(word, withFinal, withoutFinal) {
  if (!word) return '';
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const hasFinal = (code - 0xAC00) % 28 !== 0;
    return `${word}${hasFinal ? withFinal : withoutFinal}`;
  }
  return `${word}${withoutFinal}`;
}
const eulLeul = (w) => attachParticle(w, '을', '를');
const eunNeun = (w) => attachParticle(w, '은', '는');
const gwaWa = (w) => attachParticle(w, '과', '와');

// Helper to replace template variables
function formatTemplate(template, bestAlc, bestSnack, bestGame, wantOnlySnack = false) {
  let text = template;
  if (bestAlc && !wantOnlySnack) {
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
    let snkTags = [...(bestSnack.tags || [])].sort(() => 0.5 - Math.random());
    if (wantOnlySnack || !bestAlc) {
      snkTags = snkTags.filter((t) => !/맥주|소주|와인|위스키|막걸리|하이볼|사케|백주|보드카|술/.test(t));
    }
    const s0 = snkTags[0] || '맛있는';
    const s1 = snkTags[1] || s0;
    const priceEmoji = '💰💰';

    text = text.replace(/\{snkName\}/g, bestSnack.name_ko)
               .replace(/\{s0\}/g, s0)
               .replace(/\{s1\}/g, s1)
               .replace(/\{priceEmoji\}/g, priceEmoji);
  }

  if (bestGame) {
    text = text.replace(/\{gameName\}/g, bestGame.name || '술자리 미니게임')
               .replace(/\{gameDesc\}/g, bestGame.description || '재미있게 즐겨보세요!');
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
  "골라두신 **{alcName}**의 매력을 극대화해 줄 파트너, **{snkName}**입니다! 실패 없는 정석 궁합이에요. 👍",
  "**{alcName}** {abvInfo} 한 잔엔 역시 **{snkName}** 한 점! 술 한 모금, 안주 한 입에 행복해지는 조합입니다. 😋",
  "선택하신 **{alcName}**에 가장 잘 어울리는 밸런스 픽은 **{snkName}**이에요. 깔끔하게 즐기실 수 있을 거예요.",
  "**{alcName}**을(를) 더 맛있게 즐기는 비결! 바로 **{snkName}**과의 페어링입니다. 꼭 같이 곁들여 보세요. 🌟",
];

const declineAlcoholTemplates = [
  "오늘은 술 없이 편안하게 쉬어가는 날이군요! 🍵 푹 쉬면서 충전하는 시간도 정말 소중하죠.\n\n혹시 시원한 무알콜 음료나 달콤한 디저트/야식이 필요하시면 언제든 말씀해 주세요!",
  "술 생각이 전혀 안 나는 날엔 굳이 무리해서 마실 필요 전혀 없죠! 😊\n\n원하시면 속 편한 맛있는 식사 메뉴나 깔끔한 논알콜 음료로 기분 전환하실 수 있게 골라드릴게요.",
  "금주와 휴식 모드, 적극 응원합니다! 🌿\n\n오늘 밤은 편안하고 따뜻하게 푹 쉬어보세요. 맛있는 야식이나 시원한 음료가 생각나면 언제든 불러주세요!",
  "술은 패스하고 힐링 모드로 가시는군요! 🛋️\n\n속 편안한 따뜻한 티나 논알콜 칵테일, 혹은 든든한 안주/간식이 당기시면 말씀해 주세요.",
  "오늘은 간에게 꿀 같은 휴식을 선물하는 날이네요. 🍯\n\n술 대신 기분 낼 수 있는 달콤한 간식이나 시원한 에이드는 어떠세요?",
  "알콜 프리 데이, 아주 좋습니다! ✨\n\n맛있는 음식에 집중하고 싶으시다면 입맛 돋우는 꿀맛 메뉴들만 쏙쏙 뽑아드릴게요.",
  "술 없는 하루도 얼마든지 풍성하고 즐거울 수 있죠. ☕\n\n혹시 입이 심심하시거나 당 충전이 필요하시면 언제든 메뉴 추천을 요청해 주세요!",
  "건강 챙기며 쉬어가는 센스, 최고예요! 👏\n\n술 없이도 분위기 낼 수 있는 무알콜 꿀조합이 궁금하시면 편하게 말씀해 주세요.",
  "몸과 마음을 리프레시하는 소중한 시간! 🍃\n\n속에 부담 없는 든든한 야식이나 상큼한 과일 음료가 당기시면 바로 찾아드릴게요.",
  "오늘은 가볍게 릴랙스하는 무드군요. 🧘\n\n맛있는 먹거리나 디저트 조합이 필요하시면 언제든 알려주세요. 딱 맞게 골라드릴게요!",
  "술 생각 없는 날엔 따뜻한 차 한 잔이나 맛있는 간식으로 소확행을 챙겨보세요. 🫖\n\n안주 메뉴만 따로 구경하고 싶으시면 말씀해 주세요!",
  "무리하지 않고 쉬어가는 것이 최고의 컨디션 관리죠! 👍\n\n시원한 음료수나 든든한 한 끼 메뉴가 필요하시면 언제든 찾아주세요.",
];

const honsulComboTemplates = [
  "혼자만의 편안한 시간을 위해 **{alcName}** {abvInfo}과(와) **{snkName}**을(를) 추천해 드려요! 🕯️ 번잡함 없이 온전히 나에게 집중하는 힐링 조합이에요.",
  "오늘 혼술의 주인공은 **{alcName}**! 여기에 부담 없는 **{snkName}** 한 입 곁들이면 하루 피로가 싹 풀릴 거예요. 🌿",
  "혼자 즐기기 딱 좋은 꿀조합! **{alcName}** 한 잔에 **{snkName}** 곁들여서 느긋하게 즐겨보세요. {s0} 매력이 {a0} 술맛과 아주 잘 어울립니다.",
  "조용히 한 잔 기울이고 싶은 날엔 **{alcName}**에 **{snkName}**만 한 게 없죠. 🍷 소소하지만 확실한 행복을 느껴보세요.",
  "오늘 밤 나를 위한 특별한 선물! **{alcName}** {abvInfo} 한 잔과 찰떡인 **{snkName}** 조합으로 하루를 기분 좋게 마무리해 보세요.",
  "혼술러를 위한 취향 저격 페어링! **{alcName}**의 깊은 맛과 **{snkName}**의 감칠맛이 나만의 시간을 더 특별하게 만들어줄 거예요. ✨",
  "방해받지 않고 내 속도대로 즐기는 밤! **{alcName}** 한 모금에 **{snkName}** 한 입이면 남부러울 게 없죠. 🛋️",
  "자취방이나 거실에서 아늑하게 즐기는 1인 픽! **{alcName}** {abvInfo}과(와) **{snkName}**의 조화가 아주 훌륭합니다.",
  "퇴근 후 온전한 휴식을 채워줄 한 잔, **{alcName}** & **{snkName}** 조합을 추천합니다. 오늘 하루도 정말 고생 많으셨어요! 🌙",
  "혼자서도 분위기 제대로 내기! **{alcName}**에 깔끔한 **{snkName}**을(를) 곁들여 낭만적인 홈술 시간을 만끽해 보세요. 🥂",
  "부담 없이 가볍게 힐링할 수 있는 **{alcName}**과(와) **{snkName}** 조합이에요. 잔잔한 음악이나 영상과 함께 즐겨보세요. 🎶",
  "오늘 밤의 작은 사치! **{alcName}** {abvInfo} 한 잔과 정갈한 **{snkName}**으로 나만의 홈바를 완성해 보세요. 🍸",
];

export function buildAnswer({ intent, bestAlc, bestSnack, bestGame, wantOnlyAlc, wantOnlySnack, isTargetedSnack, isAlone, skipPrompt, matchedOpening, profile }) {
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

  // MBTI 타입별 특징 힌트 (단정 금지, 경향 표현 — matchedOpening에 이미 있으면 중복 방지)
  const mbtiCode = profile?.mbtiTrait?.code || profile?.mbti?.toUpperCase();
  if (
    profile?.mbtiTrait &&
    (intent === 'RECOMMEND' || intent === 'REROLL') &&
    !(matchedOpening && mbtiCode && matchedOpening.toUpperCase().includes(mbtiCode)) &&
    Math.random() > 0.35
  ) {
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
    case 'DECLINE_ALCOHOL':
      explanation = pickRandom(declineAlcoholTemplates);
      break;
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
        } else if (isAlone) {
          explanation += " " + formatTemplate(pickRandom(honsulComboTemplates), bestAlc, bestSnack, bestGame);
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
      if (bestAlc && bestSnack && !wantOnlySnack && !wantOnlyAlc) {
        if (isTargetedSnack) {
          explanation = formatTemplate(pickRandom(targetedSnackTemplates), bestAlc, bestSnack, bestGame);
        } else if (isAlone) {
          explanation = formatTemplate(pickRandom(honsulComboTemplates), bestAlc, bestSnack, bestGame);
        } else {
          explanation = formatTemplate(pickRandom(comboTemplates), bestAlc, bestSnack, bestGame);
        }
      } else if (bestSnack && (wantOnlySnack || !bestAlc)) {
        explanation = formatTemplate(pickRandom(snackTemplates), null, bestSnack, bestGame, true);
      } else if (bestAlc && (wantOnlyAlc || !bestSnack)) {
        explanation = formatTemplate(pickRandom(alcoholTemplates), bestAlc, null, bestGame, false);
      }
      
      // 프로필 취향 반영 문구 추가 (일치 여부에 따라 자연스러운 연결 문구 생성)
      if (profile) {
        if (profile.favoriteDrink && bestAlc && !wantOnlySnack && Math.random() > 0.4) {
          const fav = profile.favoriteDrink;
          const isDrinkMatch =
            (bestAlc.category && bestAlc.category.includes(fav)) ||
            (bestAlc.name_ko && bestAlc.name_ko.includes(fav)) ||
            (bestAlc.tags || []).some((t) => String(t).includes(fav));

          if (isDrinkMatch) {
            reason = pickRandom([
              `(평소 ${eulLeul(fav)} 좋아하시는 취향에 딱 맞게 골라봤어요! ✨)`,
              `(평소 즐겨 드시는 ${fav} 중에서 특별히 어울리는 픽이에요! 🍸)`,
              `(${eunNeun(fav)} 취향 저격! 입맛에 딱 맞으실 거예요 👍)`,
            ]);
          } else {
            reason = pickRandom([
              `(평소 ${eulLeul(fav)} 즐겨 드시지만, 오늘은 분위기 전환 겸 색다르게 ${gwaWa(bestAlc.name_ko)} 함께해 보세요! 🌟)`,
              `(평소 좋아하시는 ${gwaWa(fav)}는 또 다른 매력으로 오늘 밤을 채워드릴게요! 🍷)`,
              `(${eulLeul(fav)} 좋아하시는 분들도 이 조합엔 푹 빠지실 거예요 😊)`,
            ]);
          }
        } else if (profile.favoriteSnack && bestSnack && Math.random() > 0.4) {
          const favSnk = profile.favoriteSnack;
          const isSnackMatch =
            (bestSnack.category && bestSnack.category.includes(favSnk)) ||
            (bestSnack.name_ko && bestSnack.name_ko.includes(favSnk)) ||
            (bestSnack.tags || []).some((t) => String(t).includes(favSnk));

          if (isSnackMatch) {
            reason = pickRandom([
              `(평소 ${eulLeul(favSnk)} 즐기시는 취향에 맞춰 엄선했어요! 🍽️)`,
              `(${favSnk}파 손님 취향에 딱 맞는 최고의 안주 픽입니다! ✨)`,
            ]);
          } else {
            reason = pickRandom([
              `(평소 좋아하시는 ${favSnk} 대신 오늘은 색다른 별미로 골라봤어요! 😋)`,
              `(${eulLeul(favSnk)} 즐겨 드시는 분의 입맛도 사로잡을 특급 밸런스 안주예요!)`,
            ]);
          }
        }
      }
      
      // 게임 추천이 있으면 텍스트에 덧붙임 (단, 안주만 요청 시에는 제외)
      if (bestGame && !wantOnlySnack && bestAlc) {
        closing = formatTemplate(pickRandom(gameTemplates), null, null, bestGame);
      }
      break;
  }

  // 3. 마무리 (Closing)
  // 조립
  let finalAnswer = [empathy, reason, explanation, closing].filter(part => part.trim().length > 0).join('\n\n');
  return finalAnswer;
}
