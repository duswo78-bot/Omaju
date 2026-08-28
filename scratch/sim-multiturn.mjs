/**
 * 골든 멀티턴 회귀 시뮬
 * npx vite-node scratch/sim-multiturn.mjs
 */
import { seedMockEmbeddings } from '../src/workers/engines/embeddingEngine.js';
import { resetConversation, runConversationTurn } from '../src/workers/conversationTurn.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runScenario(name, turns, check) {
  resetConversation();
  const transcript = [];
  for (const user of turns) {
    const out = await runConversationTurn(user, { profile: { name: '테스트' } });
    transcript.push({
      user,
      intent: out.frame?.intent,
      answer: out.answer,
      state: out.state,
      lastBotAsk: out.lastBotAsk,
      semantic: out.semantic,
      rec: out.recommendation
        ? {
            alc: out.recommendation.alcohol?.name_ko,
            snk: out.recommendation.snack?.name_ko,
          }
        : null,
    });
  }
  try {
    check(transcript);
    console.log(`OK  ${name}`);
    return { name, ok: true, transcript };
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    console.error(JSON.stringify(transcript, null, 2));
    return { name, ok: false, error: e.message, transcript };
  }
}

seedMockEmbeddings();

const results = [];

results.push(
  await runScenario(
    'rain+tired → affirm → recommend',
    ['오늘 비도 오고 힘들다', '응'],
    (t) => {
      assert(t[0].intent === 'MOOD' || t[0].intent === 'SMALLTALK', `t0 intent ${t[0].intent}`);
      assert(t[0].semantic.weather.includes('rain'), 'rain');
      assert(t[0].semantic.mood === 'negative', 'negative');
      assert(t[0].lastBotAsk === 'recommend' || /추천|볼까요|어때요|마셔요/.test(t[0].answer), 'ask soft');
      assert(t[1].rec?.alc || t[1].rec?.snk, 'should recommend after affirm');
      assert(t[1].semantic.weather.includes('rain'), 'rain inherited');
    }
  )
);

results.push(
  await runScenario(
    'honsul light → recommend',
    ['혼자 가볍게 한잔'],
    (t) => {
      assert(t[0].semantic.relation === 'alone', 'alone');
      assert(t[0].rec?.alc || t[0].intent === 'RECOMMEND' || /추천|한잔|가볍게/.test(t[0].answer), 'path ok');
    }
  )
);

results.push(
  await runScenario(
    'unknown → recover with beer',
    ['ㅋㅋㅋㅋ', '맥주 추천해줘'],
    (t) => {
      assert(t[0].intent === 'UNKNOWN', 'unknown');
      assert(/죄송|몰라|다시|미안/.test(t[0].answer), 'apology tone');
      assert(t[1].intent === 'RECOMMEND', `recover intent ${t[1].intent}`);
      assert(t[1].rec?.alc, 'beer rec');
    }
  )
);

results.push(
  await runScenario(
    'recommend → reroll',
    ['맥주 추천해줘', '다른거'],
    (t) => {
      assert(t[0].rec?.alc, 'first rec');
      assert(t[1].intent === 'REROLL' || t[1].rec, `reroll ${t[1].intent}`);
      // 가능하면 다른 추천
      if (t[0].rec?.alc && t[1].rec?.alc) {
        // soft check: allow same sometimes but log
        if (t[0].rec.alc === t[1].rec.alc) {
          console.warn('  warn: reroll returned same alcohol', t[0].rec.alc);
        }
      }
    }
  )
);

results.push(
  await runScenario(
    'place cafe',
    ['근처 카페 추천해줘'],
    (t) => {
      assert(t[0].intent === 'PLACE', 'place');
      assert(t[0].answer, 'answer');
    }
  )
);

results.push(
  await runScenario(
    'date wine',
    ['데이트인데 와인 추천'],
    (t) => {
      assert(t[0].intent === 'RECOMMEND', `intent ${t[0].intent}`);
      assert(t[0].semantic.relation === 'date' || t[0].frame.slots.alcoholHints?.includes('와인'), 'date/wine');
      assert(t[0].rec?.alc, 'wine-ish rec');
    }
  )
);

results.push(
  await runScenario(
    'greeting → mood → affirm',
    ['안녕', '피곤해', '좋아'],
    (t) => {
      assert(t[0].intent === 'GREETING', 'greeting');
      assert(t[1].intent === 'MOOD', `mood ${t[1].intent}`);
      assert(t[1].semantic.energy === 'low' || t[1].semantic.mood === 'negative', 'tired signal');
      // 좋아 may be AFFIRM or THANKS depending on length/rules
      assert(
        t[2].rec || t[2].intent === 'AFFIRM' || t[2].intent === 'THANKS' || t[2].intent === 'RECOMMEND',
        `t2 ${t[2].intent}`
      );
    }
  )
);

results.push(
  await runScenario(
    'spicy snack only',
    ['매콤한 안주만 추천해줘'],
    (t) => {
      assert(t[0].intent === 'RECOMMEND', 'recommend');
      assert(t[0].rec?.snk, 'has snack');
      assert(!t[0].rec?.alc, `onlySnack must not include alcohol, got ${t[0].rec?.alc}`);
    }
  )
);

results.push(
  await runScenario(
    'weather then deny then beer',
    ['비 온다', '아니', '맥주 줘'],
    (t) => {
      assert(t[0].semantic.weather.includes('rain'), 'rain');
      assert(t[2].intent === 'RECOMMEND', 'beer recommend');
      assert(t[2].rec?.alc, 'has alc');
    }
  )
);

results.push(
  await runScenario(
    'goodbye',
    ['이만 끊을게'],
    (t) => {
      assert(t[0].intent === 'GOODBYE', 'goodbye');
      assert(t[0].state === 'ENDED', 'ended');
    }
  )
);

results.push(
  await runScenario(
    'soft ask drink → deny must not recommend',
    ['ㅋㅋㅋㅋ', '아니'],
    (t) => {
      assert(t[0].intent === 'UNKNOWN', 'unknown first');
      assert(/한 잔|마셔|술|안주/.test(t[0].answer), 'asked something');
      assert(t[1].intent === 'DENY', `deny got ${t[1].intent}`);
      assert(!t[1].rec?.alc && !t[1].rec?.snk, `deny must not recommend, got ${JSON.stringify(t[1].rec)}`);
      assert(/알겠|괜찮|패스|마시지|술 없|강요|쉬시/.test(t[1].answer), `ack deny tone: ${t[1].answer}`);
    }
  )
);

results.push(
  await runScenario(
    'mood soft ask → deny must not recommend',
    ['오늘 너무 피곤해', '아니'],
    (t) => {
      assert(t[0].intent === 'MOOD', `mood ${t[0].intent}`);
      assert(t[0].lastBotAsk === 'recommend' || /추천|볼까요|어때요|마셔/.test(t[0].answer), 'soft ask');
      assert(t[1].intent === 'DENY', 'deny');
      assert(!t[1].rec?.alc && !t[1].rec?.snk, 'no recommendation on deny');
    }
  )
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`);
if (failed.length) {
  console.error('Failed:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
console.log('Multi-turn simulation passed.');
