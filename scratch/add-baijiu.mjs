import fs from 'fs';

const alcoholsPath = 'src/data/alcohols.json';
const snacksPath = 'src/data/snacks.json';
const relationsPath = 'src/data/relations.json';

const alcohols = JSON.parse(fs.readFileSync(alcoholsPath, 'utf8'));
const snacks = JSON.parse(fs.readFileSync(snacksPath, 'utf8'));
const relations = JSON.parse(fs.readFileSync(relationsPath, 'utf8'));

// 1. Chinese Baijiu lineup (6 items)
const baijiuList = [
  {
    id: "alc_baijiu_moutai",
    name_ko: "귀주 마오타이주",
    name_en: "Kweichow Moutai",
    category: "백주",
    subCategory: "장향형 백주",
    abv: 53,
    sweetness: 2,
    body: 5,
    carbonation: 0,
    country: "중국",
    priceLevel: 5,
    moods: ["special", "celebrate", "romantic"],
    weather: ["winter", "autumn", "cool"],
    tags: ["백주", "중국술", "마오타이", "국가연회주", "명품주류", "귀빈접대"],
    pairings: ["snk_dongporou", "snk_guobaorou", "snk_malaxiangguo", "snk_kyungjang_yuksa", "snk_yangggochi"]
  },
  {
    id: "alc_baijiu_yanghe",
    name_ko: "양하대곡",
    name_en: "Yanghe Daqu",
    category: "백주",
    subCategory: "농향형 백주",
    abv: 38,
    sweetness: 3,
    body: 4,
    carbonation: 0,
    country: "중국",
    priceLevel: 3,
    moods: ["friends", "happy", "hoesik", "celebrate"],
    weather: ["cool", "rain", "spring", "autumn"],
    tags: ["백주", "중국술", "양하대곡", "부드러운목넘김", "회식추천", "가성비명주"],
    pairings: ["snk_guobaorou", "snk_gochujapchae", "snk_menbosha", "snk_yuringi", "snk_yangggochi"]
  },
  {
    id: "alc_baijiu_yantai",
    name_ko: "연태고량주",
    name_en: "Yantai Guniang",
    category: "백주",
    subCategory: "농향형 백주",
    abv: 34,
    sweetness: 4,
    body: 3,
    carbonation: 0,
    country: "중국",
    priceLevel: 2,
    moods: ["friends", "happy", "honsul", "hoesik"],
    weather: ["summer", "spring", "cool", "rain"],
    tags: ["백주", "연태고량주", "과일향", "인기1위", "중식당필수", "연맥추천"],
    pairings: ["snk_guobaorou", "snk_malaxiangguo", "snk_yuringi", "snk_eohyang_gaji", "snk_gochujapchae"]
  },
  {
    id: "alc_baijiu_gongfujia",
    name_ko: "공부가주",
    name_en: "Confucius Family Liquor",
    category: "백주",
    subCategory: "농향형 백주",
    abv: 39,
    sweetness: 3,
    body: 4,
    carbonation: 0,
    country: "중국",
    priceLevel: 2,
    moods: ["friends", "comfort", "hoesik"],
    weather: ["cool", "autumn", "winter"],
    tags: ["백주", "공부가주", "공자제사주", "은은한단맛", "도자기병"],
    pairings: ["snk_dongporou", "snk_guobaorou", "snk_mapatofu", "snk_kyungjang_yuksa"]
  },
  {
    id: "alc_baijiu_wuliangye",
    name_ko: "우량예",
    name_en: "Wuliangye",
    category: "백주",
    subCategory: "농향형 백주",
    abv: 52,
    sweetness: 3,
    body: 5,
    carbonation: 0,
    country: "중국",
    priceLevel: 5,
    moods: ["special", "celebrate", "romantic"],
    weather: ["winter", "autumn", "cool"],
    tags: ["백주", "우량예", "5대곡물", "중국3대명주", "최고급향"],
    pairings: ["snk_dongporou", "snk_menbosha", "snk_guobaorou", "snk_yangggochi"]
  },
  {
    id: "alc_baijiu_erguotou",
    name_ko: "홍성 이과두주",
    name_en: "Red Star Erguotou",
    category: "백주",
    subCategory: "청향형 백주",
    abv: 56,
    sweetness: 1,
    body: 4,
    carbonation: 0,
    country: "중국",
    priceLevel: 1,
    moods: ["stress", "honsul", "friends"],
    weather: ["winter", "rain", "cold"],
    tags: ["백주", "이과두주", "화끈함", "서민명주", "스트레스해소", "고도수"],
    pairings: ["snk_malaxiangguo", "snk_yangggochi", "snk_guobaorou", "snk_mapatofu"]
  }
];

