import { resetConversation, runConversationTurn } from './src/workers/conversationTurn.js';
import { seedMockEmbeddings } from './src/workers/engines/embeddingEngine.js';

seedMockEmbeddings();

async function test(text) {
  resetConversation();
  const r = await runConversationTurn(text);
  console.log(`\n[INPUT] "${text}"`);
  console.log(`  -> Best Alcohol: ${r.recommendation?.alcohol?.name_ko} (${r.recommendation?.alcohol?.category})`);
  console.log(`  -> Best Snack: ${r.recommendation?.snack?.name_ko} (${r.recommendation?.snack?.category})`);
  console.log(`  -> Response:\n${r.answer}`);
}

async function main() {
  console.log('=== [Whiskey Recommendation Test] ===');
  await test('위스키 안주 추천해줘');
  await test('발베니에 어울리는 안주');
  await test('버번 위스키 안주');
  await test('위스키에 달달한 거');
  await test('위스키 혼술');
}

main();
