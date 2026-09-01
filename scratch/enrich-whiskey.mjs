import fs from 'fs';

const alcoholsPath = 'src/data/alcohols.json';
const snacksPath = 'src/data/snacks.json';

const alcohols = JSON.parse(fs.readFileSync(alcoholsPath, 'utf8'));
const snacks = JSON.parse(fs.readFileSync(snacksPath, 'utf8'));

// 1. New diverse whiskey lineup
const newWhiskies = [
  {
    id: "alc_whiskey_balvenie",
    name_ko: "발베니 12년 더블우드",
    name_en: "The Balvenie 12 DoubleWood",
    category: "위스키",
    subCategory: "싱글몰트",
    abv: 40,
    sweetness: 3,
    body: 4,
    carbonation: 0,
    country: "스코틀랜드",
    priceLevel: 4,
    moods: ["special", "comfort", "romantic", "honsul"],
    weather: ["autumn", "winter", "rain", "cool"],
    tags: ["위스키", "싱글몰트", "달콤한오크", "고급", "혼술추천", "클래식"],
    pairings: ["snk_dark_chocolate", "snk_baked_brie", "snk_cheese_platter", "snk_steak", "snk_user_1783696077714_8ffb"]
  },
  {
    id: "alc_whiskey_macallan",
    name_ko: "맥캘란 12년 셰리오크",
    name_en: "The Macallan 12 Sherry Oak",
    category: "위스키",
    subCategory: "싱글몰트",
    abv: 40,
    sweetness: 3,
    body: 5,
    carbonation: 0,
    country: "스코틀랜드",
    priceLevel: 5,
    moods: ["special", "romantic", "celebrate", "comfort"],
    weather: ["winter", "autumn", "cool", "rain"],
    tags: ["위스키", "셰리캐스크", "묵직한풍미", "선물용", "고급", "기념일"],
    pairings: ["snk_dark_chocolate", "snk_jamon_melon", "snk_user_1783696077714_2jtz", "snk_cheese_platter", "snk_steak"]
  },
  {
    id: "alc_whiskey_glenfiddich",
    name_ko: "글렌피딕 12년",
    name_en: "Glenfiddich 12 Year Old",
    category: "위스키",
    subCategory: "싱글몰트",
    abv: 40,
    sweetness: 2,
    body: 3,
    carbonation: 0,
    country: "스코틀랜드",
    priceLevel: 4,
    moods: ["refresh", "happy", "honsul", "friends"],
    weather: ["spring", "summer", "cool"],
    tags: ["위스키", "싱글몰트", "청사과향", "입문용위스키", "트렌디"],
    pairings: ["snk_salmon_carpaccio_extra", "snk_user_1783696077714_xpn1", "snk_cheese_platter", "snk_truffle_fries", "snk_user_1783696077714_xwdf"]
  },
  {
    id: "alc_whiskey_johnnie_black",
    name_ko: "조니워커 블랙 라벨",
    name_en: "Johnnie Walker Black Label",
    category: "위스키",
    subCategory: "블렌디드",
    abv: 40,
    sweetness: 2,
    body: 4,
    carbonation: 0,
    country: "스코틀랜드",
    priceLevel: 3,
    moods: ["friends", "comfort", "honsul", "hoesik"],
    weather: ["cool", "rain", "winter"],
    tags: ["위스키", "블렌디드", "스모키", "하이볼추천", "가성비", "스테디셀러"],
    pairings: ["snk_meoktae", "snk_user_1783696077714_8mc4", "snk_truffle_fries", "snk_user_1783696077714_2jtz", "snk_steak"]
  },
  {
    id: "alc_whiskey_wild_turkey",
    name_ko: "와일드터키 101",
    name_en: "Wild Turkey 101",
    category: "위스키",
    subCategory: "버번",
    abv: 50.5,
    sweetness: 3,
    body: 5,
    carbonation: 0,
    country: "미국",
    priceLevel: 3,
    moods: ["stress", "honsul", "friends", "celebrate"],
    weather: ["winter", "autumn", "cool"],
    tags: ["위스키", "버번", "고도수", "강렬한바닐라", "스트레스해소", "남성미"],
    pairings: ["snk_beef_tartare", "snk_steak", "snk_pecan_pie", "snk_user_1783696077714_8mc4", "snk_dark_chocolate"]
  },
  {
    id: "alc_whiskey_jack_daniels",
    name_ko: "잭 다니엘스 올드 No.7",
    name_en: "Jack Daniel's Old No.7",
    category: "위스키",
    subCategory: "테네시",
    abv: 40,
    sweetness: 3,
    body: 4,
    carbonation: 0,
    country: "미국",
    priceLevel: 3,
    moods: ["party", "friends", "movie", "happy"],
    weather: ["summer", "spring", "cool"],
    tags: ["위스키", "잭콕", "달콤한카라멜", "파티인기", "클래식"],
    pairings: ["snk_nacho", "snk_truffle_fries", "snk_user_1783696077714_bn24", "snk_cheese_stick", "snk_user_1783696077714_8ffb"]
  },
  {
    id: "alc_whiskey_jameson",
    name_ko: "제임슨 스탠다드",
    name_en: "Jameson Irish Whiskey",
    category: "위스키",
    subCategory: "아이리시",
    abv: 40,
    sweetness: 2,
    body: 2,
    carbonation: 0,
    country: "아일랜드",
    priceLevel: 2,
    moods: ["friends", "happy", "refresh", "party"],
    weather: ["spring", "summer", "cool"],
    tags: ["위스키", "아이리시", "부드러움", "가성비", "하이볼황제", "이지드링크"],
    pairings: ["snk_truffle_fries", "snk_user_1783696077714_xwdf", "snk_user_1783696077714_8ffb", "snk_meoktae"]
  },
  {
    id: "alc_whiskey_suntory",
    name_ko: "산토리 가쿠빈",
    name_en: "Suntory Kakubin",
    category: "위스키",
    subCategory: "재패니즈",
    abv: 40,
    sweetness: 1,
    body: 3,
    carbonation: 0,
    country: "일본",
    priceLevel: 3,
    moods: ["honsul", "friends", "refresh", "happy"],
    weather: ["summer", "spring", "rain"],
    tags: ["위스키", "가쿠하이볼", "이자카야필수", "깔끔함", "이자카야안주찰떡"],
    pairings: ["snk_user_1783696077714_8mc4", "snk_truffle_fries", "snk_salmon", "snk_meoktae", "snk_user_1783696077714_xwdf"]
  },
  {
    id: "alc_whiskey_laphroaig",
    name_ko: "라프로익 10년",
    name_en: "Laphroaig 10 Year Old",
    category: "위스키",
    subCategory: "아일라 싱글몰트",
    abv: 40,
    sweetness: 1,
    body: 5,
    carbonation: 0,
    country: "스코틀랜드",
    priceLevel: 5,
    moods: ["special", "honsul", "stress"],
    weather: ["winter", "rain", "autumn"],
    tags: ["위스키", "피트위스키", "스모키", "매니아추천", "개성만점", "깊은여운"],
    pairings: ["snk_user_1783696077714_zwrx", "snk_user_1783696077714_xpn1", "snk_dark_chocolate", "snk_user_1783696077714_2jtz", "snk_baked_brie"]
  }
];

