import emotionsDataJson from '../../data/emotions.json';
import situationsDataJson from '../../data/situations.json';
import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import { emptyFrame } from './schema.js';
import {
  DOMAIN_CORE,
  DOMAIN_SOFT,
  OFFTOPIC_STRONG,
  OFFTOPIC_SOFT,
  META_APP,
  AFFIRM,
  DENY,
  GUIDE_TRIGGERS,
  PLACE_VENUE,
  PLACE_NEAR,
  PLACE_FIND,
  COMPLAINT_MARKERS,
  GOODBYE_MARKERS,
} from './domainLexicon.js';
import { getMbtiTrait, normalizeMbti } from '../../data/mbtiTraits.js';
import { matchCorpus } from './normalizeKorean.js';
import { extractPlaceQueryFromText } from '../../utils/snackToVenueQuery.js';

const ALC_CATEGORY_HINTS = [
  '소주', '맥주', '막걸리', '와인', '하이볼', '위스키', '칵테일', '보드카', '전통주', '과실주', '청하', '샴페인',
  '진로', '참이슬', '새로', '카스', '테라', '켈리',
  '생맥', '생맥주', '캔맥', '병맥', '흑맥', '흑맥주', '수제맥주',
  '진토닉', '모히또', '동동주', '약주', '탁주',
  '백주', '바이주', '빠이주', '고량주', '중국술',
  '사케', '청주', '니혼슈', '일본술', '온사케',
];
const ALC_NAME_HINTS = [
  ...new Set([
    ...alcoholsData.map((a) => a.name_ko),
    ...alcoholsData.map((a) => a.name_ko.split(' ')[0]),
    '발베니', '맥캘란', '글렌피딕', '조니워커', '와일드터키', '잭다니엘', '제임슨', '산토리', '가쿠빈', '라프로익', '아드벡',
    '마오타이', '양하대곡', '연태고량주', '연태', '공부가주', '우량예', '이과두주',
    '닷사이', '쿠보타', '간바레오또상', '센킨', '백화수복', '경주법주', '샴페인',
  ]),
].filter((n) => n && n.length >= 2 && !['추천', '인기', '클래식', '트렌디', '고급', '선물', '홈술'].includes(n));

const SNK_NAME_HINTS = [
  ...new Set([
    ...snacksData.map((s) => s.name_ko),
    ...snacksData.map((s) => s.name_ko.split(' ')[0]),
  ]),
].filter((n) => n && n.length >= 2 && !['추천', '인기', '클래식', '트렌디', '고급', '간단', '든든'].includes(n));
const SHORT_SNACKS = [
  '회', '모둠회', '사시미', '숙성회', '골뱅이', '골뱅이소면', '명란', '야키토리', '오뎅', '치킨', '삼겹', '곱창', '라면', '전', '파전', '족발', '보쌈', '김치', '피자', '튀김', '꼬치',
  '어묵', '어묵탕', '오뎅탕', '순대', '떡볶이', '닭발', '마라탕', '마라샹궈', '짬뽕', '짜파게티', '육회', '육전', '감바스', '먹태', '노가리', '가라아게', '타코야키', '스테이크', '소세지', '부대찌개', '김치찌개',
  '과일', '고기', '해물', '해산물', '생선', '치즈', '탕', '국물', '찌개', '면', '밥',
  '샐러드', '디저트', '스낵', '빵', '분식', '화채', '플래터', '마른안주', '마른', '감자', '나초', '황도', '메론',
];
const EXCLUDE_STOP = new Set([
  '그거', '이거', '저거', '다른', '거', '걸로', '건', '게', '것', '센', '약한', '센거', '약한거',
]);
const GREETING_TOKENS = ['안녕하세요', '안녕하세여', '반가워', '반가워요', '방가', 'ㅎㅇ', 'ㅎ2', '오랜만', '처음이야', '처음왔어'];
// '하이'는 하이볼 오탐이 많아 단독 토큰으로만 허용

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

export function isDeclineAlcohol(hay, text) {
  const h = String(hay || '');
  const t = String(text || '');
  return (
    // 1) 술 키워드와 함께 거부/사양
    /술(?:은|이|도|을|이란)?\s*(?:안\s*마|안\s*땡|안\s*먹|안\s*해|생각.*(?:없|안)|못\s*마|안\s*끌|그만|안마|패스|빼|안먹|안땡|자제|끊|싫|안들어가|안받아|안당겨|안내켜|스킵|됐|안마실|안먹을)/.test(h) ||
    // 2) 금주 / 논알콜 / 무알콜 / 간 휴식
    /금주|단주|노알콜|논알콜|무알콜|알콜\s*없이|술\s*없이|알콜\s*안받|술마실\s*기분\s*아니|간\s*쉬|속\s*안좋아서\s*술|술\s*생각\s*(?:1도\s*)?없/.test(h) ||
    // 3) '술' 단어가 생략된 자연스러운 거절 표현 ("오늘은 안마실래", "안 마실래", "마시기 싫어", "안 땡겨", "오늘은 쉴래", "오늘은 패스")
    /(?:오늘(?:은)?|나(?:는)?|지금(?:은)?|이번(?:엔)?|그냥)?\s*(?:안\s*마실(?:래|란다|래여|래요|거야|듯|다)|안\s*마셔(?:요)?|안\s*마신다|안\s*먹을(?:래|란다|래여|래요|거야)|안\s*먹어(?:요)?|마시기\s*싫(?:어|다|은데|음|네)|먹기\s*싫(?:어|다|은데|음|네)|먹고\s*싶지\s*않|마시고\s*싶지\s*않|먹고\s*싶지도\s*않|마시고\s*싶지도\s*않|아무것도\s*먹고|아무것도\s*마시고|안\s*땡(?:겨|기네|긴다|겨요)|안\s*끌(?:려|리네|린다)|생각\s*(?:없|안\s*나)|쉬(?:고\s*싶|어야겠|ㄹ래)|패스\s*할(?:래|게))/.test(h) ||
    /(?:오늘(?:은)?|나(?:는)?|지금(?:은)?|이번(?:엔)?|그냥)?\s*(?:안\s*마실|안\s*마셔|안\s*먹을|안\s*먹어|마시기\s*싫|먹기\s*싫|먹고\s*싶지|마시고\s*싶지|먹고\s*싶지도|마시고\s*싶지도|아무것도\s*먹|아무것도\s*안|안\s*땡|안\s*끌|생각\s*없|패스\s*할)/.test(t) ||
    /금주|단주|노알콜|논알콜만|무알콜만/.test(t)
  );
}

