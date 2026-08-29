import { pickRandom } from '../utils/random.js';
import { setLastBotAsk } from '../semantic/dialogueState.js';

const investTemplates = [
  "차트는 빨갛고 파랗게 널뛰어도, 맛있는 술과 안주는 절대 배신하지 않죠 📈 복잡한 머릿속을 식혀줄 시원한 맥주나 하이볼 한 잔 어떠세요?",
  "투자의 기본은 역시 멘탈 관리! 오늘은 수익률 생각 잠시 내려놓고, 나를 위한 맛있는 야식에 투자해 보는 건 어떨까요? 🍷",
  "로또 1등 번호는 비밀이지만, 실패 없는 1등 꿀조합 페어링은 바로 골라드릴 수 있습니다! 🎲 오늘 저녁 힐링 안주 어떠세요?",
  "주식 창 보느라 피로해진 눈과 마음, 시원한 생맥주 한 잔과 바삭한 치킨으로 충전해 드릴까요? 🍺",
];

const loveTemplates = [
  "사랑도 연애도 페어링과 똑같아요! 서로 다른 매력이 만나 완벽한 조화를 이루는 것처럼요 💕 달콤 쌉싸름한 로맨틱 와인이나 칵테일 한 잔 어떠세요?",
  "마음이 싱숭생숭할 땐 은은한 하이볼 한 잔에 달콤한 디저트 안주가 최고의 짝꿍이죠. 기분 달래줄 조합을 골라드릴까요? 🍰",
  "이별의 아픔엔 묵직하고 따뜻한 국물에 소주 한 잔이 최고의 위로가 되어주죠 💧 오늘 밤을 든든하게 받쳐드릴게요.",
  "설레는 썸이나 데이트엔 분위기를 200% 올려줄 세련된 칵테일과 핑거푸드가 제격입니다 ✨",
];

const workTemplates = [
  "오늘 하루도 직장에서 정말 고생 많으셨어요! 🏢 상사 스트레스, 야근 피로는 시원한 소맥이나 톡 쏘는 생맥주 한 잔으로 확 날려버리시죠! 🔥",
  "퇴근 후 마시는 첫 모금이야말로 하루를 버티게 해주는 마법이죠 🍻 기름진 삼겹살이나 매콤한 닭발 곁들여서 힐링해 볼까요?",
  "월급날엔 나를 위한 특급 보상! 평소보다 조금 더 근사한 안주와 프리미엄 주류로 기분 내보시는 건 어떨까요? 🥩",
  "야근하느라 지친 속을 달래줄 든든하고 따뜻한 심야 힐링 메뉴를 찾아드릴게요 🍲",
];

const schoolTemplates = [
  "시험과 과제로 지친 뇌에 시원한 에너지 충전이 필요한 타이밍이군요! 📚 부담 없이 가볍게 즐길 수 있는 스낵과 음료 조합을 추천해 드릴까요?",
  "종강/방학을 향해 달려가는 당신, 오늘 밤만큼은 맛있는 야식과 함께 잠시 머리를 식혀보세요! 🍕",
  "공부하느라 고생한 나에게 주는 작은 선물! 달콤한 칵테일이나 톡 쏘는 탄산 주류 어떠세요? 🍹",
];

const philosophyTemplates = [
  "인생의 정답은 찾기 어렵지만, 오늘 밤을 행복하게 만들어줄 한 잔의 답은 바로 찾아드릴 수 있어요 🌌 깊은 밤에 어울리는 와인이나 위스키 어떠세요?",
  "우주에 외계인이 존재한다면 분명 한국의 치맥 문화에 푹 빠졌을 거예요 🛸 시원하게 맥주 한 캔 따실 타이밍인가요?",
  "철학적인 생각에 잠길 때엔 은은한 향의 칵테일이나 묵직한 전통주 한 잔이 제격이죠. 생각에 집중하기 좋은 페어링을 골라드릴까요? 🕯️",
  "세상만사 복잡해도 시원한 한 잔 들이켜면 한결 마음이 가벼워지죠. 오늘 밤을 위로해 줄 완벽한 짝꿍을 찾아드릴까요?",
];

const techTemplates = [
  "코딩 버그는 머리 아파도, 술과 안주 페어링 알고리즘은 100% 버그 없이 작동 중입니다 💻 머리 식힐 겸 시원한 맥주 한 캔 어떠세요?",
  "AI 개발자도 퇴근 후엔 시원한 한 잔으로 리프레시하죠! 오늘 하루 피로를 싹 날려줄 힐링 조합을 골라드릴까요? 🌿",
  "서버는 다운되어도 오늘의 술자리는 계속됩니다 🚀 복잡한 기술 이야기 대신 맛있는 안주 얘기로 힐링해 볼까요?",
];