// Update alcohols list without duplicate IDs
const existingIds = new Set(alcohols.map(a => a.id));
for (const w of newWhiskies) {
  if (!existingIds.has(w.id)) {
    alcohols.push(w);
  }
}

// Also update alc_whiskey_shot with richer pairings
const shotIndex = alcohols.findIndex(a => a.id === 'alc_whiskey_shot');
if (shotIndex >= 0) {
  alcohols[shotIndex].pairings = [
    "snk_dark_chocolate",
    "snk_baked_brie",
    "snk_cheese_platter",
    "snk_jamon_melon",
    "snk_steak",
    "snk_user_1783696077714_2jtz",
    "snk_user_1783696077714_8ffb",
    "snk_meoktae",
    "snk_truffle_fries"
  ];
}

// 2. New luxury and popular whiskey pairing snacks
const newSnacks = [
  {
    id: "snk_dark_chocolate",
    name_ko: "다크 생초콜릿",
    name_en: "Dark Pave Chocolate",
    category: "위스키안주",
    spicy: 0,
    greasy: 2,
    sweet: 3,
    bestDrinks: [
      "alc_whiskey_shot",
      "alc_whiskey_balvenie",
      "alc_whiskey_macallan",
      "alc_whiskey_wild_turkey",
      "alc_whiskey_laphroaig"
    ],
    moods: ["romantic", "special", "honsul", "comfort"],
    weather: ["winter", "autumn", "rain", "cool"],
    tags: ["위스키안주", "디저트", "달콤쌉싸름", "고급", "로맨틱", "위스키짝꿍"],
    recipe: {
      time: "20분",
      difficulty: "초급",
      ingredients: ["다크초콜릿 200g", "생크림 100ml", "무가당 코코아파우더 약간", "버터 10g"],
      steps: [
        "생크림을 냄비에 넣고 가장자리가 끓어오를 때까지 데웁니다.",
        "잘게 썬 다크초콜릿에 데운 생크림과 버터를 넣고 부드럽게 녹여줍니다.",
        "사각 틀에 유산지를 깔고 초콜릿을 부어 냉장고에서 2시간 이상 굳힙니다.",
        "한 입 크기로 깍둑썰기한 후 코코아파우더를 골고루 묻혀 완성합니다."
      ]
    }
  },
  {
    id: "snk_baked_brie",
    name_ko: "구운 브리치즈 & 견과류",
    name_en: "Baked Brie with Honey & Nuts",
    category: "위스키안주",
    spicy: 0,
    greasy: 3,
    sweet: 3,
    bestDrinks: [
      "alc_whiskey_balvenie",
      "alc_whiskey_macallan",
      "alc_whiskey_shot",
      "alc_whiskey_laphroaig"
    ],
    moods: ["special", "romantic", "comfort", "honsul"],
    weather: ["winter", "autumn", "cool"],
    tags: ["위스키안주", "치즈", "달콤고소", "비주얼안주", "와인위스키공용"],
    recipe: {
      time: "15분",
      difficulty: "초급",
      ingredients: ["통 브리치즈 1개", "호두/아몬드/피칸 한 줌", "꿀 2큰술", "로즈마리 약간", "크래커"],
      steps: [
        "브리치즈 윗면에 격자무늬로 칼집을 냅니다.",
        "오븐용 용기에 치즈를 올리고 견과류와 로즈마리를 얹은 뒤 꿀을 듬뿍 뿌립니다.",
        "180도로 예열된 에어프라이어나 오븐에서 8~10분간 치즈가 부드럽게 녹을 때까지 굽습니다.",
        "따뜻할 때 바삭한 크래커에 얹어 위스키와 함께 곁들입니다."
      ]
    }
  },
  {
    id: "snk_jamon_melon",
    name_ko: "하몽 멜론 플래터",
    name_en: "Jamon & Melon Platter",
    category: "위스키안주",
    spicy: 0,
    greasy: 2,
    sweet: 4,
    bestDrinks: [
      "alc_whiskey_macallan",
      "alc_whiskey_glenfiddich",
      "alc_whiskey_shot",
      "alc_whiskey_balvenie"
    ],
    moods: ["special", "romantic", "happy", "refresh"],
    weather: ["summer", "spring", "cool"],
    tags: ["위스키안주", "단짠조합", "고급플래터", "와인위스키공용", "홈파티"],
    recipe: {
      time: "10분",
      difficulty: "초급",
      ingredients: ["잘 익은 멜론 1/4통", "이베리코 하몽 50g", "올리브유 약간", "통후추 약간"],
      steps: [
        "멜론을 먹기 좋은 크기(웨지 모양)로 썬 후 껍질과 과육을 살짝 분리합니다.",
        "얇게 썬 하몽을 멜론 조각 위에 자연스럽게 감싸 올립니다.",
        "엑스트라 버진 올리브유를 살짝 두르고 통후추를 갈아 올려 완성합니다."
      ]
    }
  },
  {
    id: "snk_beef_tartare",
    name_ko: "트러플 소고기 타르타르 (육회)",
    name_en: "Truffle Beef Tartare",
    category: "위스키안주",
    spicy: 0,
    greasy: 3,
    sweet: 1,
    bestDrinks: [
      "alc_whiskey_wild_turkey",
      "alc_whiskey_johnnie_black",
      "alc_whiskey_shot",
      "alc_whiskey_macallan"
    ],
    moods: ["special", "celebrate", "honsul"],
    weather: ["autumn", "winter", "cool"],
    tags: ["위스키안주", "고급육류", "트러플향", "버번찰떡", "단백질안주"],
    recipe: {
      time: "15분",
      difficulty: "중급",
      ingredients: ["신선한 소고기 우둔살/홍두깨살 150g", "트러플오일 1작은술", "소금·후추 약간", "케이퍼 1작은술", "달걀노른자 1개", "바게트"],
      steps: [
        "소고기를 얇고 곱게 다집니다.",
        "볼에 다진 소고기, 트러플오일, 소금, 통후추, 케이퍼를 넣고 가볍게 버무립니다.",
        "접시에 원형 틀을 이용해 모양을 잡고 가운데 노른자를 얹습니다.",
        "구운 바게트에 얹어 묵직한 위스키와 곁들여 즐깁니다."
      ]
    }
  },
  {
    id: "snk_pecan_pie",
    name_ko: "호두 & 피칸 파이",
    name_en: "Pecan & Walnut Pie",
    category: "위스키안주",
    spicy: 0,
    greasy: 3,
    sweet: 4,
    bestDrinks: [
      "alc_whiskey_wild_turkey",
      "alc_whiskey_jack_daniels",
      "alc_whiskey_balvenie"
    ],
    moods: ["comfort", "honsul", "romantic"],
    weather: ["winter", "autumn", "cool"],
    tags: ["위스키안주", "버번위스키짝꿍", "고소달콤", "디저트페어링"],
    recipe: {
      time: "30분",
      difficulty: "중급",
      ingredients: ["피칸 및 호두 150g", "파이 크러스트", "메이플시럽 3큰술", "황설탕 2큰술", "버터 20g", "계란 2개"],
      steps: [
        "버터와 메이플시럽, 황설탕, 계란을 잘 섞어 필링을 만듭니다.",
        "파이 틀에 크러스트를 깔고 볶은 피칸과 호두를 가득 채웁니다.",
        "필링을 붓고 175도 오븐에서 25분간 노릇하게 구워냅니다.",
        "한 김 식힌 후 버번위스키의 바닐라/오크 향과 함께 페어링합니다."
      ]
    }
  }
];

