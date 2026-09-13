import { pickRandom } from '../utils/random.js';
import { setLastBotAsk, incrementChitchatTurns, getConsecutiveChitchatTurns } from '../semantic/dialogueState.js';

const recentWittySentences = [];

function pickNonRepeating(pool) {
  const available = (pool || []).filter((t) => !recentWittySentences.includes(t));
  const chosen = pickRandom(available.length > 0 ? available : pool);
  recentWittySentences.push(chosen);
  if (recentWittySentences.length > 10) {
    recentWittySentences.shift();
  }
  return chosen;
}

const deepListeningAnchorTemplates = [
  "그런 일이 있으셨군요... 카운터 너머로 온전히 귀 기울여 드릴게요 🕯️ 이야기 편하게 털어놓으시면서, 속이라도 든든하게 채우실 수 있는 따뜻한 짝꿍을 곁에 놓아드릴게요 🍲",
  "듣기만 해도 한숨이 절로 나오네요. 오늘은 다른 복잡한 생각 다 접어두고, 맛있는 음식으로 몸부터 위로해야 할 밤이에요 ✨ 손님의 지친 마음을 녹여줄 포근한 한 상을 준비해드릴게요.",
  "세상살이가 참 마음 같지 않죠. 속상하고 화난 날일수록 빈속으로 계시면 안 돼요. 속을 따뜻하게 달래줄 든든한 힐링 메뉴로 기운 차리게 도와드릴게요 🍵",
  "그 억울하고 답답한 마음, 바텐더로서 온전히 공감해요. 말없이 곁을 지키며 손님의 마음을 든든하게 받쳐줄 위로의 한 잔과 안주를 골라둘게요 🌿",
  "마음속 응어리는 이야기로 풀고, 몸의 피로는 맛있는 야식과 한 잔으로 씻어내야죠. 오늘 밤만큼은 오롯이 손님만을 위한 치유의 페어링을 내어드릴게요 🍷",
];

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
  "할 말이 없거나 조용한 밤엔 맛있는 야식과 시원한 한 잔이 최고의 친구가 되어주죠 🍻 오늘 손님을 위한 힐링 조합을 하나 골라드릴까요?",
];

const praiseTemplates = [
  "칭찬해 주시니 바텐더 어깨가 으쓱해지네요! 🥰 기분 좋은 손님을 위해 오늘 최고의 특급 페어링을 대접해 드릴게요.",
  "감사합니다 ㅎㅎ! 손님의 취향 저격을 위해 항상 최고의 조합을 연구하고 있어요. 오늘 밤엔 어떤 맛을 원하시나요? 🍸",
];

const fortuneTemplates = [
  "오늘의 운세: '시원한 한 잔과 바삭한 안주를 곁들이면 모든 일이 술술 풀릴 대길(大吉)의 날'입니다! 🔮 오늘 밤 행운의 페어링을 점쳐드릴까요?",
  "타로 카드를 뽑아보니 '황금빛 맥주잔'과 '풍성한 안주 한 상' 카드가 나왔네요 ✨ 오늘 하루 고생한 나에게 줄 최고의 행운 조합을 골라드릴까요?",
  "사주에 '오늘 맛있는 야식을 먹지 않으면 섭섭함'이 적혀있네요! 🌙 기분 좋은 에너지를 채워줄 힐링 메뉴를 찾아드릴까요?",
];

const aiMetaTemplates = [
  "네, 맞습니다! 저는 수많은 미식 데이터와 페어링 알고리즘으로 무장한 오마주 AI 바텐더예요 🤖 사용자님의 취향과 기분에 딱 맞춘 술과 안주를 찾아드릴게요!",
  "100% 온디바이스로 작동하는 스마트한 AI 바텐더입니다! 🍸 복잡한 고민 없이 '비 오는 날', '혼술', '매운 안주'처럼 툭 던져주시면 바로 찰떡 조합을 골라드려요.",
  "GPT처럼 똑똑하지만, 저는 오직 '당신의 완벽한 한 잔과 안주'에 모든 걸 집중한 전문 AI 바텐더입니다 ✨ 오늘 어떤 분위기로 즐겨볼까요?",
];

