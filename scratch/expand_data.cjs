const fs = require('fs');
const path = require('path');

const alcoholsBase = [
  { id: "alc_soju_cham", name_ko: "참이슬", name_en: "Chamisul Soju", category: "소주", subCategory: "희석식 소주", abv: 16.5, sweetness: 2, body: 2, carbonation: 0, country: "한국", priceLevel: 1 },
  { id: "alc_soju_hwayo", name_ko: "화요", name_en: "Hwayo", category: "소주", subCategory: "증류식 소주", abv: 25.0, sweetness: 1, body: 3, carbonation: 0, country: "한국", priceLevel: 3 },
  { id: "alc_soju_ilpoom", name_ko: "일품진로", name_en: "Ilpoom Jinro", category: "소주", subCategory: "증류식 소주", abv: 25.0, sweetness: 1, body: 3, carbonation: 0, country: "한국", priceLevel: 3 },
  { id: "alc_soju_starlight", name_ko: "별빛청하", name_en: "Starlight Chungha", category: "소주", subCategory: "스파클링", abv: 7.0, sweetness: 4, body: 2, carbonation: 4, country: "한국", priceLevel: 2 },
  { id: "alc_bokbunja", name_ko: "복분자주", name_en: "Bokbunja Wine", category: "과실주", subCategory: "복분자", abv: 15.0, sweetness: 4, body: 4, carbonation: 0, country: "한국", priceLevel: 3 },
  { id: "alc_beer_tsingtao", name_ko: "칭따오", name_en: "Tsingtao", category: "맥주", subCategory: "라거", abv: 4.7, sweetness: 1, body: 2, carbonation: 4, country: "중국", priceLevel: 2 },
  { id: "alc_beer_guinness", name_ko: "기네스", name_en: "Guinness", category: "맥주", subCategory: "스타우트", abv: 4.2, sweetness: 1, body: 4, carbonation: 2, country: "아일랜드", priceLevel: 2 },
  { id: "alc_highball_earlgrey", name_ko: "얼그레이 하이볼", name_en: "Earl Grey Highball", category: "칵테일/하이볼", subCategory: "하이볼", abv: 7.0, sweetness: 4, body: 2, carbonation: 4, country: "한국", priceLevel: 2 },
  { id: "alc_makgeolli_jipyeong", name_ko: "지평막걸리", name_en: "Jipyeong Makgeolli", category: "전통주", subCategory: "막걸리", abv: 5.0, sweetness: 3, body: 3, carbonation: 2, country: "한국", priceLevel: 1 },
  { id: "alc_makgeolli_slow", name_ko: "느린마을막걸리", name_en: "Slow Village Makgeolli", category: "전통주", subCategory: "막걸리", abv: 6.0, sweetness: 4, body: 4, carbonation: 1, country: "한국", priceLevel: 2 },
  { id: "alc_soju_saero", name_ko: "새로", name_en: "Saero Soju", category: "소주", subCategory: "제로슈거 소주", abv: 16.0, sweetness: 1, body: 2, carbonation: 0, country: "한국", priceLevel: 1 },
  { id: "alc_chungha", name_ko: "청하", name_en: "Chungha", category: "전통주", subCategory: "청주", abv: 13.0, sweetness: 3, body: 2, carbonation: 0, country: "한국", priceLevel: 2 },
  { id: "alc_wine_red", name_ko: "레드와인", name_en: "Red Wine", category: "와인", subCategory: "레드 와인", abv: 13.5, sweetness: 1, body: 4, carbonation: 0, country: "글로벌", priceLevel: 3 },
  { id: "alc_wine_white", name_ko: "화이트와인", name_en: "White Wine", category: "와인", subCategory: "화이트 와인", abv: 12.0, sweetness: 3, body: 2, carbonation: 0, country: "글로벌", priceLevel: 3 },
  { id: "alc_wine_sparkling", name_ko: "스파클링와인", name_en: "Sparkling Wine", category: "와인", subCategory: "스파클링 와인", abv: 11.0, sweetness: 3, body: 2, carbonation: 4, country: "글로벌", priceLevel: 3 },
  { id: "alc_cocktail_junebug", name_ko: "준벅", name_en: "June Bug", category: "칵테일/하이볼", subCategory: "칵테일", abv: 5.0, sweetness: 5, body: 2, carbonation: 0, country: "미국", priceLevel: 3 },
  { id: "alc_cocktail_kahlua", name_ko: "깔루아밀크", name_en: "Kahlua Milk", category: "칵테일/하이볼", subCategory: "칵테일", abv: 5.0, sweetness: 5, body: 4, carbonation: 0, country: "글로벌", priceLevel: 3 },
  { id: "alc_soju_jinro", name_ko: "진로이즈백", name_en: "Jinro is Back", category: "소주", subCategory: "희석식 소주", abv: 16.0, sweetness: 2, body: 2, carbonation: 0, country: "한국", priceLevel: 1 },
  { id: "alc_soju_goodday", name_ko: "좋은데이", name_en: "Good Day Soju", category: "소주", subCategory: "희석식 소주", abv: 16.5, sweetness: 2, body: 2, carbonation: 0, country: "한국", priceLevel: 1 },
  { id: "alc_soju_hallasan", name_ko: "한라산", name_en: "Hallasan Soju", category: "소주", subCategory: "희석식 소주", abv: 21.0, sweetness: 1, body: 3, carbonation: 0, country: "한국", priceLevel: 1 },
  { id: "alc_beer_cass", name_ko: "카스", name_en: "Cass Beer", category: "맥주", subCategory: "라거", abv: 4.5, sweetness: 1, body: 2, carbonation: 5, country: "한국", priceLevel: 1 },
  { id: "alc_beer_terra", name_ko: "테라", name_en: "Terra", category: "맥주", subCategory: "라거", abv: 4.6, sweetness: 1, body: 2, carbonation: 5, country: "한국", priceLevel: 1 },
  { id: "alc_beer_kelly", name_ko: "켈리", name_en: "Kelly", category: "맥주", subCategory: "라거", abv: 4.5, sweetness: 2, body: 3, carbonation: 4, country: "한국", priceLevel: 1 },
  { id: "alc_beer_asahi", name_ko: "아사히", name_en: "Asahi", category: "맥주", subCategory: "라거", abv: 5.0, sweetness: 1, body: 2, carbonation: 5, country: "일본", priceLevel: 2 },
  { id: "alc_beer_heineken", name_ko: "하이네켄", name_en: "Heineken", category: "맥주", subCategory: "라거", abv: 5.0, sweetness: 1, body: 2, carbonation: 4, country: "네덜란드", priceLevel: 2 },
  { id: "alc_beer_kozel", name_ko: "코젤다크", name_en: "Kozel Dark", category: "맥주", subCategory: "다크 라거", abv: 3.8, sweetness: 3, body: 3, carbonation: 3, country: "체코", priceLevel: 2 },
  { id: "alc_beer_stella", name_ko: "스텔라", name_en: "Stella Artois", category: "맥주", subCategory: "라거", abv: 5.0, sweetness: 1, body: 2, carbonation: 4, country: "벨기에", priceLevel: 2 },
  { id: "alc_beer_budweiser", name_ko: "버드와이저", name_en: "Budweiser", category: "맥주", subCategory: "라거", abv: 5.0, sweetness: 1, body: 2, carbonation: 4, country: "미국", priceLevel: 2 },
  { id: "alc_highball_suntory", name_ko: "산토리 하이볼", name_en: "Suntory Highball", category: "칵테일/하이볼", subCategory: "하이볼", abv: 7.0, sweetness: 3, body: 2, carbonation: 4, country: "일본", priceLevel: 2 },
  { id: "alc_highball_jimbeam", name_ko: "짐빔 하이볼", name_en: "Jim Beam Highball", category: "칵테일/하이볼", subCategory: "하이볼", abv: 7.0, sweetness: 3, body: 2, carbonation: 4, country: "미국", priceLevel: 2 },
  { id: "alc_highball_jose", name_ko: "호세쿠엘보 하이볼", name_en: "Jose Cuervo Highball", category: "칵테일/하이볼", subCategory: "하이볼", abv: 7.0, sweetness: 2, body: 2, carbonation: 4, country: "멕시코", priceLevel: 2 },
  { id: "alc_makgeolli_jangsoo", name_ko: "장수막걸리", name_en: "Jangsoo Makgeolli", category: "전통주", subCategory: "막걸리", abv: 6.0, sweetness: 3, body: 3, carbonation: 2, country: "한국", priceLevel: 1 },
  { id: "alc_makgeolli_albam", name_ko: "알밤막걸리", name_en: "Chestnut Makgeolli", category: "전통주", subCategory: "막걸리", abv: 6.0, sweetness: 4, body: 3, carbonation: 1, country: "한국", priceLevel: 1 },
  { id: "alc_makgeolli_oksusu", name_ko: "옥수수막걸리", name_en: "Corn Makgeolli", category: "전통주", subCategory: "막걸리", abv: 6.0, sweetness: 4, body: 3, carbonation: 1, country: "한국", priceLevel: 1 },
  { id: "alc_wine_port", name_ko: "포트와인", name_en: "Port Wine", category: "와인", subCategory: "주정강화 와인", abv: 20.0, sweetness: 5, body: 5, carbonation: 0, country: "포르투갈", priceLevel: 4 },
  { id: "alc_cocktail_peach", name_ko: "피치크러쉬", name_en: "Peach Crush", category: "칵테일/하이볼", subCategory: "칵테일", abv: 5.0, sweetness: 5, body: 2, carbonation: 0, country: "글로벌", priceLevel: 3 },
  { id: "alc_cocktail_midori", name_ko: "미도이사워", name_en: "Midori Sour", category: "칵테일/하이볼", subCategory: "칵테일", abv: 5.0, sweetness: 4, body: 2, carbonation: 2, country: "글로벌", priceLevel: 3 },
  { id: "alc_cocktail_amaretto", name_ko: "아마레또사워", name_en: "Amaretto Sour", category: "칵테일/하이볼", subCategory: "칵테일", abv: 5.0, sweetness: 4, body: 3, carbonation: 0, country: "글로벌", priceLevel: 3 },
  { id: "alc_whiskey_shot", name_ko: "위스키 샷", name_en: "Whiskey Shot", category: "위스키", subCategory: "싱글몰트", abv: 40.0, sweetness: 1, body: 4, carbonation: 0, country: "글로벌", priceLevel: 4 },
  { id: "alc_vodka_tonic", name_ko: "보드카 토닉", name_en: "Vodka Tonic", category: "보드카", subCategory: "믹스", abv: 10.0, sweetness: 2, body: 2, carbonation: 4, country: "글로벌", priceLevel: 2 }
];