export function isAloneUtterance(hay, text) {
  const h = String(hay || '');
  const t = String(text || '');
  return (
    /혼자\s*(?:야|마셔|마시|있어|먹어|한잔|마실|놀|달려|보내|있네|다|당|서|라|임|인데|거든|족|러)|나\s*혼자|혼술|혼맥|혼소|혼와|혼하이볼|나홀로\s*술|나홀로\s*한잔|자취방|방구석|혼자\s*조용히|혼자\s*집에서|집에서\s*혼자|퇴근하고\s*혼자|혼자만의\s*시간|혼자\s*힐링|혼자\s*먹는|혼술러|혼술족|독주/.test(h) ||
    /혼자\s*(?:야|마셔|마시|있어|먹어|한잔|놀|달려|보내|있네|라|임|인데|거든)|나\s*혼자|혼술|혼맥|혼소|혼와|나홀로\s*한잔|자취방/.test(t)
  );
}

function hasRecommendAsk(text) {
  if (isDeclineAlcohol(text, text)) return false;
  if (/먹고\s*싶지\s*않|마시고\s*싶지\s*않|먹기\s*싫|마시기\s*싫|안\s*먹고\s*싶|안\s*마시고\s*싶|먹고\s*싶지도\s*않|마시고\s*싶지도\s*않|안\s*먹을|안\s*마실/.test(text)) {
    return false;
  }
  return /추천|골라|뭐\s*마시|뭐\s*먹|먹고싶|마시고싶|한\s*잔|없나|없을까|부탁|각(?:이|임|야)?|어울리|페어링|마실\s*거|먹기\s*좋은|마시기\s*좋은|쌉파서블|쌉가능|알잘딱|알잘딱깔센|기깔난|끝내주는|없냐/.test(
    text
  );
}

function countHits(text, list) {
  let n = 0;
  const t = String(text || '');
  for (const k of list) {
    if (!k) continue;
    // 1글자 도메인 키만 경계 검사 ("회의"≠"회")
    if (k.length === 1 && /^[가-힣]$/.test(k)) {
      const re = new RegExp(`(^|[^가-힣])${k}([^가-힣]|$)`);
      if (re.test(t)) n += 1;
      continue;
    }
    if (t.includes(k)) n += 1;
  }
  return n;
}

function scoreDomain(text) {
  let score = 0;
  score += countHits(text, DOMAIN_CORE) * 3;
  score += countHits(text, DOMAIN_SOFT) * 1;
  score += countHits(text, META_APP) * 2;
  score -= countHits(text, OFFTOPIC_STRONG) * 4;
  score -= countHits(text, OFFTOPIC_SOFT) * 1;
  return score;
}

/**
 * 짧은 한글 키워드가 compact 연결어에서 오탐되는 것을 방지.
 * 예: "소주말고" ⊃ "주말"
 */
function hasKeyword(spacedText, compactText, keyword) {
  const k = String(keyword || '').trim();
  if (!k) return false;
  if (k.length === 1 && /^[가-힣]$/.test(k)) {
    const re = new RegExp(`(^|[^가-힣])${k}(?:도|은|는|가|와|랑)?([^가-힣]|$)`);
    return re.test(String(spacedText || ''));
  }
  if (k.length === 2 && /^[가-힣]+$/.test(k)) {
    // 2글자 키워드는 단어 경계 및 한국어 조사 허용 ("가을에", "겨울엔", "눈물만", "소주말고"≠"주말")
    const re = new RegExp(`(^|[^가-힣])${k}(?:에|엔|도|은|는|이|가|을|를|과|와|의|로|으로|이야|이네|이면|만|이나|이랑|부터)?([^가-힣]|$)`);
    return re.test(String(spacedText || '')) || re.test(String(compactText || ''));
  }
  return String(spacedText || '').includes(k) || String(compactText || '').includes(k);
}

function detectSignals(spacedText, compactText = '') {
  const signals = {
    moods: [],
    weather: [],
    matchedOpening: null,
    detectedEmotion: null,
    detectedSituation: null,
  };
  const spaced = String(spacedText || '');
  const compact = String(compactText || spaced.replace(/\s+/g, ''));

  for (const emo of emotionsDataJson) {
    if (emo.keywords?.some((k) => hasKeyword(spaced, compact, k))) {
      signals.detectedEmotion = emo;
      if (emo.id === 'emo_stress') signals.moods.push('stressed', 'friends', 'refresh');
      if (emo.id === 'emo_sad') signals.moods.push('sad', 'comfort', 'honsul');
      if (emo.id === 'emo_happy') signals.moods.push('happy', 'celebrate', 'friends');
      if (emo.id === 'emo_tired') signals.moods.push('tired', 'comfort', 'honsul');
      if (emo.openings?.length) {
        signals.matchedOpening = emo.openings[Math.floor(Math.random() * emo.openings.length)];
      }
      break;
    }
  }

  for (const sit of situationsDataJson) {
    if (sit.keywords?.some((k) => hasKeyword(spaced, compact, k))) {
      signals.detectedSituation = sit;
      if (sit.id === 'sit_rain') signals.weather.push('rain', 'humid');
      if (sit.id === 'sit_snow') signals.weather.push('cold', 'winter');
      if (sit.id === 'sit_autumn') {
        signals.weather.push('autumn');
        signals.moods.push('comfort');
      }
      if (sit.id === 'sit_spring') {
        signals.weather.push('spring');
        signals.moods.push('comfort');
      }
      if (sit.id === 'sit_summer') {
        signals.weather.push('summer', 'hot');
        signals.moods.push('refresh');
      }
      if (sit.id === 'sit_winter') {
        signals.weather.push('winter', 'cold');
        signals.moods.push('comfort');
      }
      if (sit.id === 'sit_hoesik') signals.moods.push('friends', 'celebrate');
      if (sit.id === 'sit_date') signals.moods.push('romantic', 'special');
      if (sit.id === 'sit_honsul') signals.moods.push('honsul', 'comfort');
      if (sit.id === 'sit_party') signals.moods.push('celebrate', 'friends', 'happy');
      if (sit.openings?.length) {
        signals.matchedOpening = sit.openings[Math.floor(Math.random() * sit.openings.length)];
      }
      break;
    }
  }

  return signals;
}