const sportsTemplates = [
  "스포츠 경기 볼 때 치맥과 팝콘이 빠지면 섭섭하죠! ⚽ 시원하게 건배하며 응원할 찰떡 콤보를 골라드릴까요? 🍻",
  "손에 땀을 쥐는 명경기엔 역시 핑거푸드와 시원한 맥주가 진리! 응원 열기를 더해줄 조합을 찾아드릴게요 🔥",
];

const cultureTemplates = [
  "넷플릭스나 영화 볼 땐 나초, 팝콘, 그리고 시원한 캔맥주가 필수죠! 🎬 방구석 영화관을 완성할 페어링을 골라드릴까요?",
  "좋아하는 음악 틀어두고 느긋하게 한잔 기울이는 밤, 분위기 있는 와인이나 칵테일 조합을 추천해 드릴게요 🍷",
];

const playTemplates = [
  "심심할 땐 술자리 텐션을 확 올려주는 술게임이나 취향 저격 야식 고르기가 최고죠! 🎲 재미있는 게임이나 맛있는 안주를 추천해 드릴까요?",
  "심심함을 달래줄 특급 처방! 시원한 하이볼 한 잔과 바삭한 스낵 조합 어떠세요? ✨",
  "놀아달라고 하시면 맛있는 안주 월드컵부터 열어드릴 수 있습니다 🏆 지금 어떤 음식이 가장 당기시나요?",
];

const praiseTemplates = [
  "칭찬해 주시니 바텐더 어깨가 으쓱해지네요! 🥰 기분 좋은 손님을 위해 오늘 최고의 특급 페어링을 대접해 드릴게요.",
  "감사합니다 ㅎㅎ! 손님의 취향 저격을 위해 항상 최고의 조합을 연구하고 있어요. 오늘 밤엔 어떤 맛을 원하시나요? 🍸",
];

const generalWittyTemplates = [
  "하하, 정말 기발한 질문이네요! 😄 저는 술과 안주 전문 바텐더라 세상 모든 답은 모르지만, 지금 손님 기분에 딱 맞는 기분 좋은 한 잔은 기가 막히게 찾아드릴 수 있어요 🍷",
  "와, 그런 생각은 미처 못 해봤네요! 재미있는 질문에 보답하는 의미로 기분 좋아질 특급 페어링을 골라드릴게요. 오늘 어떤 분위기가 당기시나요?",
  "엉뚱하지만 매력적인 질문이네요 ㅎㅎ! 그 호기심을 안주 삼아, 오늘 밤 기분 좋게 즐길 시원한 한 잔을 추천해 드릴까요? 🍺",
  "질문 센스가 아주 남다르시네요! 그런 날엔 색다른 칵테일이나 특별한 수제맥주가 딱인데, 한번 구경해 보실래요? 🍸",
];

function detectChitChatCategory(text) {
  const t = String(text || '');
  if (/연애|썸|짝사랑|이별|남친|여친|고백|차였|결혼|데이트상담/.test(t)) return 'love';
  if (/회사|상사|부장|팀장|야근|퇴사|이직|칼퇴|월급|출근|직장|업무/.test(t)) return 'work';
  if (/시험|과제|숙제|공부|학점|개강|종강|학원|대학|수능/.test(t)) return 'school';
  if (/주식|코인|비트코인|환율|부동산|로또|투자|수익률|돈\s*벌|부자|청약|적금/.test(t)) return 'invest';
  if (/인생|외계인|우주|철학|신이|죽음|외로움|산다는|존재|영혼|인간/.test(t)) return 'philosophy';
  if (/코딩|프로그래밍|파이썬|자바스크립트|버그|개발자|ai|인공지능|챗gpt|에러|서버/.test(t)) return 'tech';
  if (/축구|야구|농구|올림픽|월드컵|롤|경기|응원|치맥각/.test(t)) return 'sports';
  if (/넷플릭스|영화|드라마|유튜브|음악|노래|팝송/.test(t)) return 'culture';
  if (/심심|놀아|웃겨|장난|농담|수수께끼|바보|멍청|메롱/.test(t)) return 'play';
  if (/천재|똑똑|귀엽|예쁘|잘한다|최고|사랑해|멋져|대단/.test(t)) return 'praise';
  return 'general';
}

export function handleWittyChitchat(text, context) {
  const category = detectChitChatCategory(text);
  let pool;
  switch (category) {
    case 'love':
      pool = loveTemplates;
      break;
    case 'work':
      pool = workTemplates;
      break;
    case 'school':
      pool = schoolTemplates;
      break;
    case 'invest':
      pool = investTemplates;
      break;
    case 'philosophy':
      pool = philosophyTemplates;
      break;
    case 'tech':
      pool = techTemplates;
      break;
    case 'sports':
      pool = sportsTemplates;
      break;
    case 'culture':
      pool = cultureTemplates;
      break;
    case 'play':
      pool = playTemplates;
      break;
    case 'praise':
      pool = praiseTemplates;
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