const existingAlcIds = new Set(alcohols.map(a => a.id));
for (const b of baijiuList) {
  if (!existingAlcIds.has(b.id)) {
    alcohols.push(b);
  }
}

// 2. Chinese Pairing Snacks (10 items)
const chineseSnacks = [
  {
    id: "snk_guobaorou",
    name_ko: "바삭 꿔바로우 (찹쌀 탕수육)",
    name_en: "Crispy Guobaorou",
    category: "중식안주",
    spicy: 0,
    greasy: 3,
    sweet: 4,
    bestDrinks: ["alc_baijiu_yantai", "alc_baijiu_yanghe", "alc_baijiu_moutai", "alc_beer_tsingtao"],
    moods: ["happy", "friends", "hoesik", "celebrate"],
    weather: ["summer", "spring", "cool", "rain"],
    tags: ["백주안주", "중식", "새콤달콤", "겉바속쫀", "연태찰떡", "인기안주"],
    recipe: {
      time: "25분",
      difficulty: "중급",
      ingredients: ["돼지고기 등심 300g", "감자전분 1컵", "물 1/2컵", "식초 3큰술", "설탕 3큰술", "간장 1큰술", "생강채 약간"],
      steps: [
        "전분에 물을 섞어 가라앉힌 뒤 윗물을 버리고 앙금에 돼지고기를 버무립니다.",
        "180도 기름에서 고기를 바삭하게 두 번 튀겨냅니다.",
        "팬에 설탕, 식초, 간장을 끓여 새콤달콤한 소스를 만듭니다.",
        "튀긴 고기를 소스에 빠르게 버무려 바삭할 때 백주와 함께 곁들입니다."
      ]
    }
  },
  {
    id: "snk_malaxiangguo",
    name_ko: "얼얼한 마라샹궈",
    name_en: "Spicy Mala Xiangguo",
    category: "중식안주",
    spicy: 4,
    greasy: 3,
    sweet: 1,
    bestDrinks: ["alc_baijiu_yantai", "alc_baijiu_erguotou", "alc_baijiu_moutai", "alc_beer_tsingtao"],
    moods: ["stress", "friends", "happy"],
    weather: ["rain", "winter", "cool"],
    tags: ["백주안주", "마라", "얼얼함", "스트레스해소", "술도둑"],
    recipe: {
      time: "20분",
      difficulty: "중급",
      ingredients: ["마라샹궈 소스 1팩", "우삼겹 150g", "청경채", "포두부", "분모자/당면", "소시지", "마늘"],
      steps: [
        "채소와 당면, 포두부를 끓는 물에 살짝 데쳐 물기를 뺍니다.",
        "팬에 기름을 두르고 마늘과 우삼겹을 볶습니다.",
        "데친 재료와 마라소스를 넣고 센 불에서 빠르게 볶아냅니다.",
        "얼얼한 마라 풍미를 고도수 백주 한 잔으로 씻어내며 즐깁니다."
      ]
    }
  },
  {
    id: "snk_dongporou",
    name_ko: "동파육 (오향 통삼겹 찜)",
    name_en: "Braised Dongpo Pork",
    category: "중식안주",
    spicy: 0,
    greasy: 4,
    sweet: 3,
    bestDrinks: ["alc_baijiu_moutai", "alc_baijiu_wuliangye", "alc_baijiu_gongfujia"],
    moods: ["special", "celebrate", "comfort"],
    weather: ["winter", "autumn", "cool"],
    tags: ["백주안주", "고급중식", "입안에서녹음", "마오타이짝꿍", "통삼겹"],
    recipe: {
      time: "60분",
      difficulty: "고급",
      ingredients: ["통삼겹살 500g", "청경채", "진간장 4큰술", "노추(노두유) 1큰술", "빙탕/설탕 3큰술", "소흥주/청주 1/2컵", "팔각 2개", "대파", "생강"],
      steps: [
        "통삼겹살을 사각으로 큼직하게 썰어 겉면을 노릇하게 굽습니다.",
        "냄비에 파, 생강을 깔고 고기와 양념(간장, 설탕, 청주, 팔각)을 넣습니다.",
        "약불에서 1시간 이상 푹 졸여 부드럽게 익힙니다.",
        "데친 청경채와 함께 접시에 담고 프리미엄 백주와 함께 곁들입니다."
      ]
    }
  },
  {
    id: "snk_yangggochi",
    name_ko: "즈란 양꼬치 구이",
    name_en: "Grilled Lamb Skewers with Cumin",
    category: "중식안주",
    spicy: 2,
    greasy: 4,
    sweet: 0,
    bestDrinks: ["alc_baijiu_yantai", "alc_baijiu_erguotou", "alc_baijiu_yanghe", "alc_beer_tsingtao"],
    moods: ["friends", "hoesik", "happy"],
    weather: ["cool", "rain", "autumn", "winter"],
    tags: ["백주안주", "양꼬치", "즈란", "불맛", "연태찰떡", "포차인기"],
    recipe: {
      time: "20분",
      difficulty: "초급",
      ingredients: ["양고기 숄더랙/살코기 300g", "즈란(큐민) 가루 1큰술", "고춧가루 1작은술", "소금", "후추", "올리브유"],
      steps: [
        "양고기를 한 입 크기로 깍둑썰기하여 꼬치에 꽂습니다.",
        "올리브유, 소금, 후추를 발라 180도 에어프라이어나 팬에서 12분간 굽습니다.",
        "노릇하게 익으면 즈란과 고춧가루를 듬뿍 뿌려 버무립니다.",
        "기름진 양고기의 풍미를 깔끔한 백주로 완벽하게 페어링합니다."
      ]
    }
  },
  {
    id: "snk_gochujapchae",
    name_ko: "고추잡채 & 꽃빵",
    name_en: "Stir-fried Pepper Pork & Flower Buns",
    category: "중식안주",
    spicy: 2,
    greasy: 2,
    sweet: 1,
    bestDrinks: ["alc_baijiu_yantai", "alc_baijiu_yanghe", "alc_baijiu_gongfujia"],
    moods: ["friends", "happy", "comfort", "hoesik"],
    weather: ["spring", "autumn", "cool"],
    tags: ["백주안주", "꽃빵", "아삭한피망", "중식코스요리", "연태필수"],
    recipe: {
      time: "20분",
      difficulty: "중급",
      ingredients: ["돼지고기 잡채용 150g", "피망/파프리카 2개", "양파 1/2개", "굴소스 2큰술", "고추기름 2큰술", "꽃빵 4개"],
      steps: [
        "돼지고기와 피망, 양파를 얇게 채 썹니다.",
        "꽃빵은 찜기에 5분간 쪄서 따뜻하고 부드럽게 준비합니다.",
        "팬에 고추기름을 두르고 고기와 채소를 센 불에 볶다가 굴소스로 간합니다.",
        "따뜻한 꽃빵을 찢어 매콤한 고추잡채를 싸서 백주와 즐깁니다."
      ]
    }
  },
  {
    id: "snk_menbosha",
    name_ko: "바삭 멘보샤 (새우 토스트)",
    name_en: "Crispy Menbosha (Shrimp Toast)",
    category: "중식안주",
    spicy: 0,
    greasy: 3,
    sweet: 2,
    bestDrinks: ["alc_baijiu_yanghe", "alc_baijiu_wuliangye", "alc_baijiu_yantai"],
    moods: ["special", "happy", "romantic"],
    weather: ["spring", "summer", "cool"],
    tags: ["백주안주", "멘보샤", "새우살가득", "칠리소스", "고급튀김"],
    recipe: {
      time: "25분",
      difficulty: "중급",
      ingredients: ["새우살 200g", "식빵 4장", "달걀흰자 1개", "전분 1큰술", "스위트 칠리소스"],
      steps: [
        "새우살을 칼등으로 다진 후 달걀흰자, 전분, 소금, 후추로 반죽합니다.",
        "식빵의 테두리를 자르고 4등분한 뒤 새우 반죽을 도톰하게 샌드합니다.",
        "140~150도 낮은 온도의 기름에서 서서히 튀겨 겉은 바삭하고 속은 촉촉하게 익힙니다.",
        "칠리소스에 콕 찍어 향긋한 백주와 함께 바삭함을 음미합니다."
      ]
    }
  },
  {
    id: "snk_yuringi",
    name_ko: "새콤달콤 유린기",
    name_en: "Crispy Yuringi Chicken Salad",
    category: "중식안주",
    spicy: 1,
    greasy: 2,
    sweet: 3,
    bestDrinks: ["alc_baijiu_yantai", "alc_baijiu_yanghe", "alc_baijiu_erguotou"],
    moods: ["refresh", "friends", "happy"],
    weather: ["summer", "spring", "cool"],
    tags: ["백주안주", "유린기", "상큼바삭", "청양고추송송", "치킨대항마"],
    recipe: {
      time: "20분",
      difficulty: "중급",
      ingredients: ["닭다리살 250g", "양상추", "청양고추 2개", "간장 3큰술", "식초 3큰술", "설탕 2.5큰술", "전분가루"],
      steps: [
        "닭다리살에 전분을 입혀 바삭하게 튀긴 후 먹기 좋게 썹니다.",
        "접시에 아삭한 양상추를 깔고 튀긴 닭고기를 올립니다.",
        "간장, 식초, 설탕, 다진 청양고추를 섞은 유린기 소스를 골고루 뿌립니다.",
        "매콤새콤한 소스와 닭튀김을 시원한 백주나 연맥과 페어링합니다."
      ]
    }
  },
  {
    id: "snk_mapatofu",
    name_ko: "화끈한 사천 마파두부",
    name_en: "Sichuan Mapo Tofu",
    category: "중식안주",
    spicy: 3,
    greasy: 2,
    sweet: 1,
    bestDrinks: ["alc_baijiu_erguotou", "alc_baijiu_gongfujia", "alc_baijiu_moutai"],
    moods: ["stress", "comfort", "honsul"],
    weather: ["winter", "rain", "cool"],
    tags: ["백주안주", "마파두부", "사천요리", "부드러운두부", "매콤짭짤"],
    recipe: {
      time: "15분",
      difficulty: "초급",
      ingredients: ["연두부/찌개두부 1모", "다진 돼지고기 80g", "두반장 1.5큰술", "고추기름 1큰술", "물 1/2컵", "전분물", "파", "마늘"],
      steps: [
        "두부를 깍둑썰기하여 끓는 물에 소금을 넣고 살짝 데칩니다.",
        "팬에 고추기름, 파, 마늘, 다진 고기를 넣고 볶습니다.",
        "두반장과 물을 넣고 끓이다가 두부를 넣고 조립니다.",
        "전분물로 농도를 맞추고 화끈한 백주와 함께 떠먹습니다."
      ]
    }
  },
  {
    id: "snk_eohyang_gaji",
    name_ko: "어향가지 튀김",
    name_en: "Crispy Eggplant with Yuxiang Sauce",
    category: "중식안주",
    spicy: 2,
    greasy: 3,
    sweet: 3,
    bestDrinks: ["alc_baijiu_yantai", "alc_baijiu_yanghe", "alc_baijiu_moutai"],
    moods: ["happy", "special", "friends"],
    weather: ["summer", "autumn", "cool"],
    tags: ["백주안주", "어향가지", "겉바속촉가지", "단짠매콤", "중식히트메뉴"],
    recipe: {
      time: "20분",
      difficulty: "중급",
      ingredients: ["가지 2개", "전분가루 1/2컵", "두반장 1큰술", "간장 1큰술", "식초 2큰술", "설탕 1.5큰술", "파", "마늘"],
      steps: [
        "가지를 큼직하게 썰어 물기를 살짝 묻힌 후 전분을 골고루 입힙니다.",
        "180도 기름에서 가지를 바삭하게 튀겨냅니다.",
        "팬에 파, 마늘, 두반장, 간장, 식초, 설탕을 넣고 매콤달콤한 어향소스를 끓입니다.",
        "튀긴 가지를 소스에 버무려 뜨거울 때 향긋한 백주와 곁들입니다."
      ]
    }
  },
  {
    id: "snk_kyungjang_yuksa",
    name_ko: "경장육사 & 건두부 쌈",
    name_en: "Jingjiang Shredded Pork with Tofu Wraps",
    category: "중식안주",
    spicy: 0,
    greasy: 2,
    sweet: 3,
    bestDrinks: ["alc_baijiu_moutai", "alc_baijiu_gongfujia", "alc_baijiu_wuliangye"],
    moods: ["special", "celebrate", "comfort"],
    weather: ["spring", "autumn", "cool"],
    tags: ["백주안주", "경장육사", "건두부쌈", "춘장볶음", "정통중식"],
    recipe: {
      time: "25분",
      difficulty: "중급",
      ingredients: ["돼지고기 등심 200g", "포두부(건두부) 1팩", "오이 1/2개", "대파 1대", "춘장/짜장 2큰술", "설탕 1큰술", "굴소스 1작은술"],
      steps: [
        "오이와 대파 흰 부분을 가늘게 채 썰어 접시 가장자리에 돌려 담습니다.",
        "포두부는 사각으로 잘라 끓는 물에 1분간 데쳐 물기를 뺍니다.",
        "돼지고기를 채 썰어 팬에 볶다가 춘장, 설탕, 굴소스로 달콤 짭짤하게 볶습니다.",
        "포두부 위에 채소와 고기를 얹어 쌈을 싸서 도수 높은 백주와 페어링합니다."
      ]
    }
  }
];

const existingSnkIds = new Set(snacks.map(s => s.id));
for (const s of chineseSnacks) {
  if (!existingSnkIds.has(s.id)) {
    snacks.push(s);
  }
}

// 3. Add relations
for (const b of baijiuList) {
  for (const s of chineseSnacks) {
    relations.push({
      source: b.id,
      target: s.id,
      score: 95
    });
  }
}

fs.writeFileSync(alcoholsPath, JSON.stringify(alcohols, null, 2), 'utf8');
fs.writeFileSync(snacksPath, JSON.stringify(snacks, null, 2), 'utf8');
fs.writeFileSync(relationsPath, JSON.stringify(relations, null, 2), 'utf8');

console.log('Successfully added Chinese Baijiu and Chinese pairing snacks!');
console.log('Total alcohols:', alcohols.length);
console.log('Total snacks:', snacks.length);
console.log('Total relations:', relations.length);