function extractHints(text) {
  const alcoholHints = [];
  for (const h of ALC_CATEGORY_HINTS) {
    if (text.includes(h)) {
      const isNegated = new RegExp(`${h}(?:은|는|이|가|도|을|를|랑|과|와|이나|나)?(?:\\s*[가-힣A-Za-z0-9]+)*\\s*(?:말고|제외|빼고|싫|별로|머리\\s*아프|숙취|뒤끝|안\\s*마|못\\s*마)`).test(text);
      if (!isNegated) alcoholHints.push(h);
    }
  }
  for (const name of ALC_NAME_HINTS) {
    if (name.length >= 2 && text.includes(name)) {
      const isNegated = new RegExp(`${name}(?:은|는|이|가|도|을|를|랑|과|와|이나|나)?(?:\\s*[가-힣A-Za-z0-9]+)*\\s*(?:말고|제외|빼고|싫|별로|머리\\s*아프|숙취|뒤끝|안\\s*마|못\\s*마)`).test(text);
      if (!isNegated) alcoholHints.push(name);
    }
  }
  if (alcoholHints.length === 0) {
    if (/말아|소맥|칵테일|하이볼/.test(text)) alcoholHints.push('하이볼');
    else if (/생맥|캔맥/.test(text)) alcoholHints.push('맥주');
  }

  const snackHints = [];
  for (const name of SNK_NAME_HINTS) {
    if (name.length >= 2 && text.includes(name)) {
      const isNegated = new RegExp(`${name}(?:은|는|이|가|도|을|를|랑|과|와|이나|나)?(?:\\s*[가-힣A-Za-z0-9]+)*\\s*(?:말고|제외|빼고|싫|별로|알레르기|알러지|못\\s*먹|절대\\s*안\\s*돼|안\\s*먹)`).test(text);
      if (!isNegated) snackHints.push(name);
    }
  }
  for (const short of SHORT_SNACKS) {
    if (short.length === 1) {
      // "운전" 안의 "전" 오탐 방지
      const re = new RegExp(`(^|[^가-힣])${short}([^가-힣]|$)`);
      if (re.test(text)) {
        const isNegated = new RegExp(`${short}(?:은|는|이|가|도|을|를|랑|과|와|이나|나)?(?:\\s*[가-힣A-Za-z0-9]+)*\\s*(?:말고|제외|빼고|싫|별로|알레르기|알러지|못\\s*먹|절대\\s*안\\s*돼|안\\s*먹)`).test(text);
        if (!isNegated) snackHints.push(short);
      }
    } else if (text.includes(short)) {
      const isNegated = new RegExp(`${short}(?:은|는|이|가|도|을|를|랑|과|와|이나|나)?(?:\\s*[가-힣A-Za-z0-9]+)*\\s*(?:말고|제외|빼고|싫|별로|알레르기|알러지|못\\s*먹|절대\\s*안\\s*돼|안\\s*먹)`).test(text);
      if (!isNegated) snackHints.push(short);
    }
  }

  // 카테고리성 안주 힌트 (구체 메뉴명 없이도 "매운 거", "얼큰한 것", "기름진 거" 등 맛/식감으로 슬롯 확보)
  if (snackHints.length === 0) {
    if (/담백|깔끔|가벼|산뜻|다이어트|샐러드/.test(text) && !/샐러드.*(?:싫|빼|제외|안)/.test(text)) snackHints.push('샐러드');
    else if (/매운|매콤|얼큰|칼칼|알싸|얼얼/.test(text) && !/안\s*매|덜\s*매|매운.*(?:싫|빼|제외|안)/.test(text)) snackHints.push('매운');
    else if (/마른|바삭|스낵|쥐포|먹태/.test(text) && !/마른.*(?:싫|빼|제외|안)/.test(text)) snackHints.push('마른');
    else if (/(?:^|[^가-힣])탕(?:$|[\s,!?~.]|[은는이가을를도랑과와만에]|먹|땡|거리|집)|(?:어묵|조개|매운|알|꽃게|홍합|나가사키)탕|국물|찌개|뜨끈한|따뜻한|따끈한/.test(text) && !/탕.*(?:싫|빼|제외|안)|국물.*(?:싫|빼|제외|안)/.test(text)) snackHints.push('탕');
    else if (/(?:^|[^가-힣])전(?:$|[\s,!?~.]|[은는이가을를도랑과와만에]|먹|땡|부쳐|집|거리)|(?:파|김치|해물|부추|감자|호박|육|배추|모둠|해물파)전|부침개|부침/.test(text) && !/전.*(?:싫|빼|제외|안)|부침.*(?:싫|빼|제외|안)/.test(text)) snackHints.push('전');
    else if (/기름진|고기|삼겹|구이|헤비/.test(text) && !/기름진.*(?:싫|빼|제외|안)|고기.*(?:싫|빼|제외|안)|안\s*기름|덜\s*기름/.test(text)) snackHints.push('고기');
  }

  const mbtiMatch = (text || '').match(/\b(INFP|ENFP|INFJ|ENFJ|INTJ|ENTJ|INTP|ENTP|ISFP|ESFP|ISFJ|ESFJ|ISTP|ESTP|ISTJ|ESTJ)\b/i);
  const mbti = mbtiMatch ? normalizeMbti(mbtiMatch[1]) : null;

  return {
    alcoholHints: uniq(alcoholHints),
    snackHints: uniq(snackHints),
    mbti,
  };
}

