import { seedMockEmbeddings, getSnackEmbeddings, embedQuery } from "./src/workers/engines/embeddingEngine.js";
import { calculateScore } from "./src/workers/engines/scoreEngine.js";
import { cosineSimilarity } from "./src/workers/utils/math.js";
import { buildNluFrame } from "./src/workers/nlu/validate.js";
import { cleanTextString, simpleTokenize } from "./src/workers/utils/tokenizer.js";

seedMockEmbeddings();
const text = "치킨 먹고 싶어";
const frame = buildNluFrame(text, cleanTextString(text));
const tokens = simpleTokenize(text);
const resolved = new Set(frame.resolved.snackIds);
const q = await embedQuery(cleanTextString(text));
const snacks = getSnackEmbeddings();
console.log("snack emb count", snacks.length, "resolved", resolved.size);

const chicken = snacks.filter(s => s.item.name_ko?.includes("치킨") || resolved.has(s.item.id)).slice(0, 5);
for (const { item, vector } of chicken) {
  const base = cosineSimilarity(q, vector);
  const { score, isMatched } = calculateScore(base, item, tokens, [], {}, {}, false, true, ["회"]);
  console.log(item.id, item.name_ko, { base: +base.toFixed(3), score: +score.toFixed(3), isMatched, inResolved: resolved.has(item.id) });
}

const top = snacks.map(({ item, vector }) => {
  const base = cosineSimilarity(q, vector);
  let { score, isMatched } = calculateScore(base, item, tokens, [], {}, {}, false, true, ["회"]);
  if (resolved.has(item.id)) { score += 0.35; isMatched = true; }
  return { name: item.name_ko, score, isMatched };
}).sort((a,b)=>b.score-a.score).slice(0,15);
console.log("TOP15", top);
