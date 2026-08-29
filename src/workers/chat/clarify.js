import { setLastBotAsk } from '../semantic/dialogueState.js';

export function handleClarify(text, context) {
  const frame = context?.frame;
  const alcoholHints = frame?.slots?.alcoholHints || [];
  const snackHints = frame?.slots?.snackHints || [];
  const moods = frame?.slots?.moods || [];
  const guideHint = frame?.guideHint;

  let candidates = [];
  const promptHeader = "혹시 이런 말씀이신가요? 🤔";

  if (alcoholHints.length > 0) {
    const alc = alcoholHints[0];
    candidates = [
      `🍷 **${alc}에 딱 어울리는 맛있는 안주** 추천받기`,
      `✨ **${alc}와 비슷한 다른 주류나 도수/특징** 알아보기`,
    ];
  } else if (snackHints.length > 0) {
    const snk = snackHints[0];
    candidates = [
      `🍺 **${snk}과(와) 찰떡궁합인 술 페어링** 추천받기`,
      `📍 **근처 ${snk} 맛집/술집** 검색하기`,
    ];
  } else if (moods.length > 0 || guideHint === 'mood') {
    candidates = [
      `🕯️ 오늘 기분/상황에 맞춘 **힐링 페어링(술+안주)** 추천받기`,
      `🍵 속 편안한 **논알콜 음료나 가벼운 간식/야식** 추천받기`,
    ];
  } else if (guideHint === 'hangover' || /해장|숙취/.test(text || '')) {
    candidates = [
      `🍲 속을 확 풀어주는 **시원한 해장 안주/국물** 추천받기`,
      `🥤 숙취 해소에 좋은 **음료나 가벼운 메뉴** 추천받기`,
    ];
  } else {
    candidates = [
      `① **오늘의 맞춤 술자리 페어링 (술 + 안주)** 추천받기`,
      `② **상황별(혼술 / 회식 / 데이트) 추천 & 근처 맛집** 찾기`,
    ];
  }

  const candidateList = candidates.map((c) => `• ${c}`).join('\n');
  const answer = `${promptHeader}\n\n${candidateList}\n\n원하시는 번호나 키워드를 말씀해 주시면 바로 찾아드릴게요!`;

  setLastBotAsk('clarify_candidate');

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
