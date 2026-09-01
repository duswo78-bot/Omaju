import { simpleTokenize, cleanTextString } from "./src/workers/utils/tokenizer.js";
import { recommend } from "./src/workers/engines/recommendationEngine.js";
import { seedMockEmbeddings } from "./src/workers/engines/embeddingEngine.js";
import { buildNluFrame } from "./src/workers/nlu/validate.js";
import { resetConversation } from "./src/workers/conversationTurn.js";
import { getProfile, syncMyProfile } from "./src/workers/engines/profileEngine.js";

seedMockEmbeddings();
const text = "치킨 먹고 싶어";
console.log("tokens", simpleTokenize(text));
const frame = buildNluFrame(text, cleanTextString(text));
console.log("hints", frame.slots.snackHints, "ids", frame.resolved.snackIds.slice(0,5));

// Run recommend many times to see snack diversity / ramen rate
const counts = {};
for (let i = 0; i < 30; i++) {
  const r = await recommend(cleanTextString(text), simpleTokenize(text), [], { moods: [], weather: [] }, frame);
  const name = r.bestSnack?.name_ko || "(none)";
  counts[name] = (counts[name] || 0) + 1;
  if (i === 0) console.log("sample", { alc: r.bestAlc?.name_ko, snack: name, isSnackMatched: r.isSnackMatched, isAlcMatched: r.isAlcMatched });
}
console.log("snack distribution", counts);