function extractConstraints(text) {
  const exclude = [];
  const cleanWord = (w) => (w || '').trim().replace(/(?:은|는|이|가|도|을|를|랑|과|와|이나|나)+$/, '');

  // "A 말고", "A 제외", "A 빼고", "A 사절", "A 금지"
  const excludeRe = /([가-힣A-Za-z0-9]{2,12})\s*(?:말고|제외|빼고|제외해|사절|금지)/g;
  let m;
  while ((m = excludeRe.exec(text)) !== null) {
    const word = cleanWord(m[1]);
    if (word && !EXCLUDE_STOP.has(word)) exclude.push(word);
  }
  // 알레르기 및 거부/질환/숙취 ("해산물은 알레르기 있어서", "막걸리는 머리 아프니까", "해물 못 먹어", "돼지고기 절대 안 돼")
  const allergyRe = /([가-힣A-Za-z0-9]{2,12})\s*(?:은|는|이|가|도)?\s*(?:알레르기|알러지|절대\s*안\s*돼|안\s*돼|안됨|못\s*먹|못먹|안\s*먹|머리\s*아프|숙취|뒤끝)/g;
  while ((m = allergyRe.exec(text)) !== null) {
    const word = cleanWord(m[1]);
    if (word && !EXCLUDE_STOP.has(word)) {
      exclude.push(word);
      if (word === '해산물' || word === '해물') {
        exclude.push('해산물', '해물', '생선', '조개', '회', '꽃게', '새우', '오징어', '낙지', '문어', '참치', '연어', '장어', '연포탕');
      }
      if (word === '고기') {
        exclude.push('고기', '육류', '삼겹살', '삼겹', '소고기', '돼지고기', '차돌', '갈비', '치킨', '오리');
      }
    }
  }

  // "싫다/싫어" 단독 패턴 — 동사적 부정(하기, 가기, 일하기 등)이나 세상만사 부정은 음식 제외에서 배제
  const NON_FOOD_HATE = new Set([
    '하기', '가기', '먹기', '마시기', '출근하기', '일하기', '공부하기', '살기', '생각하기', '말하기', '듣기', '보기',
    '아무것도', '아무것', '세상', '세상이', '인생', '인생이', '사람', '사람이', '모두', '다', '그냥', '너'
  ]);
  const hateRe = /([가-힣A-Za-z0-9]{2,12})\s*(?:은|는|이|가|도)?\s*(싫(?:어|다|음)?)/g;
  while ((m = hateRe.exec(text)) !== null) {
    const word = cleanWord(m[1]);
    if (word && !EXCLUDE_STOP.has(word) && !NON_FOOD_HATE.has(word) && !word.endsWith('하기') && !word.endsWith('가기') && !word.endsWith('일하기')) {
      exclude.push(word);
    }
  }

  // 다이어트/칼로리 부담 시 기름진/헤비 메뉴 자동 제외
  const isDiet = /다이어트|살\s*빼|살빼|칼로리|저칼로리|살안찌/.test(text);
  if (isDiet) {
    exclude.push('기름진', '느끼한', '피자', '치킨', '삼겹살');
  }

  // 부정 접두 파생어 ("안~", "덜~") 감지 및 제외 슬롯 자동 등록
  const notSpicy = /안\s*매[운콤워]|덜\s*매[운콤워]|안\s*맵고|맵지\s*않/.test(text);
  const notGreasy = /안\s*기름|덜\s*기름|기름기\s*없|안\s*느끼|덜\s*느끼|느끼하지\s*않|기름진.*(?:싫|빼|제외|안|별로)|느끼한.*(?:싫|빼|제외|안)/.test(text);
  const notSweet = /안\s*달[달콤]|덜\s*달[달콤]|달지\s*않|안\s*단/.test(text);
  const notHeavy = /안\s*센|덜\s*센|안\s*독한|덜\s*독한|도수\s*낮/.test(text);

  if (notSpicy) exclude.push('매운', '얼큰', '칼칼');
  if (notGreasy) exclude.push('기름진', '느끼한', '튀김');
  if (/기름진\s*고기|헤비한\s*고기|고기.*(?:싫|빼|제외|안|별로)/.test(text)) {
    exclude.push('고기', '육류', '돼지', '삼겹살', '갈비');
  }
  if (notSweet) exclude.push('달달', '달콤');
  if (notHeavy) exclude.push('독주', '센술');

  const clean = String(text || '').replace(/\s+/g, '');
  const mentionsAlcohol =
    /술|맥주|소주|와인|막걸리|하이볼|위스키|칵테일|보드카|전통주|마실|한\s*잔|도수/.test(text);
  const fullStomach = /배(?:는|가|도)?\s*(?:터질|터지겠|터져|불러|부른|부른데|불러서|부르고|가득)|배불러/.test(text);
  const wantsNonAlcDrink = /논알콜\s*(?:음료|맥주)|무알콜\s*(?:음료|맥주|칵테일)|음료/.test(text);
  const onlyAlcohol =
    (/술만|주류만|마실\s*것만|술만\s*추천/.test(text) && !/안주|먹을|요리|음식|달달|단거|디저트/.test(text)) ||
    (/약한\s*도수|센\s*거|도\s*낮은/.test(text) && !/안주|먹을|요리|음식|달달|단거|디저트/.test(text) && !fullStomach);
  const onlySnack =
    !wantsNonAlcDrink &&
    ((/안주만|밥만|식사만|안주\s*위주|음식만|야식만|먹을\s*것만|간식만|디저트만|안주만\s*추천|안주만\s*골라|안주만\s*줘|안주만\s*해줘|안주만\s*볼래|안주만\s*먹을래/.test(text) &&
      !/술\s*추천|술도/.test(text)) ||
    (isDeclineAlcohol(text, text) && /안주|야식|간식|음식|먹을|요리/.test(text)) ||
    (/안주|야식|간식|디저트/.test(text) && !mentionsAlcohol && !/논알콜|무알콜/.test(text)) ||
    /^(?:안주|음식|야식|간식|디저트)(?:만|요|만요|만골라줘|만추천해줘)?$/.test(clean));

  const preventHangover = /다음\s*날\s*숙취.*(?:없|걱정|전혀|1도|안)|숙취\s*(?:전혀\s*|1도\s*)?없|숙취\s*(?:없는|없어야|없게|없을|안생기|적은)|뒤끝\s*(?:깔끔|없는|없어야)|내일\s*출근.*숙취.*없/.test(text);
  const hangover = !preventHangover && /해장|속쓰|속\s*쓰|속이\s*안|속안좋|속\s*안\s*좋|토할|울렁|술병|더부룩|니글|느글|숙취\s*(?:있|때문|심해|심하)/.test(text);
  const heavy = !notHeavy && /센\s*술|도수\s*센|도수\s*높은|독한|센거|독주|고도수|센\s*독주|쎈거|쎈술|도수\s*높/.test(text);
  const moderate = /도수\s*(?:적당|낮은|안\s*높|보통)|너무\s*세지\s*않|부담\s*없는\s*도수|적당한\s*도수|도수도\s*적당|도수는\s*적당|도수도\s*너무\s*세면\s*안/.test(text);
  const light = !heavy && !moderate && (notGreasy || notHeavy || /담백|가벼|라이트|시원|약한\s*도수|도\s*낮은|약하게|간단|다이어트|칼로리|살\s*안\s*찌|저칼로리|가볍게|약한\s*술|약한술|약한|개운|산뜻|바삭/.test(text));
  const spicy = !notSpicy && /매운|매콤|불닭|핫|얼큰|칼칼|알싸|얼얼|매워/.test(text);
  const sweet = !notSweet && /달달|달콤|스위트|단거|디저트|달짝|새콤달콤|상큼/.test(text);
  const cheap = /싸게|저렴|가성비|싼|저가|호불호|지갑가벼|돈없|비싼\s*건\s*사절|비싼.*(?:사절|싫|빼|안)/.test(text);

  const paradox = {
    fullAndSweet: fullStomach && sweet,
    heavyAndNoHangover: heavy && preventHangover,
  };

  return {
    onlyAlcohol,
    onlySnack: onlySnack || hangover,
    nonAlcoholic: /논알콜|무알콜|술빼고|술\s*없이|알코올\s*없이|운전|논알/.test(text) || isDeclineAlcohol(text, text) || hangover,
    diet: isDiet,
    spicy,
    sweet,
    light,
    heavy,
    moderate,
    cheap,
    hangover,
    preventHangover,
    fullStomach,
    paradox,
    exclude: uniq(exclude),
  };
}