const testingTemplates = [
  "치직- 치직- 오마주 AI 바텐더 시스템, 정상 작동 중입니다! 📡 언제든 완벽한 페어링을 추천해 드릴 준비가 완료되었어요. 어떤 걸 찾아드릴까요?",
  "네, 아주 잘 들립니다! 👂 테스트 겸 오늘 마실 술이나 당기는 안주를 하나 말씀해 주시면 바로 실력을 보여드릴게요!",
  "오마주 엔진 100% 정상 가동 중! ✨ 테스트로 가볍게 '소주 안주'나 '혼술' 한번 던져보실래요?",
];

const languageTemplates = [
  "한국어는 기본이고, 맛있는 술과 안주의 언어는 전 세계 공통이죠! 🌐 Cheers, 건배, 乾杯! 오늘 어떤 술자리 조합을 안내해 드릴까요?",
  "Yes, I speak Korean and the universal language of food & drinks! 🍷 원하시는 분위기나 주종을 말씀해 주시면 바로 찾아드릴게요.",
];

const travelTemplates = [
  "여행지에서 마시는 그 지역 특산주와 로컬 안주야말로 여행의 꽃이죠! ✈️ 제주 감성 맥주나 바닷가 감성 회+소주 페어링으로 방구석 랜선 여행을 떠나보실래요?",
  "휴가지의 설렘을 담아! 낭만 가득한 와인이나 청량한 하이볼 조합으로 여행 온 기분을 내보시는 건 어떨까요? 🌴",
];

const timeTemplates = [
  "시계를 볼 필요 없이, 지금은 딱 '맛있는 한 잔과 안주'를 고민하기 가장 완벽한 골든타임입니다 ⏰ 오늘 밤을 힐링해 줄 꿀조합을 찾아드릴까요?",
  "시간이 몇 시든, 출출하거나 기분 전환이 필요한 순간엔 오마주가 언제나 대기 중입니다! 🌙 가벼운 야식이나 시원한 음료 어떠세요?",
];

const trafficTemplates = [
  "오늘 도로에서 시간 다 버리셨군요 🚗 꽉 막힌 길 운전하고 오시느라 발목이며 어깨며 굳으셨을 텐데, 시원한 생맥주나 톡 쏘는 탄산 한 잔으로 오늘 피로를 확 날려버리시죠! 오늘 밤 가볍게 힐링할 페어링 골라드릴까요?",
  "지옥철과 꽉 막힌 도로를 뚫고 오시느라 정말 고생 많으셨어요! 🚪 집에 도착하자마자 시원하게 들이켜는 캔맥주 한 캔의 쾌감, 바로 세팅해 드릴까요?",
  "퇴근길 정체는 하루 중 가장 에너지를 갉아먹는 복병이죠 🚦 지친 몸을 소파에 파묻고 기분 전환할 수 있는 야식과 시원한 한 잔을 찾아드릴게요.",
];

const homeLongingTemplates = [
  "집에 있어도 집에 가고 싶은 그 마음, 온전히 이해해요 🛋️ 오늘 하루 바깥세상에서 정말 치열하게 버텨내셨네요. 포근한 침대 속에서 힐링할 수 있는 아늑한 야식이나 편안한 한 잔을 찾아드릴게요.",
  "얼른 이불 속으로 다이빙하고 싶은 순간이죠 🌙 현관문 열고 들어서자마자 나를 반겨줄 소소하지만 확실한 힐링 페어링을 골라드릴까요?",
  "집이 주는 안락함이 간절한 타이밍이군요! 방해받지 않는 나만의 홈술 아지트를 완성해 드릴게요 ✨",
];

const sleepyTiredTemplates = [
  "눈꺼풀이 천근만근 무거운 하루네요 🥱 무거운 몸으로 오늘 하루도 정말 고생 많으셨어요! 부담 없이 가볍게 호로록 즐기고 꿀잠 잘 수 있는 편안한 메뉴를 골라드릴까요?",
  "배터리 1% 방전 모드군요 🪫 이럴 땐 복잡한 안주 대신 가볍고 달콤한 한 잔이나 따뜻한 차/국물이 최고예요. 힐링 처방전 하나 내려드릴까요?",
  "오늘 하루 에너지를 하얗게 불태우셨군요! 피로를 스르륵 녹여줄 포근한 야식을 권해드릴게요 💤",
];