const snacksBase = [
  { id: 'snk_egg_roll', name_ko: '계란말이', name_en: 'Egg Roll', category: '간단안주', spicy: 0, greasy: 3, sweet: 1 },
  { id: 'snk_egg_soup', name_ko: '계란찜', name_en: 'Steamed Egg', category: '국물/탕', spicy: 0, greasy: 1, sweet: 1 },
  { id: 'snk_golbaengi', name_ko: '골뱅이무침', name_en: 'Spicy Sea Snail Salad', category: '매운안주', spicy: 4, greasy: 1, sweet: 2 },
  { id: 'snk_odolppyeo', name_ko: '오돌뼈', name_en: 'Spicy Cartilage', category: '매운안주', spicy: 5, greasy: 3, sweet: 1 },
  { id: 'snk_dakddongjip', name_ko: '닭똥집', name_en: 'Chicken Gizzard', category: '고기/구이', spicy: 2, greasy: 4, sweet: 0 },
  { id: 'snk_jjamppong', name_ko: '짬뽕탕', name_en: 'Jjamppong Soup', category: '국물/탕', spicy: 4, greasy: 3, sweet: 1 },
  { id: 'snk_odeng', name_ko: '오뎅탕', name_en: 'Fish Cake Soup', category: '국물/탕', spicy: 1, greasy: 2, sweet: 1 },
  { id: 'snk_honghap', name_ko: '홍합탕', name_en: 'Mussel Soup', category: '국물/탕', spicy: 1, greasy: 1, sweet: 0 },
  { id: 'snk_meoktae', name_ko: '먹태', name_en: 'Dried Pollock', category: '마른안주', spicy: 0, greasy: 1, sweet: 0 },
  { id: 'snk_jwipo', name_ko: '쥐포', name_en: 'Dried Filefish', category: '마른안주', spicy: 0, greasy: 1, sweet: 3 },
  { id: 'snk_gambas', name_ko: '감바스', name_en: 'Gambas al Ajillo', category: '기타', spicy: 2, greasy: 5, sweet: 0 },
  { id: 'snk_pizza', name_ko: '피자', name_en: 'Pizza', category: '기타', spicy: 1, greasy: 4, sweet: 1 },
  { id: 'snk_cheese_stick', name_ko: '치즈스틱', name_en: 'Cheese Stick', category: '튀김', spicy: 0, greasy: 4, sweet: 1 },
  { id: 'snk_nacho', name_ko: '나초', name_en: 'Nachos', category: '간단안주', spicy: 1, greasy: 3, sweet: 0 },
  { id: 'snk_popcorn', name_ko: '팝콘', name_en: 'Popcorn', category: '간단안주', spicy: 0, greasy: 2, sweet: 1 },
  { id: 'snk_yukhoe', name_ko: '육회', name_en: 'Beef Tartare', category: '고기/구이', spicy: 0, greasy: 2, sweet: 2 },
  { id: 'snk_salmon', name_ko: '연어회', name_en: 'Salmon Sashimi', category: '해산물', spicy: 0, greasy: 3, sweet: 0 },
  { id: 'snk_tuna', name_ko: '참치회', name_en: 'Tuna Sashimi', category: '해산물', spicy: 0, greasy: 2, sweet: 0 },
  { id: 'snk_yakitori', name_ko: '각종 꼬치구이', name_en: 'Yakitori', category: '고기/구이', spicy: 2, greasy: 3, sweet: 2 },
  { id: 'snk_pineapple_sherbet', name_ko: '파인애플샤베트', name_en: 'Pineapple Sherbet', category: '디저트', spicy: 0, greasy: 0, sweet: 4 },
  { id: 'snk_fruit_punch', name_ko: '과일화채', name_en: 'Fruit Punch', category: '디저트', spicy: 0, greasy: 0, sweet: 4 },
  { id: 'snk_peach', name_ko: '황도', name_en: 'Canned Peaches', category: '디저트', spicy: 0, greasy: 0, sweet: 5 },
  { id: 'snk_bingsu', name_ko: '빙수', name_en: 'Shaved Ice', category: '디저트', spicy: 0, greasy: 0, sweet: 4 },
  { id: 'snk_takoyaki', name_ko: '타코야끼', name_en: 'Takoyaki', category: '기타', spicy: 1, greasy: 3, sweet: 2 },
  { id: 'snk_kkanpunggi', name_ko: '깐풍기', name_en: 'Spicy Garlic Fried Chicken', category: '튀김', spicy: 3, greasy: 4, sweet: 2 },
  { id: 'snk_tangsuyuk', name_ko: '탕수육', name_en: 'Sweet and Sour Pork', category: '튀김', spicy: 0, greasy: 4, sweet: 4 },
  { id: 'snk_dry_snack_set', name_ko: '마른안주 세트', name_en: 'Dry Snack Set', category: '마른안주', spicy: 0, greasy: 1, sweet: 1 },
  { id: 'snk_jjapaghetti', name_ko: '짜파게티', name_en: 'Jjapaghetti', category: '식사/면', spicy: 0, greasy: 3, sweet: 2 },
  { id: 'snk_ramen', name_ko: '라면', name_en: 'Ramen', category: '식사/면', spicy: 3, greasy: 2, sweet: 0 },
  { id: 'snk_udong', name_ko: '우동', name_en: 'Udon', category: '식사/면', spicy: 1, greasy: 1, sweet: 1 },
  { id: 'snk_tteokbokki', name_ko: '떡볶이', name_en: 'Tteokbokki', category: '분식', spicy: 3, greasy: 1, sweet: 3 },
  { id: 'snk_rose_tteokbokki', name_ko: '로제떡볶이', name_en: 'Rose Tteokbokki', category: '분식', spicy: 2, greasy: 3, sweet: 3 },
  { id: 'snk_sundae', name_ko: '순대', name_en: 'Sundae', category: '분식', spicy: 1, greasy: 2, sweet: 0 },
  { id: 'snk_twigim', name_ko: '모듬튀김', name_en: 'Mixed Fried Snacks', category: '튀김', spicy: 1, greasy: 5, sweet: 0 },
  { id: 'snk_gimmari', name_ko: '김말이', name_en: 'Fried Seaweed Roll', category: '튀김', spicy: 1, greasy: 4, sweet: 1 },
  { id: 'snk_dakbal', name_ko: '닭발', name_en: 'Spicy Chicken Feet', category: '매운안주', spicy: 5, greasy: 2, sweet: 1 },
  { id: 'snk_gukmul_dakbal', name_ko: '국물닭발', name_en: 'Soup Chicken Feet', category: '매운안주', spicy: 5, greasy: 2, sweet: 2 },
  { id: 'snk_jokbal', name_ko: '족발', name_en: 'Jokbal', category: '고기/구이', spicy: 0, greasy: 3, sweet: 1 },
  { id: 'snk_bossam', name_ko: '보쌈', name_en: 'Bossam', category: '고기/구이', spicy: 1, greasy: 2, sweet: 0 },
  { id: 'snk_samgyeopsal', name_ko: '삼겹살', name_en: 'Pork Belly', category: '고기/구이', spicy: 0, greasy: 5, sweet: 0 },
  { id: 'snk_makchang', name_ko: '막창', name_en: 'Makchang', category: '고기/구이', spicy: 1, greasy: 4, sweet: 0 },
  { id: 'snk_daechang', name_ko: '대창', name_en: 'Daechang', category: '고기/구이', spicy: 1, greasy: 5, sweet: 1 },
  { id: 'snk_gopchang', name_ko: '곱창', name_en: 'Gopchang', category: '고기/구이', spicy: 1, greasy: 5, sweet: 0 },
  { id: 'snk_gopchang_jeongol', name_ko: '곱창전골', name_en: 'Gopchang Stew', category: '국물/탕', spicy: 3, greasy: 4, sweet: 1 },
  { id: 'snk_budaejjigae', name_ko: '부대찌개', name_en: 'Budae Jjigae', category: '국물/탕', spicy: 3, greasy: 3, sweet: 1 },
  { id: 'snk_kimchijjigae', name_ko: '김치찌개', name_en: 'Kimchi Stew', category: '국물/탕', spicy: 3, greasy: 2, sweet: 1 },
  { id: 'snk_dongtae_jjigae', name_ko: '동태찌개', name_en: 'Pollack Stew', category: '국물/탕', spicy: 3, greasy: 1, sweet: 0 },
  { id: 'snk_al_tang', name_ko: '알탕', name_en: 'Fish Roe Stew', category: '국물/탕', spicy: 3, greasy: 1, sweet: 0 },
  { id: 'snk_jogae_tang', name_ko: '조개탕', name_en: 'Clam Soup', category: '국물/탕', spicy: 1, greasy: 0, sweet: 0 },
  { id: 'snk_nagasaki', name_ko: '나가사키 짬뽕', name_en: 'Nagasaki Jjamppong', category: '국물/탕', spicy: 2, greasy: 2, sweet: 1 },
  { id: 'snk_sukju_bokkeum', name_ko: '차돌숙주볶음', name_en: 'Beef Brisket Bean Sprout Stir-fry', category: '고기/구이', spicy: 1, greasy: 3, sweet: 1 },
  { id: 'snk_jeyuk_bokkeum', name_ko: '제육볶음', name_en: 'Spicy Stir-fried Pork', category: '고기/구이', spicy: 3, greasy: 3, sweet: 2 },
  { id: 'snk_ojingeo_bokkeum', name_ko: '오징어볶음', name_en: 'Spicy Squid Stir-fry', category: '해산물', spicy: 3, greasy: 2, sweet: 2 },
  { id: 'snk_nakji_bokkeum', name_ko: '낙지볶음', name_en: 'Spicy Octopus Stir-fry', category: '해산물', spicy: 4, greasy: 2, sweet: 2 },
  { id: 'snk_dubu_kimchi', name_ko: '두부김치', name_en: 'Tofu Kimchi', category: '간단안주', spicy: 2, greasy: 2, sweet: 1 },
  { id: 'snk_pajeon', name_ko: '해물파전', name_en: 'Seafood Pancake', category: '전/부침개', spicy: 1, greasy: 4, sweet: 1 },
  { id: 'snk_kimchi_jeon', name_ko: '김치전', name_en: 'Kimchi Pancake', category: '전/부침개', spicy: 2, greasy: 4, sweet: 1 },
  { id: 'snk_gamja_jeon', name_ko: '감자전', name_en: 'Potato Pancake', category: '전/부침개', spicy: 0, greasy: 4, sweet: 0 },
  { id: 'snk_buchu_jeon', name_ko: '부추전', name_en: 'Chive Pancake', category: '전/부침개', spicy: 1, greasy: 4, sweet: 0 },
  { id: 'snk_yugjeon', name_ko: '육전', name_en: 'Beef Pancake', category: '전/부침개', spicy: 0, greasy: 4, sweet: 0 },
  { id: 'snk_sashimi', name_ko: '모듬회', name_en: 'Mixed Sashimi', category: '해산물', spicy: 0, greasy: 1, sweet: 0 },
  { id: 'snk_gwang_eo', name_ko: '광어회', name_en: 'Flounder Sashimi', category: '해산물', spicy: 0, greasy: 1, sweet: 0 },
  { id: 'snk_yeon_eo', name_ko: '연어샐러드', name_en: 'Salmon Salad', category: '간단안주', spicy: 0, greasy: 2, sweet: 1 },
  { id: 'snk_muneo', name_ko: '문어숙회', name_en: 'Boiled Octopus', category: '해산물', spicy: 0, greasy: 0, sweet: 0 },
  { id: 'snk_san_nakji', name_ko: '산낙지', name_en: 'Live Octopus', category: '해산물', spicy: 0, greasy: 0, sweet: 0 },
  { id: 'snk_jeonbok', name_ko: '전복버터구이', name_en: 'Butter Roasted Abalone', category: '해산물', spicy: 0, greasy: 3, sweet: 1 },
  { id: 'snk_daeha', name_ko: '대하구이', name_en: 'Grilled Prawns', category: '해산물', spicy: 0, greasy: 1, sweet: 1 },
  { id: 'snk_saeu_twigim', name_ko: '새우튀김', name_en: 'Fried Shrimp', category: '튀김', spicy: 0, greasy: 4, sweet: 1 },
  { id: 'snk_ojingeo_twigim', name_ko: '오징어튀김', name_en: 'Fried Squid', category: '튀김', spicy: 0, greasy: 4, sweet: 0 },
  { id: 'snk_chicken_karaage', name_ko: '치킨가라아게', name_en: 'Chicken Karaage', category: '튀김', spicy: 1, greasy: 4, sweet: 1 },
  { id: 'snk_fried_chicken', name_ko: '후라이드치킨', name_en: 'Fried Chicken', category: '튀김', spicy: 0, greasy: 4, sweet: 0 },
  { id: 'snk_yangnyeom_chicken', name_ko: '양념치킨', name_en: 'Sweet and Spicy Chicken', category: '튀김', spicy: 2, greasy: 4, sweet: 4 },
  { id: 'snk_padak', name_ko: '파닭', name_en: 'Green Onion Chicken', category: '튀김', spicy: 1, greasy: 4, sweet: 2 },
  { id: 'snk_dakgangjeong', name_ko: '닭강정', name_en: 'Sweet Crispy Chicken', category: '튀김', spicy: 2, greasy: 4, sweet: 4 },
  { id: 'snk_steak', name_ko: '큐브스테이크', name_en: 'Cube Steak', category: '고기/구이', spicy: 0, greasy: 3, sweet: 1 },
  { id: 'snk_caprese', name_ko: '카프레제', name_en: 'Caprese Salad', category: '간단안주', spicy: 0, greasy: 1, sweet: 1 },
  { id: 'snk_cheese_platter', name_ko: '치즈플래터', name_en: 'Cheese Platter', category: '간단안주', spicy: 0, greasy: 3, sweet: 1 },
  { id: 'snk_melon_prosciutto', name_ko: '멜론프로슈토', name_en: 'Melon Prosciutto', category: '간단안주', spicy: 0, greasy: 1, sweet: 4 },
  { id: 'snk_churros', name_ko: '츄러스', name_en: 'Churros', category: '디저트', spicy: 0, greasy: 3, sweet: 4 },
  { id: 'snk_ice_cream', name_ko: '아이스크림', name_en: 'Ice Cream', category: '디저트', spicy: 0, greasy: 0, sweet: 5 },
  { id: 'snk_waffle', name_ko: '와플', name_en: 'Waffle', category: '디저트', spicy: 0, greasy: 2, sweet: 4 },
  { id: 'snk_french_fries', name_ko: '감자튀김', name_en: 'French Fries', category: '튀김', spicy: 0, greasy: 4, sweet: 0 },
  { id: 'snk_truffle_fries', name_ko: '트러플 감자튀김', name_en: 'Truffle Fries', category: '튀김', spicy: 0, greasy: 4, sweet: 0 },
  { id: 'snk_sausage', name_ko: '소시지 야채볶음', name_en: 'Sausage Stir-fry', category: '간단안주', spicy: 1, greasy: 3, sweet: 2 }
];

