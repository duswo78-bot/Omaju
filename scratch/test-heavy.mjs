import { runConversationTurn, resetConversation } from '../src/workers/conversationTurn.js';

async function main() {
  resetConversation();
  const res = await runConversationTurn('도수 센 독주 추천해줘', { profile: { name: '하마' } });
  console.log('Intent:', res.frame.intent);
  console.log('Constraints:', res.frame.slots.constraints);
  console.log('Alcohol:', res.recommendation?.alcohol);
  console.log('Snack:', res.recommendation?.snack);
}

main().catch(console.error);
