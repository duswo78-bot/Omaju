import { resetConversation, runConversationTurn } from './src/workers/conversationTurn.js';
import { seedMockEmbeddings } from './src/workers/engines/embeddingEngine.js';

seedMockEmbeddings();

async function test(text) {
  resetConversation();
  const r = await runConversationTurn(text);
  console.log(`\n[TEST]: "${text}"`);
  console.log('Intent:', r.facts?.intent);
  console.log('Alcohol:', r.recommendation?.alcohol?.name_ko || '(none)');
  console.log('Snack:', r.recommendation?.snack?.name_ko || '(none)');
  console.log('Game:', r.recommendation?.game?.name || '(none)');
  console.log('Answer:', (r.answer || '').slice(0, 180).replace(/\n/g, ' '));
}

async function main() {
  console.log('--- 1. 혼자 / 혼술 케이스 ---');
  await test('나 혼자야');
  await test('오늘 혼자 마셔');
  await test('혼술이야');
  await test('혼자 집에서 가볍게 한잔');

  console.log('\n--- 2. 술 안 마심 / 안 땡김 케이스 ---');
  await test('술 안 마신다');
  await test('오늘은 술이 안 땡기네');
  await test('오늘 술 안 마셔');
  await test('금주 중이야');
  await test('술 생각 없어');
}

main();
