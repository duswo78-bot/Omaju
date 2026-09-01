import { resetConversation, runConversationTurn } from './src/workers/conversationTurn.js';
import { seedMockEmbeddings } from './src/workers/engines/embeddingEngine.js';

seedMockEmbeddings();

async function test(text) {
  resetConversation();
  const r = await runConversationTurn(text);
  console.log(`\n[INPUT] "${text}"`);
  console.log(`  -> Intent: ${r.facts?.intent}`);
  console.log(`  -> Response:\n${r.answer}`);
}

async function main() {
  console.log('=== [Tier 1] 애매한 의도 → 후보 1~2개 제시 (Clarify) ===');
  await test('와인');
  await test('치킨');
  await test('해장');
  await test('비');

  console.log('\n=== [Tier 2] 도메인 내 매칭 불가 / 기능 안내 (Capability Guide) ===');
  await test('도와줘');
  await test('뭐할수있어');
  await test('asdfg');

  console.log('\n=== [Tier 3] 엉뚱한 질문 / 세상만사 잡담 (Witty Chit-chat) ===');
  await test('비트코인 지금 살까?');
  await test('인생이란 무엇일까?');
  await test('외계인이 있을까?');
  await test('파이썬 코딩 알려줘');
  await test('심심해 놀아줘');
  await test('너 바보야?');
  await test('로또 번호 추천해줘');
}

main();
