import { setLastBotAsk } from '../semantic/dialogueState.js';

export function handleClarify(text, context) {
  const frame = context?.frame;
  const t = String(text || '');
  const alcoholHints = frame?.slots?.alcoholHints || [];
  const snackHints = frame?.slots?.snackHints || [];
  const moods = frame?.slots?.moods || [];
  const weather = frame?.slots?.weather || [];
  const guideHint = frame?.guideHint;

  let candidates = [];
  const promptHeader = "혹시 이런 말씀이신가요? 🤔";

  if (alcoholHints.length > 0) {
    const alc = alcoholHints[0];
    candidates = [
      `🍷 **${alc}에 딱 어울리는 맛있는 안주** 추천받기`,
      `✨ **${alc}와 비슷한 주류 종류나 도수/특징** 알아보기`,
      `📍 **${alc} 마시기 좋은 근처 술집/바** 검색하기`,
    ];
  } else if (snackHints.length > 0) {
    const snk = snackHints[0];
    candidates = [
      `🍺 **${snk}과(와) 찰떡궁합인 술 페어링** 추천받기`,
      `📍 **내 주변 ${snk} 맛집/식당** 검색하기`,
      `🔥 **${snk}에 곁들이기 좋은 추가 서브 안주** 추천받기`,
    ];
  } else if (/매운|달달|달콤|담백|느끼|시원|가벼|센\s*도수|도수\s*낮/.test(t)) {
    const flavor = /매운|매콤/.test(t) ? '매콤한 맛' : /달달|달콤/.test(t) ? '달콤한 맛' : /시원/.test(t) ? '시원하고 청량한 맛' : '취향 저격 풍미';
    candidates = [
      `🍽️ **${flavor}의 안주 & 술 맞춤 페어링** 추천받기`,
      `🍹 **${flavor}을(를) 살린 칵테일/하이볼/음료** 알아보기`,
    ];
  } else if (weather.length > 0 || /비|눈|더워|추워|날씨/.test(t)) {
    const w = weather.includes('rain') || /비/.test(t) ? '비 오는 날' : weather.includes('snow') || /눈/.test(t) ? '눈 오는 날' : '오늘 날씨';
    candidates = [
      `☔ **${w} 감성에 어울리는 특급 페어링 (예: 전+막걸리, 국물+소주)** 추천받기`,
      `🕯️ **실내에서 아늑하게 즐기기 좋은 1인 홈술 메뉴** 추천받기`,
    ];
  } else if (guideHint === 'hangover' || /해장|숙취|속쓰|속이\s*안/.test(t)) {
    candidates = [
      `🍲 속을 확 풀어주는 **시원한 해장 국물/음식** 추천받기`,
      `🥤 숙취 해소에 좋은 **음료나 가벼운 리프레시 메뉴** 알아보기`,
    ];
  } else if (moods.length > 0 || guideHint === 'mood' || /혼술|회식|데이트|파티/.test(t)) {
    candidates = [
      `🕯️ 오늘 분위기에 맞춘 **감성 페어링(술+안주)** 추천받기`,
      `🍵 속 편안한 **논알콜 음료나 가벼운 간식/야식** 추천받기`,
    ];
  } else if (/게임|놀거리|술게임/.test(t)) {
    candidates = [
      `🎲 술자리 텐션을 올려줄 **인기 술게임 규칙** 추천받기`,
      `🍻 게임과 함께 즐기기 좋은 **핑거푸드/안주** 추천받기`,
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
