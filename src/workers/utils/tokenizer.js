// 1글자 허용 예외 토큰 (음식/맛/날씨 관련)
const SINGLE_CHAR_ALLOW = ['비', '눈', '회', '파', '단', '짠', '맵', '쓴', '빵', '밥', '면', '탕', '전', '편', '떡', '술'];

// 한국어 조사 제거 (안전하게)
export function stripSuffix(word) {
  const suffixes = ['이라는', '이라는거', '주세요', '할까여', '할까요', '할까', '먹을까', '먹고싶어', '먹고싶다', '해줘', '어때요', '어때', '이랑', '에서', '부터', '까지', '이런거', '같은거', '이런', '같은', '하고', '에는', '에도', '은', '는', '이', '가', '을', '를', '랑', '와', '과', '도', '에', '로', '나', '요', '냐', '엔', '만', '좀', '거'];
  
  for (const suf of suffixes) {
    if (word.endsWith(suf)) {
      const stripped = word.slice(0, -suf.length);
      // 잘라낸 후 길이가 2 이상이거나 1글자 허용 단어인 경우에만 자르기 승인
      if (stripped.length >= 2 || SINGLE_CHAR_ALLOW.includes(stripped)) {
        return stripped;
      }
    }
  }
  return word;
}

// 텍스트를 형태소나 단어로 간단히 분리
export function simpleTokenize(text) {
  const words = text.toLowerCase().split(/[\s,!?.]+/).filter(Boolean);
  return words.map(stripSuffix);
}

// 텍스트 정제
export function cleanTextString(text) {
  return text.replace(/[\s?.,!~]/g, '');
}
