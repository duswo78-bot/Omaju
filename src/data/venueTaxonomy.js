/**
 * 안주 → 실제 주점/맛집 검색 의도 매핑
 * 지도에 생짜 안주명만 던지지 않고, 업종·별칭·검색 키워드로 변환한다.
 */

/** 카카오 로컬 category_group_code */
export const KAKAO_CATEGORY = {
  FOOD: 'FD6', // 음식점 (포차/주점 포함 검색에 가장 실용적)
  CAFE: 'CE7',
};

/** 주요 상권 프리셋 (GPS 거부/실패 시) */
export const REGION_PRESETS = [
  { id: 'gangnam', name: '강남역', lat: 37.4979, lng: 127.0276 },
  { id: 'hongdae', name: '홍대입구', lat: 37.5563, lng: 126.9236 },
  { id: 'itaewon', name: '이태원', lat: 37.5345, lng: 126.9946 },
  { id: 'jongno', name: '종로/익선', lat: 37.5720, lng: 126.9870 },
  { id: 'seongsu', name: '성수', lat: 37.5445, lng: 127.0557 },
  { id: 'busan_seomyeon', name: '부산 서면', lat: 35.1578, lng: 129.0592 },
  { id: 'daejeon', name: '대전 둔산', lat: 36.3510, lng: 127.3850 },
  { id: 'gwangju', name: '광주 충장로', lat: 35.1500, lng: 126.9160 },
];

/**
 * 카테고리별 기본 업종/검색 접미사
 * venueType: 사람이 읽는 업종
 * querySuffixes: 검색어 뒤에 붙일 말들 (우선순위)
 * nameAliases: 안주명에 특정 패턴이 있을 때 덮어쓸 별칭 규칙용 힌트
 */
export const CATEGORY_VENUE_RULES = {
  '해산물': { venueType: '횟집/해산물주점', querySuffixes: ['횟집', '해산물 술집', '포차'], prefer: ['회', '해산물'] },
  '육류': { venueType: '고기집/고깃집', querySuffixes: ['고깃집', '고기 맛집', '술집'], prefer: ['고기', '구이'] },
  '고기/구이': { venueType: '고깃집', querySuffixes: ['고깃집', '삼겹살', '술집'], prefer: ['구이'] },
  '탕류': { venueType: '탕/전골 주점', querySuffixes: ['탕', '전골', '술집'], prefer: ['탕', '찌개'] },
  '국물/탕': { venueType: '탕/찌개 맛집', querySuffixes: ['탕', '찌개', '술집'], prefer: ['탕', '찌개'] },
  '튀김': { venueType: '치킨/튀김 주점', querySuffixes: ['치킨', '호프', '술집'], prefer: ['치킨', '튀김'] },
  '분식': { venueType: '분식/포차', querySuffixes: ['분식', '포차', '술집'], prefer: ['분식'] },
  '전·부침': { venueType: '전집/막걸리집', querySuffixes: ['전집', '막걸리', '주점'], prefer: ['전', '부침'] },
  '전/부침개': { venueType: '전집/막걸리집', querySuffixes: ['전집', '막걸리', '주점'], prefer: ['전'] },
  '매운안주': { venueType: '매운안주 포차', querySuffixes: ['포차', '닭발', '술집'], prefer: ['매운'] },
  '마른안주': { venueType: '포차/맥주집', querySuffixes: ['포차', '맥주', '호프'], prefer: ['포차'] },
  '맥주안주': { venueType: '호프/맥주펍', querySuffixes: ['호프', '맥주', '펍'], prefer: ['맥주', '호프'] },
  '와인안주': { venueType: '와인바', querySuffixes: ['와인바', '와인', '바'], prefer: ['와인'] },
  '위스키안주': { venueType: '위스키바', querySuffixes: ['위스키바', '바', '칵테일바'], prefer: ['위스키', '바'] },
  '하이볼안주': { venueType: '하이볼/이자카야', querySuffixes: ['하이볼', '이자카야', '바'], prefer: ['하이볼', '이자카야'] },
  '포차인기안주': { venueType: '포차', querySuffixes: ['포차', '술집', '주점'], prefer: ['포차'] },
  '간단안주': { venueType: '포차/술집', querySuffixes: ['포차', '술집', '맥주'], prefer: ['술집'] },
  '식사겸안주': { venueType: '한식 술집', querySuffixes: ['술집', '한식', '맛집'], prefer: ['술집'] },
  '식사/면': { venueType: '면/안주 맛집', querySuffixes: ['맛집', '술집'], prefer: ['면'] },
  '디저트': { venueType: '디저트바/카페', querySuffixes: ['디저트바', '카페', '바'], prefer: ['디저트'] },
  '기타': { venueType: '술집', querySuffixes: ['술집', '포차', '맛집'], prefer: ['술집'] },
};

