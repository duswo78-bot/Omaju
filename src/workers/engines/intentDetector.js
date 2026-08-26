import { embedQuery } from './embeddingEngine.js';
import { cosineSimilarity } from '../utils/math.js';

const INTENT_ANCHORS = {
  GREETING: ['안녕', '반가워', '안녕하세요', '하이', '오랜만이야'],
  THANKS: ['고마워', '감사합니다', '최고야', '좋네', '완벽해'],
  REROLL: ['다른 거', '다른거', '별로야', '이건 싫어', '바꿔줘', '다시', '패스'],
  SMALLTALK: ['오늘 너무 힘들어', '기분이 우울해', '외롭다', '짜증나', '피곤해', '심심해'],
  QUESTION: ['너는 누구야', '이름이 뭐야', '오마주는 뭐야'],
  RECOMMEND: ['맥주 안주 추천해줘', '소주 마실 건데', '치킨 어때', '배고파', '매운거 땡겨', '술 먹고 싶어', '라면', '아무거나 골라줘']
};

let intentEmbeddings = [];

export async function initIntentEmbeddings() {
  // Deprecated no-op. Intent is owned by workers/nlu/ruleNlu.js (+ optional LLM Front).
  // Kept so older imports do not break.
}

export async function detectIntent(text, cleanText, isLowConfidence) {
  // 1. GREETING (인사)
  const greetings = ['안녕', '하이', '반가', '방가', 'ㅎㅇ', '오랜만'];
  if (greetings.some(g => cleanText.includes(g)) && cleanText.length <= 6) return 'GREETING';

  // 2. THANKS (감사)
  const thanks = ['고마', '감사', '땡큐', '최고', '짱', '좋네', '완벽', '굿'];
  if (thanks.some(t => cleanText.includes(t)) && cleanText.length <= 10) return 'THANKS';

  // 3. REROLL (거절 / 재요청 / 불만)
  const rerolls = ['다른', '다시', '별로', '싫어', '패스', '바꿔', '말고', '아니', '노잼', '틀렸'];
  if (rerolls.some(r => cleanText.includes(r))) {
    // 거절이면서 날씨/감정을 강조하는 경우 (예: "아니 덥다니까") -> 스몰톡으로 자연스럽게 유도
    // 한국어 불규칙 활용 대응 (덥다 -> 더워, 춥다 -> 추워)
    const weatherMood = ['덥', '더워', '더운', '추', '추워', '추운', '비', '눈', '우울', '슬퍼', '슬픈', '화나', '화가', '짜증', '피곤', '힘들', '심심', '외로'];
    if (weatherMood.some(wm => cleanText.includes(wm)) && !cleanText.includes('추천') && !cleanText.includes('먹') && !cleanText.includes('술') && !cleanText.includes('안주')) {
      return 'SMALLTALK'; 
    }
    return 'REROLL';
  }

  // 4. SMALLTALK (스몰톡 / 감정 표출 / 욕설 / 단순 날씨)
  const smalltalks = ['멍청', '바보', '심심', '외로', '뭐해', '놀자', '짜증', '우울', '피곤', '힘들', '덥', '더워', '더운', '더웠', '추', '추워', '추운', '추웠', '비', '눈', '날씨', '슬퍼', '슬픈', '화나', '화가', '미치겠'];
  if (smalltalks.some(s => cleanText.includes(s))) {
    // 명시적인 음식/주류 요구가 없으면 일단 스몰톡으로 공감 후 추천을 유도
    if (!cleanText.includes('술') && !cleanText.includes('추천') && !cleanText.includes('먹') && !cleanText.includes('안주') && !cleanText.includes('뭐')) {
      return 'SMALLTALK';
    }
  }

  // 5. QUESTION (질문)
  const questions = ['누구', '뭐야', '이름', '오마주', '어때', '알려'];
  if (questions.some(q => cleanText.includes(q)) && !cleanText.includes('추천') && !cleanText.includes('게임')) {
    if (cleanText.length <= 15) return 'QUESTION';
  }

  // 6. GAME RECOMMENDATION (게임 추천)
  // 사용자가 명시적으로 '게임'이라는 단어를 언급하면 무조건 추천으로 넘김
  // (추천 엔진에서 bestGame을 반환하고 answerBuilder가 이를 텍스트에 덧붙임)
  if (cleanText.includes('게임') || cleanText.includes('놀자') || cleanText.includes('재밌는거')) {
    return 'RECOMMEND';
  }

  // 7. 기본적으로는 모두 추천으로 간주 (RECOMMEND)
  // "덥다고", "치킨", "소주" 등 모든 입력은 추천 엔진이 처리
  return 'RECOMMEND';
}
