import { seedMockEmbeddings } from "./src/workers/engines/embeddingEngine.js";
import { recommend } from "./src/workers/engines/recommendationEngine.js";
import { buildNluFrame } from "./src/workers/nlu/validate.js";
import { cleanTextString, simpleTokenize } from "./src/workers/utils/tokenizer.js";
import { clearConversationMemory } from "./src/workers/engines/memoryEngine.js";
import { resetConversation, runConversationTurn } from "./src/workers/conversationTurn.js";

seedMockEmbeddings();
clearConversationMemory();

const text = "치킨 먹고 싶어";
const frame = buildNluFrame(text, cleanTextString(text));
const counts = {};
let bad = 0;
for (let i = 0; i < 25; i++) {
  clearConversationMemory();
  const r = await recommend(cleanTextString(text), simpleTokenize(text), [], { moods: [], weather: [] }, frame);
  const name = r.bestSnack?.name_ko || "(none)";
  counts[name] = (counts[name] || 0) + 1;
  const ok = /치킨|닭/.test(name);
  if (!ok) bad++;
}
console.log("distribution", counts);
console.log("non-chicken count", bad);

resetConversation();
const turn = await runConversationTurn(text, { profile: { name: "테스트" } });
console.log("turn", {
  snack: turn.recommendation?.snack?.name_ko,
  alc: turn.recommendation?.alcohol?.name_ko,
});

// 맥주+치킨도 치킨 유지
clearConversationMemory();
const t2 = "치킨이랑 맥주";
const f2 = buildNluFrame(t2, cleanTextString(t2));
const r2 = await recommend(cleanTextString(t2), simpleTokenize(t2), [], {}, f2);
console.log("chimaek", { snack: r2.bestSnack?.name_ko, alc: r2.bestAlc?.name_ko, hints: f2.slots });

if (bad > 0) throw new Error("chicken lock failed");
if (!/치킨|닭/.test(turn.recommendation?.snack?.name_ko || "")) throw new Error("turn snack not chicken");
console.log("PASS");