function enrichMoodsFromText(text, moods) {
  const next = [...(moods || [])];
  if (/친구|동료|회식|여러|같이\s*마시|모임|2차/.test(text)) next.push('friends', 'celebrate');
  if (/혼자|혼술|혼맥|혼소/.test(text)) next.push('honsul', 'comfort');
  if (/데이트|소개팅|연인|남친|여친|기념일/.test(text)) next.push('romantic', 'special');
  if (/파티|불금|주말|신나게|달려|달린다|집들이/.test(text)) next.push('celebrate', 'friends', 'happy');
  if (/승진|축하|대박|기분\s*좋|기분\s*최고|행복/.test(text)) next.push('happy', 'celebrate', 'special');
  if (/야근|피곤|힘들|지쳐|지쳤|울적|우울|위로|슬프/.test(text)) next.push('tired', 'comfort', 'honsul');
  if (/캠핑|글램핑|숯불/.test(text)) next.push('friends', 'happy', 'special');
  if (/가벼|라이트|약하게|약한\s*도수/.test(text)) next.push('refresh');
  return uniq(next);
}

function isGreetingUtterance(hay, clean, hasEntity, hints, nluContext) {
  if (hasEntity) return false;
  if (clean.length > 12) return false;
  // 하이볼/하이네켄/바이주 등 주류 오탐 방지
  if (/하이볼|하이네켄|하이볼ㄹ|바이주|빠이주|백주/.test(hay)) return false;

  // 1. 명확한 인사말 ("안녕하세요", "반가워", "오랜만" 등)
  if (GREETING_TOKENS.some((g) => hay.includes(g))) return true;

  // 2. '하이', 'hi', 'hello' 단독 토큰
  if (/^(하이|hi|hello)$/i.test(clean)) return true;

  // 3. '안녕', '안뇽' 등 캐주얼 인사 (대화 맥락 고려: 이전 턴이 없거나 시작 단계일 때만 인사)
  const isCasualAnnyeong = /^(안녕|안뇽|안녕안녕|안뇽안뇽)(~|!|\?|\.)*$/i.test(clean);
  if (isCasualAnnyeong) {
    const isLaterTurn = Boolean(
      (nluContext?.historyLength && nluContext.historyLength >= 2) ||
      nluContext?.hasPreviousRecommendation
    );
    // 대화가 이미 진행된 후(2턴 이상 or 추천 후)의 '안녕'은 작별 인사로 넘김
    if (isLaterTurn) return false;
    return true;
  }

  return false;
}

function isGoodbyeUtterance(hay, clean, hasEntity, hints, nluContext) {
  // 1. 주류/안주 엔티티나 힌트가 있으면 작별 인사가 아님 (예: 바이주, 빠이주, 바이엔슈테판, 바베큐 등)
  if (hasEntity) return false;
  if ((hints?.alcoholHints || []).length > 0 || (hints?.snackHints || []).length > 0) return false;
  if (/바이주|빠이주|백주|고량주|바이엔|바이젠|바베큐|바비큐|바이럴/.test(hay)) return false;
  if (/안녕하세요|안녕하세|반가워|처음이야|처음왔/.test(hay)) return false;

  // 2. 명확한 복합 작별 어구
  if (GOODBYE_MARKERS.some((g) => hay.includes(g) || clean.includes(g.replace(/\s/g, '')))) {
    return true;
  }

  // 3. '바이', '빠이', 'bye', 'byebye', '빠이빠이', '바이바이', '빠빠', 'ㅂㅂ', 'ㅃㅃ', '잘있어', '수고해' 등
  if (/^(바이|빠이|bye|byebye|바이바이|빠이빠이|빠빠|ㅂㅂ|ㅃㅃ|이만|잘있어|수고해|수고해라|수고수고)(~|!|\?|\.)*$/i.test(clean)) {
    return true;
  }
  if (/(?:^|\s)(바이|빠이|bye|byebye|ㅂㅂ|ㅃㅃ|바이바이|빠이빠이|굿바이|goodbye|빠빠|잘\s*가|잘\s*있어)(?:~|!|\?|\s|$)/i.test(hay)) {
    return true;
  }

  // 4. 대화가 진행된 상태(2턴 이상 또는 이전 추천 완료)에서 들어온 '안녕', '안뇽'은 작별 인사로 판정
  const isCasualAnnyeong = /^(안녕|안뇽|안녕안녕|안뇽안뇽)(~|!|\?|\.)*$/i.test(clean);
  if (isCasualAnnyeong) {
    const isLaterTurn = Boolean(
      (nluContext?.historyLength && nluContext.historyLength >= 2) ||
      nluContext?.hasPreviousRecommendation
    );
    if (isLaterTurn) return true;
  }

  return false;
}

/** 알아듣기 어려운 입력(자모만, 의미 약한 짧은말, 도메인 신호 0) */
function looksUnintelligible(raw, clean, hay, domainScore, hasEntity, hasConstraintSignal, recommendAsk, wantGame, signals) {
  if (hasEntity || hasConstraintSignal || recommendAsk || wantGame) return false;
  if (signals?.detectedEmotion || signals?.detectedSituation) return false;
  if ((signals?.moods || []).length > 0 || (signals?.weather || []).length > 0) return false;
  if (GUIDE_TRIGGERS.some((g) => hay.includes(g))) return false;
  if (domainScore !== 0) return false;

  const c = String(clean || '');
  const r = String(raw || '').trim();
  if (!c) return true;

  // ㅋㅎㅠㅜ / 자모만
  if (/^[ㅋㅎㅠㅜㄷㄱㄴㅇㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏ-ㅣㄱ-ㅎ]+$/i.test(c)) return true;
  // 의미 있는 한글 어절이 거의 없음
  if (!/[가-힣]{2,}/.test(r) && !/[a-z]{3,}/i.test(r)) return true;
  // 너무 짧고 도메인 단서 없음
  if (c.length <= 2) return true;
  // 도메인 점수 0인 애매한 한 줄
  return c.length <= 24;
}

/** 짧은 긍정/부정만 — "아니 맥주" 같은 문장은 제외 */
function isPureShortReply(cleanText, list, maxLen = 6) {
  if (!cleanText || cleanText.length > maxLen) return false;
  return list.some((w) => cleanText === w || cleanText === `${w}${w}` || cleanText === `${w}요`);
}