const workoutFitnessTemplates = [
  "오늘도 득근 완료! 오운완 멋지십니다 💪 땀 흘리고 온 날엔 단백질 보충과 수분 리프레시가 생명이죠. 기름지지 않은 담백한 고기/해산물 안주에 깔끔한 한 잔 어떠세요?",
  "온몸이 쑤실 만큼 열심히 쇠질하고 오셨군요 🏋️ 뭉친 근육을 달래줄 고단백 안주(소고기, 연어 등)와 시원한 무알콜/하이볼 조합으로 보상해 볼까요?",
  "운동 후 씻고 나와서 즐기는 담백한 야식이야말로 진정한 갓생의 마무리죠 ✨ 오늘 운동 루틴에 방해되지 않는 깔끔한 페어링을 골라드릴게요!",
];

const dietHealthTemplates = [
  "다이어트 중 찾아오는 야식의 유혹, 참기 정말 힘들죠 🥗 하지만 죄책감은 NO! 칼로리 부담 적은 가벼운 샐러드나 담백한 해산물 안주에 깔끔한 논알콜/라이트 하이볼 조합이라면 기분 좋게 즐기실 수 있어요. 가볍고 살 안 찌는 조합으로 맞춰드릴까요?",
  "맛있게 먹으면 0칼로리... 까지는 아니어도, 부담을 1/3로 줄인 라이트 페어링은 얼마든지 있습니다! 가벼운 다이어트 야식 찾아드릴게요 ✨",
  "건강과 식단도 챙기면서 소소한 힐링도 놓치지 않는 스마트한 페어링! 지금 바로 골라드릴까요? 🥑",
];

const coffeeCaffeineTemplates = [
  "오늘 커피를 많이 드셨군요 ☕ 카페인으로 하루를 버텨내느라 심장이 열일했겠어요. 이럴 땐 자극적인 술보다는 속을 부드럽게 감싸주는 따뜻한 국물이나 순한 야식이 딱이에요. 속 편한 메뉴 찾아드릴까요?",
  "아아로 가득 채운 하루의 끝! 이제 카페인은 내려놓고, 긴장을 스르륵 풀어줄 편안한 힐링 페어링으로 밤을 맞이해 보시는 건 어떨까요? 🍵",
];

const petWalkTemplates = [
  "귀여운 댕댕이랑 산책 다녀오셨군요! 🐶 기분 좋게 땀 흘리고 들어온 뒤엔 갈증을 확 풀어줄 시원한 생맥주나 톡 쏘는 탄산 에이드가 천국이죠. 꿀맛 같은 한 잔 준비해 드릴까요?",
  "반려동물과 함께 힐링하고 온 평화로운 하루네요 🐾 냥이/댕댕이 옆에 두고 느긋하게 즐기기 좋은 아늑한 홈술 조합을 추천해 드릴까요?",
];

const choresWashTemplates = [
  "청소와 빨래까지 깔끔하게 끝내셨다니, 정말 부지런하고 완벽한 하루네요! 🫧 깨끗해진 방에서 뽀송뽀송하게 즐기는 시원한 한 잔, 상상만 해도 최고죠? 힐링 페어링 골라드릴까요?",
  "따뜻한 물로 샤워 싹 하고 나와서 마시는 첫 모금이야말로 하루의 하이라이트죠 🚿 온몸이 개운해질 청량한 조합을 찾아드릴게요!",
];

const conflictTemplates = [
  "친한 사이일수록 사소한 말 한마디에 더 서운하고 마음이 쿵 내려앉죠 💧 복잡한 마음을 차분하게 가라앉혀 줄 따뜻하고 그윽한 한 잔 어떠세요? 상한 기분을 달래드릴게요 🕯️",
  "사람 관계가 마음처럼 안 풀릴 때가 있죠. 오늘은 복잡한 생각 잠시 끄고, 맛있는 안주로 나 자신부터 먼저 위로해 주는 건 어떨까요? 든든한 짝꿍을 찾아드릴게요.",
];

const mondayBluesTemplates = [
  "월요일의 무게는 왜 늘 새롭게 무거울까요 🫠 일주일의 시작을 꿋꿋하게 버텨낸 나를 위해, 오늘 저녁만큼은 소소한 치맥이나 시원한 한 잔으로 스스로를 토닥여주세요! 기운 나는 안주 골라드릴까요?",
  "내일 출근 생각만 하면 한숨이 절로 나오죠 😮‍💨 일요일 밤/월요일의 우울함을 달래줄 부담 없고 깔끔한 힐링 페어링을 준비해 드릴게요!",
];

