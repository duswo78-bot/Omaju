import { pickRandom } from '../utils/random.js';
import { setLastBotAsk } from '../semantic/dialogueState.js';

const investTemplates = [
  "차트는 빨갛고 파랗게 널뛰어도, 맛있는 술과 안주는 절대 배신하지 않죠 📈 복잡한 머릿속을 식혀줄 시원한 맥주나 하이볼 한 잔 어떠세요?",
  "투자의 기본은 역시 멘탈 관리! 오늘은 수익률 생각 잠시 내려놓고, 나를 위한 맛있는 야식에 투자해 보는 건 어떨까요? 🍷",
  "로또 1등 번호는 비밀이지만, 실패 없는 1등 꿀조합 페어링은 바로 골라드릴 수 있습니다! 🎲 오늘 저녁 힐링 안주 어떠세요?",
  "주식 창 보느라 피로해진 눈과 마음, 시원한 생맥주 한 잔과 바삭한 치킨으로 충전해 드릴까요? 🍺",
];

const philosophyTemplates = [
  "인생의 정답은 찾기 어렵지만, 오늘 밤을 행복하게 만들어줄 한 잔의 정답은 바로 찾아드릴 수 있어요 🌌 깊은 밤에 어울리는 와인이나 위스키 어떠세요?",
  "우주에 외계인이 존재한다면 분명 한국의 치맥 문화에 푹 빠졌을 거예요 🛸 시원하게 맥주 한 캔 따실 타이밍인가요?",
  "철학적인 생각에 잠길 때엔 은은한 향의 칵테일이나 묵직한 전통주 한 잔이 제격이죠. 생각에 집중하기 좋은 페어링을 골라드릴까요? 🕯️",
  "세상만사 복잡해도 시원한 한 잔 들이켜면 한결 마음이 가벼워지죠. 오늘 밤을 위로해 줄 완벽한 짝꿍을 찾아드릴까요?",
];

const techTemplates = [
  "코딩 버그는 머리 아파도, 술과 안주 페어링 알고리즘은 100% 버그 없이 작동 중입니다 💻 머리 식힐 겸 시원한 맥주 한 캔 어떠세요?",
  "AI 개발자도 퇴근 후엔 시원한 한 잔으로 리프레시하죠! 오늘 하루 피로를 싹 날려줄 힐링 조합을 골라드릴까요? 🌿",
  "서버는 다운되어도 오늘의 술자리는 계속됩니다 🚀 복잡한 기술 이야기 대신 맛있는 안주 얘기로 힐링해 볼까요?",
];

const playTemplates = [
  "심심할 땐 술자리 텐션을 확 올려주는 술게임이나 취향 저격 야식 고르기가 최고죠! 🎲 재미있는 게임이나 맛있는 안주를 추천해 드릴까요?",
  "심심함을 달래줄 특급 처방! 시원한 하이볼 한 잔과 바삭한 스낵 조합 어떠세요? ✨",
  "놀아달라고 하시면 맛있는 안주 월드컵부터 열어드릴 수 있습니다 🏆 지금 어떤 음식이 가장 당기시나요?",
];

const generalWittyTemplates = [
  "하하, 정말 기발한 질문이네요! 😄 저는 술과 안주 전문 바텐더라 세상 모든 답은 모르지만, 지금 손님 기분에 딱 맞는 기분 좋은 한 잔은 기가 막히게 찾아드릴 수 있어요 🍷",
  "와, 그런 생각은 미처 못 해봤네요! 재미있는 질문에 보답하는 의미로 기분 좋아질 특급 페어링을 골라드릴게요. 오늘 어떤 분위기가 당기시나요?",
  "엉뚱하지만 매력적인 질문이네요 ㅎㅎ! 그 호기심을 안주 삼아, 오늘 밤 기분 좋게 즐길 시원한 한 잔을 추천해 드릴까요? 🍺",
  "질문 센스가 아주 남다르시네요! 그런 날엔 색다른 칵테일이나 특별한 수제맥주가 딱인데, 한번 구경해 보실래요? 🍸",
];

function detectChitChatCategory(text) {
  const t = String(text || '');
  if (/주식|코인|비트코인|환율|부동산|로또|투자|수익률|돈\s*벌|부자|청약/.test(t)) return 'invest';
  if (/인생|외계인|우주|철학|신이|죽음|외로움|산다는|존재|영혼|인간/.test(t)) return 'philosophy';
  if (/코딩|프로그래밍|파이썬|자바스크립트|버그|개발자|ai|인공지능|챗gpt|에러/.test(t)) return 'tech';
  if (/심심|놀아|웃겨|장난|농담|수수께끼|바보|멍청/.test(t)) return 'play';
  return 'general';
}

export function handleWittyChitchat(text, context) {
  const category = detectChitChatCategory(text);
  let pool;
  switch (category) {
    case 'invest':
      pool = investTemplates;
      break;
    case 'philosophy':
      pool = philosophyTemplates;
      break;
    case 'tech':
      pool = techTemplates;
      break;
    case 'play':
      pool = playTemplates;
      break;
    default:
      pool = generalWittyTemplates;
  }

  let answer = pickRandom(pool);
  if (context?.profile?.name && Math.random() > 0.5) {
    answer = `${context.profile.name}님, ${answer}`;
  }

  setLastBotAsk('chitchat_pivot');

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    state: 'ASKING',
  };
}
