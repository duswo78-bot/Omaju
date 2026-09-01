import { resetConversation, runConversationTurn } from './src/workers/conversationTurn.js';
import { seedMockEmbeddings } from './src/workers/engines/embeddingEngine.js';

seedMockEmbeddings();

async function test(text) {
  resetConversation();
  const r = await runConversationTurn(text);
  console.log(`[TEST] "${text}"`);
  console.log(`  -> Intent: ${r.facts?.intent} | Alc: ${r.recommendation?.alcohol?.name_ko || '(none)'} | Snack: ${r.recommendation?.snack?.name_ko || '(none)'} | Game: ${r.recommendation?.game?.name || '(none)'}`);
  console.log(`  -> Answer: ${r.answer.slice(0, 100).replace(/\n/g, ' ')}...`);
}

async function main() {
  console.log('=== 1. 혼자 / 혼술 15종 베리에이션 테스트 ===');
  const honsulVariations = [
    '나 혼자야',
    '오늘 혼자 마셔',
    '혼술이야',
    '혼술할래',
    '집에서 혼자 마시는데',
    '나홀로 한잔할까 해',
    '자취방에서 혼술',
    '방구석에서 혼자 술 한잔',
    '퇴근하고 혼자 마실 거 추천해줘',
    '혼자 조용히 마시고 싶어',
    '혼맥 한캔 하고 싶네',
    '혼소주 한잔 각이다',
    '혼와인 추천해줘',
    '혼자 먹는데 뭐 마실까',
    '혼술 안주랑 어울리는 술 골라줘',
    '혼자 힐링하고 싶어',
  ];

  for (const v of honsulVariations) {
    await test(v);
  }

  console.log('\n=== 2. 술 안 마심 / 안 땡김 / 금주 15종 베리에이션 테스트 ===');
  const declineVariations = [
    '술 안 마신다',
    '오늘은 술이 안 땡기네',
    '술 생각 없어',
    '술 생각 1도 없음',
    '금주 중이야',
    '단주 중이야',
    '술 끊었어',
    '술 자제 중이야',
    '술은 됐어',
    '술은 패스할래',
    '술은 빼줘',
    '오늘은 노알콜로 갈래',
    '논알콜만 마실래',
    '술 마실 기분 아니야',
    '술 안 받아 오늘',
    '알콜 없이 먹을 거 추천해줘',
    '간 쉬게 해줄래',
    '속 안 좋아서 술은 패스',
    '술 안 먹고 싶어',
  ];

  for (const v of declineVariations) {
    await test(v);
  }
}

main();
