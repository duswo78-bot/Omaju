import { resetConversation, runConversationTurn } from './src/workers/conversationTurn.js';
import { seedMockEmbeddings } from './src/workers/engines/embeddingEngine.js';

seedMockEmbeddings();

async function test(name, text, payload = {}) {
  resetConversation();
  const r = await runConversationTurn(text, payload);
  console.log(`\n=== [TEST: ${name}] ===`);
  console.log('User Text:', text);
  console.log('Payload Opening:', payload.opening || '(none)');
  console.log('Result Alcohol:', r.recommendation?.alcohol?.name_ko || '(null)');
  console.log('Result Snack:', r.recommendation?.snack?.name_ko || '(null)');
  console.log('Answer Excerpt:', (r.answer || '').slice(0, 150).replace(/\n/g, ' '));
}

async function main() {
  await test('1. 홈에서 술(참이슬) 고르고 바로추천', '이거에 어울리는 안주 추천해줘', {
    opening: '지금 테이블에 참이슬가 있어요. 참이슬에 잘 어울리는 안주를 중심으로 추천해주세요.',
    skipPrompt: true,
  });

  await test('2. 채팅에서 직접 "소주 안주 추천해줘"', '소주에 어울리는 안주 추천해줘');

  await test('3. 술 미결정 - "오늘 뭐 마시지?"', '오늘 뭐 마시지?');

  await test('4. 술 미결정 - "비 오는데 추천해줘"', '비 오는데 추천해줘');

  await test('5. 순수 안주만 - "술 없이 안주만 추천해줘"', '술 없이 안주만 추천해줘');
}

main();
