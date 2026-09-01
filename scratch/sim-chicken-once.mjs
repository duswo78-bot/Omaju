import { seedMockEmbeddings } from "./src/workers/engines/embeddingEngine.js";
import { recommend } from "./src/workers/engines/recommendationEngine.js";
import { buildNluFrame } from "./src/workers/nlu/validate.js";
import { cleanTextString, simpleTokenize } from "./src/workers/utils/tokenizer.js";
import { clearConversationMemory } from "./src/workers/engines/memoryEngine.js";

seedMockEmbeddings();
clearConversationMemory();
const text = "치킨 먹고 싶어";
const frame = buildNluFrame(text, cleanTextString(text));
const r = await recommend(cleanTextString(text), simpleTokenize(text), [], { moods: [], weather: [] }, frame);
console.log(JSON.stringify({
  clean: cleanTextString(text),
  tokens: simpleTokenize(text),
  snackIds: frame.resolved.snackIds.length,
  alc: r.bestAlc?.name_ko,
  snack: r.bestSnack?.name_ko,
  isSnackMatched: r.isSnackMatched,
  isAlcMatched: r.isAlcMatched,
}, null, 2));
