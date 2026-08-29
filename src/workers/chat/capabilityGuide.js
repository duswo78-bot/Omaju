import { pickRandom } from '../utils/random.js';
import { setLastBotAsk } from '../semantic/dialogueState.js';

const guideIntros = [
  "제가 질문을 정확히 이해하지 못했지만, 오마주에서 이런 것들을 도와드릴 수 있어요! 🍸",
  "그 부분은 제가 아직 잘 몰라서 배우는 중이지만, 저는 이런 일에 특화되어 있어요! ✨",
  "원하시는 내용을 다시 편하게 말씀해 주셔도 좋아요! 오마주 AI 바텐더는 이런 일들을 도와드릴 수 있습니다: 🍹",
];

export function handleCapabilityGuide(text, context) {
  const intro = pickRandom(guideIntros);
  const namePrefix = context?.profile?.name ? `${context.profile.name}님, ` : '';

  const answer = `${namePrefix}${intro}

① 🍷 **주류 & 안주 맞춤 페어링**
   • 소주·맥주·와인·막걸리·하이볼과 찰떡 안주 추천 (예: *"소주 안주 추천해줘"*, *"와인에 어울리는 거"*)

② 🥂 **상황 & 무드별 큐레이션**
   • 혼술 힐링, 신나는 회식/모임, 로맨틱 데이트, 비 오는 날 감성 (예: *"오늘 혼술이야"*, *"회식 안주 골라줘"*)

③ 📍 **내 주변 맛집 & 술집 찾기**
   • 근처 이자카야, 와인바, 펍, 치킨집 검색 (예: *"강남역 근처 와인바 찾아줘"*)

④ 🍵 **논알콜 & 힐링 간식**
   • 술 없는 날의 든든한 야식과 시원한 음료 (예: *"술 없이 안주만"*, *"논알콜 추천"*)

어떤 게 필요하신가요? 편하게 한마디만 툭 던져주세요!`;

  setLastBotAsk('domain_guide');

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