const sunnyWeatherTemplates = [
  "창밖만 내다봐도 기분 좋아지는 화창한 날이네요! ☀️ 이런 날씨엔 테라스나 창가에서 마시는 산뜻한 하이볼이나 가벼운 맥주가 정말 잘 어울리죠. 날씨 무드 살려드릴까요?",
  "햇살 가득 화창한 날엔 기분도 덩달아 설레죠! 피크닉 감성을 물씬 풍겨줄 산뜻하고 가벼운 페어링을 골라드릴까요? 🌿",
];

const bodilyConditionTemplates = [
  "목이 타는 갈증엔 살얼음 띄운 시원한 생맥주나 탄산감 가득한 하이볼이 특효약이죠! 🧊 가슴속까지 뻥 뚫릴 청량한 조합을 찾아드릴까요?",
  "속이 더부룩할 땐 기름진 건 피하고, 가볍고 개운한 국물이나 소화 잘되는 담백한 안주가 제격이에요. 속 편한 조합으로 맞춰드릴까요? 🍲",
];

const longDayTemplates = [
  "유독 길고 고단했던 하루를 무사히 완주하셨네요 🌙 아무 생각 없이 푹 쉬고 싶은 밤, 오늘 하루 고생한 나에게 선물할 특급 힐링 페어링을 대접해 드릴게요.",
  "참 길었던 하루였죠. 그 긴 하루의 끝을 기분 좋게 닫아줄 따뜻하고 그윽한 한 잔을 준비해 드릴게요 🍷",
];

const generalWittyTemplates = [
  "그 마음, 바텐더로서 온전히 공감해요 🕯️ 세상살이가 늘 계획대로만 흘러가진 않죠. 지금 그 기분에 딱 맞는 따뜻하고 기분 좋은 한 잔 하나 골라드릴까요?",
  "오늘도 정말 다양한 일들이 있었군요! 복잡한 생각들은 잠시 카운터 너머로 털어버리시고, 나만을 위한 맛있는 힐링 메뉴로 기분 전환해 보시는 건 어떨까요? 🍷",
  "하루를 보내다 보면 불쑥 찾아오는 그런 순간들이 있죠. 그럴 땐 맛있는 안주에 시원한 한 잔 곁들이는 것만큼 확실한 처방이 없답니다. 기분 살려드릴까요? ✨",
  "손님의 오늘 하루가 어떤 온도였을지 느껴지네요. 기분을 한층 더 산뜻하고 편안하게 만들어줄 페어링을 찾아드릴까요? 🌿",
];