const existingSnackIds = new Set(snacks.map(s => s.id));
for (const s of newSnacks) {
  if (!existingSnackIds.has(s.id)) {
    snacks.push(s);
  }
}

// 3. Ensure all existing cheese, nuts, jerky, salmon, steak, truffle fries snacks list the new whiskies in bestDrinks
const whiskeyIds = [
  "alc_whiskey_shot",
  "alc_whiskey_balvenie",
  "alc_whiskey_macallan",
  "alc_whiskey_glenfiddich",
  "alc_whiskey_johnnie_black",
  "alc_whiskey_wild_turkey",
  "alc_whiskey_jack_daniels",
  "alc_whiskey_jameson",
  "alc_whiskey_suntory",
  "alc_whiskey_laphroaig"
];

for (const s of snacks) {
  const isWhiskeyFriendly = /치즈|초콜릿|견과|하몽|프로슈토|스테이크|육포|올리브|연어|카나페|트러플|먹태|소시지|나초/.test(s.name_ko) || s.category === '위스키안주';
  if (isWhiskeyFriendly) {
    if (!s.tags.includes('위스키안주')) s.tags.push('위스키안주');
    if (!s.tags.includes('위스키')) s.tags.push('위스키');
    s.bestDrinks = [...new Set([...(s.bestDrinks || []), ...whiskeyIds.slice(0, 5)])];
  }
}

fs.writeFileSync(alcoholsPath, JSON.stringify(alcohols, null, 2), 'utf8');
fs.writeFileSync(snacksPath, JSON.stringify(snacks, null, 2), 'utf8');

console.log('Successfully updated alcohols and snacks for whiskey!');
console.log('Total alcohols:', alcohols.length);
console.log('Total snacks:', snacks.length);