const allMoods = ["sad", "stress", "tired", "comfort", "happy", "refresh", "party", "romantic", "celebrate", "date", "honsul", "casual", "friends", "hoesik", "movie"];
const allWeather = ["rain", "snow", "cold", "hot", "humid", "summer", "winter", "autumn", "cool", "spring", "gloomy", "any"];
const allTags = ["인기", "추천", "클래식", "트렌디", "단짠", "매콤달콤", "가성비", "고급", "신선", "든든한"];

function getRandomSubset(arr, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const alcohols = alcoholsBase.map(a => {
  return {
    ...a,
    moods: getRandomSubset(allMoods, 2, 4),
    weather: getRandomSubset(allWeather, 1, 3),
    tags: [a.category, ...getRandomSubset(allTags, 1, 3)],
    pairings: []
  };
});

const snacks = snacksBase.map(s => {
  const drinks = getRandomSubset(alcohols, 2, 4);
  const bestDrinkIds = drinks.map(d => d.id);
  
  return {
    ...s,
    bestDrinks: bestDrinkIds,
    moods: getRandomSubset(allMoods, 2, 4),
    weather: getRandomSubset(allWeather, 1, 3),
    tags: [s.category, ...getRandomSubset(allTags, 1, 3)]
  };
});

const relations = [];

// Populate pairings back into alcohols to be consistent
snacks.forEach(s => {
  s.bestDrinks.forEach(alcId => {
    const alc = alcohols.find(a => a.id === alcId);
    if (alc && !alc.pairings.includes(s.id)) {
      alc.pairings.push(s.id);
    }
  });
});

snacks.forEach(s => {
  s.bestDrinks.forEach(alcId => {
    relations.push({
      source: alcId, // User request: source: alcohol ID
      target: s.id,  // target: snack ID
      score: Math.floor(Math.random() * 26) + 75 // 75-100
    });
  });
});

while (relations.length < 150) {
  const alc = alcohols[Math.floor(Math.random() * alcohols.length)];
  const snk = snacks[Math.floor(Math.random() * snacks.length)];
  const exists = relations.find(r => r.source === alc.id && r.target === snk.id);
  if (!exists) {
    relations.push({
      source: alc.id,
      target: snk.id,
      score: Math.floor(Math.random() * 26) + 75
    });
  }
}

const finalRelations = relations.slice(0, 180);

fs.writeFileSync('c:/Users/djw7ql/OneDrive - Aptiv/Antigravity/Omaju/src/data/alcohols.json', JSON.stringify(alcohols, null, 2), 'utf-8');
fs.writeFileSync('c:/Users/djw7ql/OneDrive - Aptiv/Antigravity/Omaju/src/data/snacks.json', JSON.stringify(snacks, null, 2), 'utf-8');
fs.writeFileSync('c:/Users/djw7ql/OneDrive - Aptiv/Antigravity/Omaju/src/data/relations.json', JSON.stringify(finalRelations, null, 2), 'utf-8');

console.log('Successfully generated JSON files.');
