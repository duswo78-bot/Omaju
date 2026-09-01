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
  await test('와인에 뭐 먹지');
  await test('치킨에 술 뭐 마셔');
  await test('달달한 거');
  await test('시원한 거');
  await test('비 오는 날');
}

main();