/** 안주명 키워드 → 더 정확한 업종/검색어 (부분 포함 매칭) */
export const NAME_RULES = [
  { match: /곱창|대창|막창/, aliases: ['곱창'], suffixes: ['곱창집', '막창', '술집'], venueType: '곱창/막창집' },
  { match: /삼겹|목살|항정|가브리|갈매기|껍데기/, aliases: ['삼겹살'], suffixes: ['삼겹살', '고깃집'], venueType: '삼겹살/고깃집' },
  { match: /족발|보쌈|편육/, aliases: ['족발'], suffixes: ['족발', '보쌈'], venueType: '족발/보쌈' },
  { match: /닭발/, aliases: ['닭발'], suffixes: ['닭발', '포차'], venueType: '닭발집' },
  { match: /치킨|가라아게|강정|텐더/, aliases: ['치킨'], suffixes: ['치킨', '호프'], venueType: '치킨/호프' },
  { match: /회|사시미|광어|연어|참치|한치|문어|산낙지/, aliases: ['회'], suffixes: ['횟집', '스시'], venueType: '횟집' },
  { match: /게장|간장게|양념게/, aliases: ['게장'], suffixes: ['게장', '맛집'], venueType: '게장 맛집' },
  { match: /꼬막/, aliases: ['꼬막'], suffixes: ['꼬막', '맛집'], venueType: '꼬막 맛집' },
  { match: /파전|김치전|부추전|감자전|해물파전|전$/, aliases: ['전'], suffixes: ['전집', '막걸리'], venueType: '전집/막걸리' },
  { match: /떡볶이|순대|튀김|김말이/, aliases: ['분식'], suffixes: ['분식', '포차'], venueType: '분식/포차' },
  { match: /라면|우동|국수|냉면/, aliases: ['면'], suffixes: ['맛집', '술집'], venueType: '면 맛집' },
  { match: /찌개|전골|탕$|알탕|감자탕|순두부|부대찌개|김치찌개/, aliases: null, suffixes: ['술집', '맛집'], venueType: '탕/찌개 술집' },
  { match: /양꼬치|마라/, aliases: ['양꼬치'], suffixes: ['양꼬치', '마라'], venueType: '양꼬치/중식주점' },
  { match: /감바스|타파스|하몽|카프레제|치즈/, aliases: null, suffixes: ['와인바', '탭아스', '바'], venueType: '와인바/비스트로' },
  { match: /이자카야|야끼토리|꼬치/, aliases: ['이자카야'], suffixes: ['이자카야', '하이볼'], venueType: '이자카야' },
  { match: /피자|나초|버팔로|윙/, aliases: ['피자'], suffixes: ['피자', '펍', '맥주'], venueType: '피자/펍' },
  { match: /주먹밥|볶음밥|오므라이스/, aliases: null, suffixes: ['술집', '맛집'], venueType: '한식 술집' },
];

export const DEFAULT_RADIUS_M = 2000;
export const RADIUS_OPTIONS = [
  { id: 1000, label: '1km' },
  { id: 2000, label: '2km' },
  { id: 3000, label: '3km' },
  { id: 5000, label: '5km' },
];