/**
 * 근처 카페/술집/맛집 등 장소 검색 의도.
 * 술·안주 페어링 추천과 구분: "근처/찾아/어디" + 업종, 또는 "카페 추천"처럼 장소명만.
 */
function detectPlaceIntent(hay, hasEntity) {
  const hasVenue = PLACE_VENUE.some((v) => hay.includes(v));
  const hasNear = PLACE_NEAR.some((v) => hay.includes(v));
  const hasFind = PLACE_FIND.some((v) => hay.includes(v));
  if (!hasVenue && !(hasNear && hasFind)) return null;

  // 술/안주 페어링 문맥이 분명하면 PLACE보다 RECOMMEND 우선
  const pairing =
    /페어링|어울리|안주|같이\s*먹|뭐\s*마시|도수는|한잔\s*추천/.test(hay) &&
    !hasNear &&
    !hasFind;
  if (pairing) return null;

  // "곱창집 추천"처럼 안주 엔티티가 있으면 페어링 추천 우선 (근처/찾아 없을 때)
  if (!hasNear && !hasFind && hasEntity) return null;

  // "맥주 추천"은 주종 추천, "카페/술집/맛집 추천"은 장소
  if (
    !hasNear &&
    !hasFind &&
    !/(카페|술집|주점|포차|호프|맛집|이자카야|와인바|위스키바|치킨집|곱창집|횟집|맥주집|가게|식당)/.test(
      hay
    )
  ) {
    return null;
  }

  const placeQuery =
    extractPlaceQueryFromText(hay) ||
    (hasVenue ? PLACE_VENUE.find((v) => hay.includes(v)) : '술집');
  return placeQuery;
}

function pickGuideHint(hints, constraints, signals, text = '') {
  if (constraints.nonAlcoholic) return 'nonalc';
  if (constraints.hangover || /해장|숙취/.test(text)) return 'hangover';
  if (constraints.onlySnack) return 'snack';
  if (constraints.onlyAlcohol) return 'alcohol';
  if (/혼술|혼자\s*마시|혼맥|혼소/.test(text) || signals.detectedSituation?.id === 'sit_honsul') {
    return 'honsul';
  }
  if (/회식|회식자리|회사\s*술|회식안주/.test(text) || signals.detectedSituation?.id === 'sit_hoesik') {
    return 'hoesik';
  }
  if (/데이트|소개팅|기념일|분위기\s*있게/.test(text) || signals.detectedSituation?.id === 'sit_date') {
    return 'date';
  }
  if (/파티|생일파티|집들이|펑펑/.test(text) || signals.detectedSituation?.id === 'sit_party') {
    return 'party';
  }
  if (/술게임|게임\s*추천|무슨\s*게임/.test(text)) return 'game_guide';
  if (signals.detectedEmotion || signals.moods?.length) return 'mood';
  if (signals.detectedSituation || signals.weather?.length) return 'situation';
  if (hints.alcoholHints.length && !hints.snackHints.length) return 'pair_snack';
  if (hints.snackHints.length && !hints.alcoholHints.length) return 'pair_drink';
  return 'general';
}

/**
 * @param {string} rawText
 * @param {string} cleanText
 * @returns {import('./schema.js').NluFrame}
 */
