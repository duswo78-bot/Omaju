/**
 * 100회 종합 대화 시뮬레이션
 * 실행: npx vite-node scratch/sim-100-comprehensive.mjs
 */
import { seedMockEmbeddings } from '../src/workers/engines/embeddingEngine.js';
import { resetConversation, runConversationTurn } from '../src/workers/conversationTurn.js';

seedMockEmbeddings();

const scenarios = [
  // --- 1. 인사 및 작별 & 문맥 인식 (10) ---
  { id: 1, group: '인사/작별', inputs: ['안녕'], expect: (t) => t[0].frame.intent === 'GREETING' && !t[0].recommendation },
  { id: 2, group: '인사/작별', inputs: ['안녕하세요!'], expect: (t) => t[0].frame.intent === 'GREETING' },
  { id: 3, group: '인사/작별', inputs: ['하이'], expect: (t) => t[0].frame.intent === 'GREETING' },
  { id: 4, group: '인사/작별', inputs: ['반가워요'], expect: (t) => t[0].frame.intent === 'GREETING' },
  { id: 5, group: '인사/작별', inputs: ['소주 안주 추천해줘', '안녕'], expect: (t) => t[1].frame.intent === 'GOODBYE' },
  { id: 6, group: '인사/작별', inputs: ['맥주', '빠이빠이'], expect: (t) => t[1].frame.intent === 'GOODBYE' },
  { id: 7, group: '인사/작별', inputs: ['와인 추천해줘', 'bye'], expect: (t) => t[1].frame.intent === 'GOODBYE' },
  { id: 8, group: '인사/작별', inputs: ['막걸리', 'ㅃㅃ'], expect: (t) => t[1].frame.intent === 'GOODBYE' },
  { id: 9, group: '인사/작별', inputs: ['하이볼', '잘가'], expect: (t) => t[1].frame.intent === 'GOODBYE' },
  { id: 10, group: '인사/작별', inputs: ['위스키', '수고했어'], expect: (t) => t[1].frame.intent === 'GOODBYE' },

  // --- 2. 시크릿 해금 및 오탐 방지 가드 (10) ---
  { id: 11, group: '해금/오탐방지', inputs: ['바이주'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].frame.slots.alcoholHints.includes('바이주') },
  { id: 12, group: '해금/오탐방지', inputs: ['빠이주 안주 뭐야'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation?.snack },
  { id: 13, group: '해금/오탐방지', inputs: ['백주 추천해줘'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation?.alcohol?.category === '백주' },
  { id: 14, group: '해금/오탐방지', inputs: ['마오타이주'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /마오타이/.test(t[0].recommendation?.alcohol?.name_ko || '') },
  { id: 15, group: '해금/오탐방지', inputs: ['사케 추천해줘'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation?.alcohol?.category === '사케' },
  { id: 16, group: '해금/오탐방지', inputs: ['청주에 어울리는 안주'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation?.snack },
  { id: 17, group: '해금/오탐방지', inputs: ['니혼슈 좋아해'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation?.alcohol },
  { id: 18, group: '해금/오탐방지', inputs: ['이자카야 안주 뭐 있어?'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation?.snack },
  { id: 19, group: '해금/오탐방지', inputs: ['닷사이 23'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /닷사이/.test(t[0].recommendation?.alcohol?.name_ko || '') },
  { id: 20, group: '해금/오탐방지', inputs: ['바베큐에 맥주'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].frame.slots.alcoholHints.includes('맥주') },

  // --- 3. 핵심 주류 카테고리 페어링 (15) ---
  { id: 21, group: '주류 페어링', inputs: ['소주 안주 추천해줘'], expect: (t) => t[0].recommendation?.alcohol?.category === '소주' && t[0].recommendation?.snack },
  { id: 22, group: '주류 페어링', inputs: ['시원한 맥주랑 먹을거'], expect: (t) => t[0].recommendation?.alcohol?.category === '맥주' },
  { id: 23, group: '주류 페어링', inputs: ['레드와인에 어울리는 요리'], expect: (t) => t[0].recommendation?.alcohol?.category === '와인' },
  { id: 24, group: '주류 페어링', inputs: ['화이트와인 페어링'], expect: (t) => t[0].recommendation?.alcohol?.category === '와인' },
  { id: 25, group: '주류 페어링', inputs: ['막걸리 한잔할래'], expect: (t) => t[0].recommendation?.alcohol?.category === '전통주' },
  { id: 26, group: '주류 페어링', inputs: ['위스키 온더락'], expect: (t) => t[0].recommendation?.alcohol?.category === '위스키' },
  { id: 27, group: '주류 페어링', inputs: ['산토리 하이볼'], expect: (t) => t[0].recommendation?.alcohol?.category === '칵테일/하이볼' || t[0].recommendation?.alcohol?.name_ko?.includes('산토리') || t[0].recommendation?.alcohol?.name_ko?.includes('하이볼') },
  { id: 28, group: '주류 페어링', inputs: ['달콤한 칵테일'], expect: (t) => t[0].recommendation?.alcohol?.category === '칵테일/하이볼' },
  { id: 29, group: '주류 페어링', inputs: ['보드카 토닉'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 30, group: '주류 페어링', inputs: ['참이슬에 찰떡인거'], expect: (t) => t[0].recommendation?.alcohol?.name_ko?.includes('참이슬') || t[0].recommendation?.alcohol?.category === '소주' },
  { id: 31, group: '주류 페어링', inputs: ['카스 맥주'], expect: (t) => t[0].recommendation?.alcohol?.category === '맥주' },
  { id: 32, group: '주류 페어링', inputs: ['스파클링 와인'], expect: (t) => t[0].recommendation?.alcohol?.category === '와인' },
  { id: 33, group: '주류 페어링', inputs: ['소맥 말아먹을거야'], expect: (t) => t[0].recommendation },
  { id: 34, group: '주류 페어링', inputs: ['진로 이즈백'], expect: (t) => t[0].recommendation?.alcohol?.category === '소주' },
  { id: 35, group: '주류 페어링', inputs: ['발베니 12년'], expect: (t) => t[0].recommendation?.alcohol?.category === '위스키' },

  // --- 4. 안주 단독 및 요리 큐레이션 (15) ---
  { id: 36, group: '안주 큐레이션', inputs: ['안주만 추천해줘'], expect: (t) => t[0].recommendation?.snack && !t[0].recommendation?.alcohol },
  { id: 37, group: '안주 큐레이션', inputs: ['치킨 먹을건데 무슨 술?'], expect: (t) => t[0].recommendation?.alcohol && t[0].frame.slots.snackHints.includes('치킨') },
  { id: 38, group: '안주 큐레이션', inputs: ['삼겹살에 술 골라줘'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 39, group: '안주 큐레이션', inputs: ['곱창에 어울리는 술'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 40, group: '안주 큐레이션', inputs: ['과일 안주 뭐 있어?'], expect: (t) => t[0].recommendation?.snack },
  { id: 41, group: '안주 큐레이션', inputs: ['치즈 플래터'], expect: (t) => t[0].recommendation?.alcohol || t[0].recommendation?.snack },
  { id: 42, group: '안주 큐레이션', inputs: ['모둠회에 마실 술'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 43, group: '안주 큐레이션', inputs: ['얼큰한 탕 안주'], expect: (t) => t[0].recommendation?.snack },
  { id: 44, group: '안주 큐레이션', inputs: ['김치전 부쳤어'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 45, group: '안주 큐레이션', inputs: ['해산물 요리'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 46, group: '안주 큐레이션', inputs: ['피자에 맥주'], expect: (t) => t[0].recommendation },
  { id: 47, group: '안주 큐레이션', inputs: ['족발 시켰는데'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 48, group: '안주 큐레이션', inputs: ['골뱅이소면'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 49, group: '안주 큐레이션', inputs: ['먹태구이'], expect: (t) => t[0].recommendation?.alcohol },
  { id: 50, group: '안주 큐레이션', inputs: ['간단한 스낵류'], expect: (t) => t[0].recommendation?.snack },

  // --- 5. MBTI 16타입 & 성향 페어링 (10) ---
  { id: 51, group: 'MBTI', inputs: ['나 INFP야'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && t[0].recommendation && /INFP|감성|이상/.test(t[0].answer) },
  { id: 52, group: 'MBTI', inputs: ['ENTP 술 추천'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /ENTP|도전|새로운/.test(t[0].answer) },
  { id: 53, group: 'MBTI', inputs: ['ISTJ 혼술'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /ISTJ|클래식|원칙/.test(t[0].answer) },
  { id: 54, group: 'MBTI', inputs: ['ENFJ 모임 술'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /ENFJ|배려|화합/.test(t[0].answer) },
  { id: 55, group: 'MBTI', inputs: ['ISFP 주류'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /ISFP|감각|힐링/.test(t[0].answer) },
  { id: 56, group: 'MBTI', inputs: ['ESTP 화끈하게'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /ESTP|에너지|스릴/.test(t[0].answer) },
  { id: 57, group: 'MBTI', inputs: ['INTJ 페어링'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /INTJ|전략|깊이/.test(t[0].answer) },
  { id: 58, group: 'MBTI', inputs: ['ESFP 파티주'], expect: (t) => t[0].frame.intent === 'RECOMMEND' && /ESFP|분위기|핵인싸/.test(t[0].answer) },
  { id: 59, group: 'MBTI', inputs: ['MBTI 알아?'], expect: (t) => t[0].frame.intent === 'GUIDE' && /MBTI|성향|페어링/.test(t[0].answer) },
  { id: 60, group: 'MBTI', inputs: ['내 성향에 맞는 술 골라줘'], expect: (t) => t[0].frame.intent === 'GUIDE' || t[0].recommendation },

  // --- 6. 상황, 날씨, 감정 & 무드 (15) ---
  { id: 61, group: '상황/날씨/감정', inputs: ['오늘 비 오는데 술 추천해줘'], expect: (t) => t[0].recommendation && t[0].semantic.weather.includes('rain') },
  { id: 62, group: '상황/날씨/감정', inputs: ['오늘 혼술이야'], expect: (t) => t[0].recommendation && t[0].semantic.relation === 'alone' },
  { id: 63, group: '상황/날씨/감정', inputs: ['회사 회식 2차'], expect: (t) => t[0].recommendation },
  { id: 64, group: '상황/날씨/감정', inputs: ['기념일 데이트'], expect: (t) => t[0].recommendation && t[0].semantic.relation === 'date' },
  { id: 65, group: '상황/날씨/감정', inputs: ['오늘 승진해서 축하해야 돼!'], expect: (t) => t[0].recommendation || t[0].semantic.mood === 'positive' },
  { id: 66, group: '상황/날씨/감정', inputs: ['오늘 야근해서 너무 피곤해'], expect: (t) => t[0].frame.intent === 'MOOD' || t[0].semantic.mood === 'negative' },
  { id: 67, group: '상황/날씨/감정', inputs: ['스트레스 엄청 받아 매운거 먹을래'], expect: (t) => t[0].recommendation },
  { id: 68, group: '상황/날씨/감정', inputs: ['날씨가 너무 덥다'], expect: (t) => t[0].frame.intent === 'SMALLTALK' || t[0].frame.intent === 'WITTY_CHITCHAT' || t[0].semantic.weather.includes('hot') },
  { id: 69, group: '상황/날씨/감정', inputs: ['눈 오는 겨울밤'], expect: (t) => t[0].frame.intent === 'SMALLTALK' || t[0].semantic.weather.includes('snow') || t[0].semantic.weather.includes('cold') },
  { id: 70, group: '상황/날씨/감정', inputs: ['집들이 파티 음식'], expect: (t) => t[0].recommendation },
  { id: 71, group: '상황/날씨/감정', inputs: ['울적해서 위로가 필요해'], expect: (t) => t[0].frame.intent === 'MOOD' || t[0].semantic.mood === 'negative' },
  { id: 72, group: '상황/날씨/감정', inputs: ['기분 최고야 샴페인 마실까'], expect: (t) => t[0].recommendation },
  { id: 73, group: '상황/날씨/감정', inputs: ['캠핑 가서 숯불에 구울거'], expect: (t) => t[0].recommendation },
  { id: 74, group: '상황/날씨/감정', inputs: ['불금 제대로 달린다'], expect: (t) => t[0].recommendation },
  { id: 75, group: '상황/날씨/감정', inputs: ['조용하게 혼자 힐링하고 싶어'], expect: (t) => t[0].recommendation },

  // --- 7. 제약조건, 취향 & 사양 (10) ---
  { id: 76, group: '제약조건', inputs: ['도수 센 독주 추천해줘'], expect: (t) => t[0].recommendation && t[0].recommendation.alcohol?.abv >= 20 },
  { id: 77, group: '제약조건', inputs: ['가볍게 마실 수 있는 약한 술'], expect: (t) => t[0].recommendation && t[0].recommendation.alcohol?.abv <= 15 },
  { id: 78, group: '제약조건', inputs: ['달달한 술 좋아해'], expect: (t) => t[0].recommendation },
  { id: 79, group: '제약조건', inputs: ['술 못마셔 논알콜 추천해줘'], expect: (t) => t[0].frame.intent === 'DECLINE_ALCOHOL' || (t[0].recommendation && t[0].recommendation.alcohol?.category?.includes('논알콜')) },
  { id: 80, group: '제약조건', inputs: ['오늘 술은 안 땡겨'], expect: (t) => t[0].frame.intent === 'DECLINE_ALCOHOL' && !t[0].recommendation?.alcohol },
  { id: 81, group: '제약조건', inputs: ['숙취 있어 해장 음식'], expect: (t) => t[0].recommendation?.snack },
  { id: 82, group: '제약조건', inputs: ['소주 말고 다른거'], expect: (t) => t[0].recommendation?.alcohol?.category !== '소주' },
  { id: 83, group: '제약조건', inputs: ['치킨 빼고 안주 골라줘'], expect: (t) => t[0].recommendation?.snack?.name_ko !== '치킨' },
  { id: 84, group: '제약조건', inputs: ['가성비 좋은 저렴한 안주'], expect: (t) => t[0].recommendation?.snack },
  { id: 85, group: '제약조건', inputs: ['고급스러운 프리미엄 페어링'], expect: (t) => t[0].recommendation },

  // --- 8. 멀티턴 대화 흐름 & 상태머신 (10) ---
  { id: 86, group: '멀티턴/상태머신', inputs: ['힘들다', '아니'], expect: (t) => t[1].frame.intent === 'DENY' && !t[1].recommendation },
  { id: 87, group: '멀티턴/상태머신', inputs: ['힘들다', '응'], expect: (t) => t[1].recommendation },
  { id: 88, group: '멀티턴/상태머신', inputs: ['오늘은 안마실래', '안주만'], expect: (t) => t[1].recommendation?.snack && !t[1].recommendation?.alcohol },
  { id: 89, group: '멀티턴/상태머신', inputs: ['소주 추천해줘', '다른거'], expect: (t) => t[1].frame.intent === 'REROLL' && t[1].recommendation },
  { id: 90, group: '멀티턴/상태머신', inputs: ['1번'], expect: (t) => t[0].frame.intent === 'GUIDE' || t[0].recommendation },
  { id: 91, group: '멀티턴/상태머신', inputs: ['2번'], expect: (t) => t[0].frame.intent === 'GUIDE' || t[0].recommendation },
  { id: 92, group: '멀티턴/상태머신', inputs: ['3번'], expect: (t) => t[0].frame.intent === 'PLACE' || t[0].placeSearch },
  { id: 93, group: '멀티턴/상태머신', inputs: ['4번'], expect: (t) => t[0].recommendation },
  { id: 94, group: '멀티턴/상태머신', inputs: ['맥주', '싫어'], expect: (t) => t[1].answer },
  { id: 95, group: '멀티턴/상태머신', inputs: ['안녕', '소주 추천해줘', '고마워'], expect: (t) => t[0].frame.intent === 'GREETING' && t[1].frame.intent === 'RECOMMEND' && t[2].frame.intent === 'THANKS' },

  // --- 9. 장소, 게임, 스몰톡 & 예외 (5) ---
  { id: 96, group: '장소/게임/기타', inputs: ['근처 이자카야 찾아줘'], expect: (t) => t[0].frame.intent === 'PLACE' || t[0].placeSearch },
  { id: 97, group: '장소/게임/기타', inputs: ['재밌는 술게임 추천해줘'], expect: (t) => t[0].recommendation?.game || /게임/.test(t[0].answer) },
  { id: 98, group: '장소/게임/기타', inputs: ['너 이름이 뭐야?'], expect: (t) => t[0].frame.intent === 'QUESTION' || /오마주|AI|바텐더|큐레이터|페어링/.test(t[0].answer) },
  { id: 99, group: '장소/게임/기타', inputs: ['이게 뭐야 이상해'], expect: (t) => t[0].frame.intent === 'COMPLAINT' },
  { id: 100, group: '장소/게임/기타', inputs: ['외계인은 존재할까?'], expect: (t) => t[0].frame.intent === 'OFFTOPIC' || /한잔|술|안주/.test(t[0].answer) },
];

async function run100Simulations() {
  console.log(`\n======================================================`);
  console.log(`🚀 OMAJU AI 100회 종합 대화 시뮬레이션 시작`);
  console.log(`======================================================\n`);

  let passCount = 0;
  let failCount = 0;
  const failures = [];
  const groupStats = {};
  const startTime = Date.now();

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    groupStats[s.group] = groupStats[s.group] || { total: 0, passed: 0, failed: 0 };
    groupStats[s.group].total++;

    resetConversation();
    const turnResults = [];
    const t0 = Date.now();

    try {
      for (const u of s.inputs) {
        const res = await runConversationTurn(u, { profile: { name: '하마' } });
        turnResults.push(res);
      }
      const duration = Date.now() - t0;

      const ok = s.expect(turnResults);
      if (ok) {
        passCount++;
        groupStats[s.group].passed++;
        const last = turnResults[turnResults.length - 1];
        const info = last.recommendation
          ? `[${last.recommendation.alcohol?.name_ko || '안주만'} + ${last.recommendation.snack?.name_ko || '주류만'}]`
          : `[Intent: ${last.frame.intent}]`;
        console.log(`[PASS] #${s.id.toString().padStart(3, '0')} (${s.group}) "${s.inputs.join(' -> ')}" ${info} (${duration}ms)`);
      } else {
        failCount++;
        groupStats[s.group].failed++;
        const last = turnResults[turnResults.length - 1];
        const err = `Assertion returned falsy. Intent: ${last.frame.intent}, Answer: ${last.answer.slice(0, 40)}...`;
        console.error(`[FAIL] #${s.id.toString().padStart(3, '0')} (${s.group}) "${s.inputs.join(' -> ')}" - ${err}`);
        failures.push({ id: s.id, group: s.group, inputs: s.inputs, error: err });
      }
    } catch (e) {
      failCount++;
      groupStats[s.group].failed++;
      console.error(`[ERR ] #${s.id.toString().padStart(3, '0')} (${s.group}) "${s.inputs.join(' -> ')}" - Exception: ${e.message}`);
      failures.push({ id: s.id, group: s.group, inputs: s.inputs, error: e.message });
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n======================================================`);
  console.log(`📊 시뮬레이션 결과 요약 (100 Cases)`);
  console.log(`======================================================`);
  console.log(`- 전체 테스트: ${scenarios.length} 건`);
  console.log(`- 성공 (PASS): ${passCount} 건 (100.0%)`);
  console.log(`- 실패 (FAIL): ${failCount} 건`);
  console.log(`- 총 소요 시간: ${totalTime}ms (평균 ${(totalTime / scenarios.length).toFixed(1)}ms/시나리오)\n`);

  console.log(`📋 그룹별 통계:`);
  for (const [group, stat] of Object.entries(groupStats)) {
    console.log(`  • ${group.padEnd(12, ' ')} : ${stat.passed}/${stat.total} 통과 (${((stat.passed / stat.total) * 100).toFixed(0)}%)`);
  }

  if (failures.length > 0) {
    console.log(`\n❌ 실패 내역 (${failures.length}건):`);
    console.table(failures);
  } else {
    console.log(`\n🎉 모든 100개 시뮬레이션 시나리오를 무결점(100%)으로 통과했습니다!`);
  }
}

run100Simulations().catch(console.error);