function detectChitChatCategory(text) {
  const t = String(text || '');
  if (/차\s*막|길\s*막|교통|출퇴근|퇴근길|출근길|지옥철|도로|운전|신호/.test(t)) return 'traffic';
  if (/집에\s*가고|집가고|집에\s*언제|퇴근하고\s*싶|얼른\s*집|침대|이불\s*속/.test(t)) return 'home_longing';
  if (/졸려|졸리|하품|눈감겨|잠와|잠\s*쏟|피곤|체력\s*방전|뻗었|지쳤|녹초|힘들어|기운\s*없|방전/.test(t)) return 'sleepy_tired';
  if (/헬스|오운완|득근|근육통|온몸이\s*쑤|몸이\s*쑤|웨이트|쇠질|필라테스|러닝|조깅|등산|운동/.test(t)) return 'workout_fitness';
  if (/다이어트|살\s*빼|살빼|칼로리|살\s*찌|살찌|식단|살안찌/.test(t)) return 'diet_health';
  if (/커피|카페인|아아|에스프레소|디카페인|라떼/.test(t)) return 'coffee_caffeine';
  if (/강아지|댕댕|고양이|냥이|산책|반려|애완/.test(t)) return 'pet_walk';
  if (/청소|빨래|설거지|집안일|샤워|목욕|씻고/.test(t)) return 'chores_wash';
  if (/싸웠|다퉜|서운|다툼|싸움|화해|절교|삐쳤|삐졌/.test(t)) return 'interpersonal_conflict';
  if (/월요일|월요병|일요일\s*밤|내일\s*출근|출근하기\s*싫|주말\s*끝/.test(t)) return 'monday_blues';
  if (/날씨\s*좋|화창|날씨\s*맑|햇살|나들이|테라스/.test(t)) return 'sunny_weather';
  if (/목말|갈증|소화\s*안|속\s*더부룩|더부룩|얹혔|배불러/.test(t)) return 'bodily_condition';
  if (/하루가\s*길|하루도\s*참|하루\s*끝|고단한\s*하루|긴\s*하루|수고했어/.test(t)) return 'long_day';
  if (/운세|타로|사주|점괘|신년운세/.test(t)) return 'fortune';
  if (/ai맞아|사람아니지|gpt|챗gpt|제미나이|너ai야|인공지능|로봇|누구야|이름이뭐|자기소개/.test(t)) return 'ai_meta';
  if (/테스트|테스트중|작동하나|잘들려|마이크테스트|test/.test(t)) return 'testing';
  if (/한국어|영어|외국어|번역|language/.test(t)) return 'language';
  if (/여행|여행지|놀러|휴가|캠핑|글램핑/.test(t)) return 'travel';
  if (/몇시|몇\s*시|시간|요일|몇일/.test(t)) return 'time';
  if (/연애|썸|짝사랑|이별|남친|여친|고백|차였|결혼|데이트상담|고민/.test(t)) return 'love';
  if (/회사|상사|부장|팀장|야근|퇴사|이직|칼퇴|월급|출근|직장|업무/.test(t)) return 'work';
  if (/시험|과제|숙제|공부|학점|개강|종강|학원|대학|수능/.test(t)) return 'school';
  if (/주식|코인|비트코인|환율|부동산|로또|투자|수익률|돈\s*벌|부자|청약|적금/.test(t)) return 'invest';
  if (/인생|외계인|우주|철학|신이|죽음|외로움|산다는|존재|영혼|인간/.test(t)) return 'philosophy';
  if (/코딩|프로그래밍|파이썬|자바스크립트|버그|개발자|에러|서버/.test(t)) return 'tech';
  if (/축구|야구|농구|올림픽|월드컵|롤|경기|응원|치맥각/.test(t)) return 'sports';
  if (/넷플릭스|영화|드라마|유튜브|음악|노래|팝송/.test(t)) return 'culture';
  if (/심심|놀아|웃겨|장난|농담|수수께끼|바보|멍청|메롱|퀴즈/.test(t)) return 'play';
  if (/천재|똑똑|귀엽|예쁘|잘한다|최고|사랑해|멋져|대단/.test(t)) return 'praise';
  return 'general';
}

export function handleWittyChitchat(text, context) {
  const turns = incrementChitchatTurns();
  const category = detectChitChatCategory(text);
  let pool;

  // 연속 2턴 이상 감정 배출/넋두리 시: 매번 "골라드릴까요?" 재촉하지 않고 깊은 경청 + 속 달래기 앵커링
  if (turns >= 2 && (category === 'general' || category === 'work' || category === 'interpersonal_conflict' || category === 'long_day' || category === 'bodily_condition')) {
    pool = deepListeningAnchorTemplates;
  } else {
    switch (category) {
      case 'traffic':
        pool = trafficTemplates;
        break;
      case 'home_longing':
        pool = homeLongingTemplates;
        break;
      case 'sleepy_tired':
        pool = sleepyTiredTemplates;
        break;
      case 'workout_fitness':
        pool = workoutFitnessTemplates;
        break;
      case 'diet_health':
        pool = dietHealthTemplates;
        break;
      case 'coffee_caffeine':
        pool = coffeeCaffeineTemplates;
        break;
      case 'pet_walk':
        pool = petWalkTemplates;
        break;
      case 'chores_wash':
        pool = choresWashTemplates;
        break;
      case 'interpersonal_conflict':
        pool = interpersonalConflictTemplates;
        break;
      case 'monday_blues':
        pool = mondayBluesTemplates;
        break;
      case 'sunny_weather':
        pool = sunnyWeatherTemplates;
        break;
      case 'bodily_condition':
        pool = bodilyConditionTemplates;
        break;
      case 'long_day':
        pool = longDayTemplates;
        break;
      case 'fortune':
        pool = fortuneTemplates;
        break;
      case 'ai_meta':
        pool = aiMetaTemplates;
        break;
      case 'testing':
        pool = testingTemplates;
        break;
      case 'language':
        pool = languageTemplates;
        break;
      case 'travel':
        pool = travelTemplates;
        break;
      case 'time':
        pool = timeTemplates;
        break;
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
  }

  let answer = pickNonRepeating(pool);
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