export function ruleNlu(rawText, cleanText, nluContext = {}) {
  const corpus = matchCorpus(rawText || '');
  // 매칭은 정규화본 중심, rawText는 프레임에 원문 보존
  const text = corpus.normalized || rawText || '';
  const clean = corpus.compact || cleanText || text.replace(/\s/g, '');
  const hay = corpus.haystack;

  // 감정/상황은 공백 유지 문장 기준(짧은 키워드 compact 오탐 방지), 힌트는 haystack
  const signals = detectSignals(`${text} ${rawText || ''}`, clean);
  const constraints = extractConstraints(text);
  const hints = extractHints(hay);
  if (constraints.exclude?.length) {
    hints.snackHints = hints.snackHints.filter((h) => !constraints.exclude.some((ex) => h === ex || h.includes(ex) || ex.includes(h)));
    hints.alcoholHints = hints.alcoholHints.filter((h) => !constraints.exclude.some((ex) => h === ex || h.includes(ex) || ex.includes(h)));
  }
  const domainScore = scoreDomain(hay);
  const hasEntity = hints.alcoholHints.length > 0 || hints.snackHints.length > 0;
  const hasConstraintSignal = Boolean(
    constraints.onlyAlcohol ||
      constraints.onlySnack ||
      constraints.nonAlcoholic ||
      constraints.spicy ||
      constraints.sweet ||
      constraints.light ||
      constraints.heavy ||
      constraints.cheap ||
      constraints.hangover ||
      constraints.preventHangover ||
      constraints.fullStomach ||
      (constraints.exclude || []).length
  );
  const recommendAsk = hasRecommendAsk(hay);
  const wantGame =
    /술게임|게임\s*추천|재밌는\s*게임|놀\s*거리|랜덤\s*게임/.test(hay) ||
    (hay.includes('게임') && domainScore >= 0);

  const declineAlcohol = isDeclineAlcohol(hay, text);
  const alone = isAloneUtterance(hay, text);

  signals.moods = enrichMoodsFromText(text, signals.moods);
  if (alone) {
    signals.moods = uniq([...signals.moods, 'honsul', 'comfort', 'quiet']);
    if (!signals.detectedSituation) {
      signals.detectedSituation = { id: 'sit_honsul', name: '혼술' };
    }
  }

  // 모순/상반된 요구(Paradox) 감지 시 바텐더의 위트 있는 오프닝 부여
  if (constraints.paradox?.fullAndSweet && constraints.paradox?.heavyAndNoHangover) {
    signals.matchedOpening = "배는 터질 것 같은데 달달한 게 당기고, 도수는 센데 다음 날 숙취는 전혀 없어야 한다니... 세상에서 제일 까다롭지만 매력적인 주문이네요! 😉\n오마주 바텐더라면 이 불가능해 보이는 난제도 완벽하게 풀어낼 수 있죠 ✨";
  } else if (constraints.paradox?.heavyAndNoHangover) {
    signals.matchedOpening = "도수는 화끈하게 센 걸 원하시면서 내일 숙취는 전혀 없어야 한다니! 불가능해 보이지만 최고급 순수 증류주라면 완벽하게 가능하죠 🍸";
  } else if (constraints.paradox?.fullAndSweet) {
    signals.matchedOpening = "배는 터질 것 같은데 달달한 게 당기시는군요! 배부르지 않으면서 달콤함을 채워줄 가벼운 디저트 페어링을 준비해드릴게요 🍰";
  }

  // --- Intent 우선순위 ---
  let intent = 'GUIDE';
  let confidence = 0.55;
  let needsClarification;
  let guideHint;
  let placeQuery;

  // 0.2) 안내 목록의 번호 선택 (1번, 2번, 3번, 4번 등)
  const isOption1 = /^(?:1|1번|①|첫번째|첫\s*번째|일번|1번으로|1번추천|1번골라)$/i.test(clean);
  const isOption2 = /^(?:2|2번|②|두번째|두\s*번째|이번|2번으로|2번추천|2번골라)$/i.test(clean);
  const isOption3 = /^(?:3|3번|③|세번째|세\s*번째|삼번|3번으로|3번추천|3번골라|주변|술집찾기)$/i.test(clean);
  const isOption4 = /^(?:4|4번|④|네번째|네\s*번째|사번|4번으로|4번추천|4번골라|논알콜|간식)$/i.test(clean);

  if (isOption1) {
    intent = 'GUIDE';
    confidence = 0.95;
    guideHint = 'general';
  } else if (isOption2) {
    intent = 'GUIDE';
    confidence = 0.95;
    guideHint = 'mood';
  } else if (isOption3) {
    intent = 'PLACE';
    confidence = 0.95;
    placeQuery = '술집';
  } else if (isOption4) {
    intent = 'RECOMMEND';
    confidence = 0.95;
    constraints.onlySnack = true;
    constraints.nonAlcoholic = true;
    guideHint = 'nonalc';
  }
  // 0.5) 술 거부 / 금주 / 술 안 땡김 의도 (추천으로 억지 전환 방지, 단 야식/안주 요청 시 안주 단독 추천)
  else if (declineAlcohol) {
    const refusesAll = /아무것도\s*(?:먹고\s*싶지|안\s*먹|마시고\s*싶지|안\s*마실)|입맛\s*없|음식.*(?:안\s*땡|생각\s*없)|세상이\s*다\s*싫/.test(hay);
    if (!refusesAll && (constraints.onlySnack || /안주|야식|간식|음식|요리|먹을/.test(hay))) {
      intent = 'RECOMMEND';
      confidence = 0.92;
      const wantsDrink = /논알콜\s*(?:음료|맥주)|무알콜\s*(?:음료|맥주|칵테일)|음료/.test(hay);
      constraints.onlySnack = !wantsDrink;
      constraints.nonAlcoholic = true;
      guideHint = wantsDrink ? 'nonalc' : 'snack';
    } else {
      intent = 'DECLINE_ALCOHOL';
      confidence = 0.94;
      guideHint = 'nonalc';
    }
  }
  // 1) 긍정/수락/결정 — "좋아 그거 먹을래", "그걸로 할래", "콜", "네"
  else if (
    AFFIRM.some((a) => clean === a || (a.length >= 3 && clean.includes(a))) ||
    /(좋아|그래|그걸로|그거로|이걸로|콜).*(먹을래|할래|줘|갈래|할게|결정|좋아|마음에|맘에|오케이)/.test(text)
  ) {
    intent = 'AFFIRM';
    confidence = 0.92;
  } else if (isPureShortReply(clean, DENY, 6)) {
    intent = 'DENY';
    confidence = 0.85;
  }
  // 1.5) 근처 가게/카페/술집 장소 검색
  else if ((placeQuery = detectPlaceIntent(hay, hasEntity))) {
    intent = 'PLACE';
    confidence = 0.9;
  }
  // 1.8) MBTI 성향 기반 추천 & 가이드
  else if (
    (text || '').match(/\b(INFP|ENFP|INFJ|ENFJ|INTJ|ENTJ|INTP|ENTP|ISFP|ESFP|ISFJ|ESFJ|ISTP|ESTP|ISTJ|ESTJ)\b/i) ||
    clean.match(/(INFP|ENFP|INFJ|ENFJ|INTJ|ENTJ|INTP|ENTP|ISFP|ESFP|ISFJ|ESFJ|ISTP|ESTP|ISTJ|ESTJ)/i) ||
    /mbti|엠비티아이|성향|유형/.test(hay)
  ) {
    const mbtiCodeMatch =
      (text || '').match(/\b(INFP|ENFP|INFJ|ENFJ|INTJ|ENTJ|INTP|ENTP|ISFP|ESFP|ISFJ|ESFJ|ISTP|ESTP|ISTJ|ESTJ)\b/i) ||
      clean.match(/(INFP|ENFP|INFJ|ENFJ|INTJ|ENTJ|INTP|ENTP|ISFP|ESFP|ISFJ|ESFJ|ISTP|ESTP|ISTJ|ESTJ)/i);
    const detectedMbti = mbtiCodeMatch ? normalizeMbti(mbtiCodeMatch[1]) : null;

    if (detectedMbti) {
      const trait = getMbtiTrait(detectedMbti);
      intent = 'RECOMMEND';
      confidence = 0.95;
      signals.matchedOpening = `${detectedMbti} (${trait.label})의 감성에 딱 맞춘 페어링이에요! ✨ ${trait.tip}`;
      hints.mbti = detectedMbti;
      if (trait.moods?.length) {
        signals.moods = uniq([...signals.moods, ...trait.moods]);
      }
      if (trait.drinkBias?.length && !hints.alcoholHints.length) {
        hints.alcoholHints = uniq([...hints.alcoholHints, ...trait.drinkBias]);
      }
      if (trait.snackBias?.length && !hints.snackHints.length) {
        hints.snackHints = uniq([...hints.snackHints, ...trait.snackBias]);
      }
    } else {
      intent = 'GUIDE';
      confidence = 0.93;
      guideHint = 'mbti';
    }
  }
  // 2) 인사/감사
  else if (isGreetingUtterance(hay, clean, hasEntity, hints, nluContext)) {
    intent = 'GREETING';
    confidence = 0.92;
  } else if (
    ['고마', '감사', '땡큐', '완벽해', '고마워', '고마워요', 'ㄱㅅ', '고맙'].some((t) => hay.includes(t)) &&
    clean.length <= 14
  ) {
    intent = 'THANKS';
    confidence = 0.9;
  }
  // 2.4) 작별/종료 (안녕하세요 및 주류/안주와 분리, 턴 맥락 반영)
  else if (isGoodbyeUtterance(hay, clean, hasEntity, hints, nluContext)) {
    intent = 'GOODBYE';
    confidence = 0.9;
  }
  // 2.5) 불만/항의 → 사과 (명확한 재추천 요청은 아래 REROLL로)
  else if (
    COMPLAINT_MARKERS.some((c) => hay.includes(c) || clean.includes(c.replace(/\s/g, ''))) &&
    !/다른거|바꿔|다시\s*추천|다시추천/.test(hay)
  ) {
    intent = 'COMPLAINT';
    confidence = 0.86;
  }
  // 3) 앱 메타 질문
  else if (META_APP.some((k) => hay.includes(k)) && !hasEntity) {
    intent = 'QUESTION';
    confidence = 0.88;
  }
  // 4) 강한 이탈 → 공감 후 오마주로 유도
  else if (domainScore <= -2 && !hasEntity) {
    intent = 'OFFTOPIC';
    confidence = 0.86;
    guideHint = 'redirect';
  }
  // 5) 리롤 / 거절 ("치킨 말고"는 제외 제약이므로 리롤 아님)
  else if (
    ['다른거', '다른거로', '다시추천', '별로야', '패스', '바꿔줘', '노잼', '틀렸'].some((r) => hay.includes(r)) ||
    ((hay.includes('다른') || hay.includes('다시') || hay.includes('별로')) &&
      !/말고|제외|빼고/.test(hay))
  ) {
    const emotionOnly =
      ['우울', '슬퍼', '화나', '짜증', '피곤', '힘들', '심심', '외로', '스트레스', '기분'].some((wm) =>
        hay.includes(wm)
      ) &&
      !hay.includes('추천') &&
      !hay.includes('술') &&
      !hay.includes('안주') &&
      !hasEntity;
    const weatherOnly =
      ['덥', '추', '비', '눈', '가을', '봄', '여름', '겨울'].some((wm) => hay.includes(wm)) &&
      !hay.includes('추천') &&
      !hay.includes('술') &&
      !hay.includes('안주') &&
      !hasEntity;
    intent = emotionOnly ? 'MOOD' : weatherOnly ? 'SMALLTALK' : 'REROLL';
    confidence = 0.8;
  }
  // 6) 기분/감정 → MOOD 전용 (추천 요청·제약이 있으면 추천 쪽으로)
  else if (
    (signals.detectedEmotion || /기분|우울|스트레스|외로|짜증|힘들|피곤|심심|속상|설레|신나|행복/.test(hay)) &&
    !hasEntity &&
    !hasConstraintSignal &&
    !wantGame &&
    !recommendAsk &&
    !/안주|술\s*추천|찾아|어디/.test(hay)
  ) {
    intent = 'MOOD';
    confidence = 0.8;
    guideHint = 'mood';
  }
  // 6.5) 날씨/계절 잡담만 SMALLTALK (기분=MOOD, 회식·데이트 등 술자리 상황은 상황 추천으로)
  else if (
    ((signals.weather || []).length > 0 ||
      ['sit_rain', 'sit_snow', 'sit_autumn', 'sit_spring', 'sit_summer', 'sit_winter'].includes(signals.detectedSituation?.id)) &&
    !signals.detectedEmotion &&
    !hasEntity &&
    !hasConstraintSignal &&
    !wantGame &&
    !recommendAsk
  ) {
    intent = 'SMALLTALK';
    confidence = 0.78;
    guideHint = 'situation';
  }
  // 7) 막연한 "추천해줘/뭐하지" (엔티티·구체 제약 없음) → 상황 확인
  else if (
    !hasEntity &&
    !hasConstraintSignal &&
    !wantGame &&
    !signals.detectedEmotion &&
    GUIDE_TRIGGERS.some((g) => hay.includes(g))
  ) {
    intent = 'GUIDE';
    confidence = 0.78;
    guideHint = pickGuideHint(hints, constraints, signals, hay);
    needsClarification = '술·안주·상황 중 어떤 힌트를 줄까요?';
  }
  // 8) 명확한 추천 신호 + 엔티티/제약/게임/추천 요청 / 혼술 상황
  else if (
    !declineAlcohol &&
    (
      hasEntity ||
      hasConstraintSignal ||
      wantGame ||
      recommendAsk ||
      alone ||
      (signals.detectedSituation && !['sit_rain', 'sit_snow', 'sit_autumn', 'sit_spring', 'sit_summer', 'sit_winter'].includes(signals.detectedSituation.id)) ||
      (!/먹고\s*싶지\s*않|마시고\s*싶지\s*않|먹고\s*싶지도\s*않|마시고\s*싶지도\s*않|안\s*먹고\s*싶|안\s*마시고\s*싶/.test(hay) &&
       /페어링|어울리|당기|땡겨|마실래|먹고싶|마시고싶|한\s*잔|마실\s*술|마실술|술도|마실거|마실것|음식|2차|축하|기념|구울|캠핑/.test(hay) && domainScore >= 1)
    )
  ) {
    intent = 'RECOMMEND';
    confidence = hasEntity || hasConstraintSignal || alone || recommendAsk ? 0.88 : 0.75;
  }
  // 9) 도메인 힌트가 있고 특정 방향이 보임 → 1단계: 명확화 (후보 제시)
  else if (domainScore > 0 && !hasEntity) {
    guideHint = pickGuideHint(hints, constraints, signals, hay);
    if (guideHint && guideHint !== 'general') {
      intent = 'CLARIFY';
      confidence = 0.75;
    } else {
      intent = 'CLARIFY';
      confidence = 0.72;
    }
  }
  // 9.5) 엉뚱한 질문 / 도메인 밖 질문 / 세상만사 잡담 / 매칭되지 않는 일반 일상어 → Witty Chit-chat
  else {
    if (/도움말|사용법|기능|뭘\s*할수|뭐할수|할수있는게|가이드|메뉴판/.test(hay)) {
      intent = 'CAPABILITY_GUIDE';
      confidence = 0.85;
      guideHint = 'general';
    } else {
      intent = 'WITTY_CHITCHAT';
      confidence = 0.82;
      guideHint = 'redirect';
    }
  }

  // 엔티티가 있으면 이탈로 오분류된 경우 추천으로 교정
  if (hasEntity && (intent === 'OFFTOPIC' || intent === 'WITTY_CHITCHAT' || intent === 'UNKNOWN')) {
    intent = 'RECOMMEND';
    confidence = Math.max(confidence, 0.82);
  }

  return emptyFrame({
    intent,
    slots: {
      alcoholHints: hints.alcoholHints,
      snackHints: hints.snackHints,
      mbti: hints.mbti,
      wantGame,
      moods: uniq(signals.moods),
      weather: uniq(signals.weather),
      constraints,
      placeQuery: intent === 'PLACE' ? placeQuery : undefined,
    },
    confidence,
    domainScore,
    needsClarification,
    guideHint,
    source: 'rule',
    rawText: rawText || text,
    matchedOpening: signals.matchedOpening,
  });
}

export { detectSignals, scoreDomain };
export { matchCorpus, normalizeKorean } from './normalizeKorean.js';
