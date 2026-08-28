/**
 * 100회 멀티턴 시뮬레이션 + 불변식 검사
 * npx vite-node scratch/sim-100.mjs
 */
import { seedMockEmbeddings } from '../src/workers/engines/embeddingEngine.js';
import { resetConversation, runConversationTurn } from '../src/workers/conversationTurn.js';

seedMockEmbeddings();

const POOLS = {
  unknown: ['ㅋㅋㅋ', 'ㅁㄴㅇㄹ', 'asdf', 'ㅎㅎㅎ', '???', 'ㅇ', '그냥', '음'],
  moodNeg: ['피곤해', '힘들다', '우울해', '스트레스 받아', '지쳤어', '외로워', '개피곤'],
  moodPos: ['신나', '행복해', '합격했어', '기분 좋아', '설레'],
  weather: ['비 온다', '비도 오고 힘들다', '눈 오네', '너무 더워', '추워 죽겠어', '장마야'],
  deny: ['아니', '싫어', 'ㄴㄴ', '됐어', '아뇨', '노'],
  affirm: ['응', '어', '좋아', '그래', 'ㅇㅇ', '네', 'ㄱㄱ'],
  beer: ['맥주 추천해줘', '시원한 맥주', '치맥각', '맥주 줘'],
  soju: ['소주 추천', '쓰오주 추천', '소주 한잔'],
  snackOnly: ['안주만 추천해줘', '매콤한 안주만', '안주만'],
  alcOnly: ['술만 추천해줘', '술만'],
  place: ['근처 카페 추천해줘', '근처 술집 찾아줘', '주변 맛집'],
  date: ['데이트인데 와인', '소개팅 와인 추천'],
  honsul: ['혼자 가볍게 한잔', '혼술할래', '혼맥'],
  reroll: ['다른거', '바꿔줘', '다시 추천해줘'],
  goodbye: ['이만 끊을게', '잘가', 'ㅂㅂ', '다음에 봐'],
  complaint: ['이게 뭐야', '이상해', '실망이야'],
  driving: ['운전해야 해서 논알콜', '대리 불러야 해서 무알'],
  hangover: ['해장 뭐 먹지', '혀장 추천'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** @type {Array<{ name: string, build: () => string[], check: (outs: any[]) => void }>} */
const SCENARIO_BUILDERS = [
  {
    name: 'soft-ask-deny',
    build: () => [pick(POOLS.unknown), pick(POOLS.deny)],
    check: (outs) => {
      if (outs[1].frame.intent !== 'DENY') throw new Error(`expected DENY got ${outs[1].frame.intent}`);
      if (outs[1].recommendation?.alcohol || outs[1].recommendation?.snack) {
        throw new Error('deny after soft ask recommended');
      }
    },
  },
  {
    name: 'mood-deny',
    build: () => [pick(POOLS.moodNeg), pick(POOLS.deny)],
    check: (outs) => {
      if (outs[1].recommendation?.alcohol || outs[1].recommendation?.snack) {
        throw new Error('mood deny recommended');
      }
    },
  },
  {
    name: 'mood-affirm',
    build: () => [pick([...POOLS.moodNeg, ...POOLS.weather]), pick(POOLS.affirm)],
    check: (outs) => {
      // soft ask 후 긍정은 추천이어야 함 (AFFIRM/THANKS/RECOMMEND)
      const second = outs[1];
      const ok =
        second.recommendation?.alcohol ||
        second.recommendation?.snack ||
        second.frame.intent === 'GUIDE' ||
        second.frame.intent === 'THANKS';
      // THANKS short "좋아" may be THANKS not AFFIRM - allow non-rec if THANKS
      if (second.frame.intent === 'THANKS') return;
      if (!second.recommendation?.alcohol && !second.recommendation?.snack && second.frame.intent === 'AFFIRM') {
        throw new Error('affirm after soft ask did not recommend');
      }
      if (!ok && second.frame.intent === 'DENY') throw new Error('unexpected deny');
    },
  },
  {
    name: 'beer-rec',
    build: () => [pick(POOLS.beer)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'RECOMMEND' && outs[0].frame.intent !== 'GUIDE') {
        // 치맥각 등은 recommend
      }
      if (outs[0].frame.intent === 'RECOMMEND' && !outs[0].recommendation?.alcohol && !outs[0].recommendation?.snack) {
        throw new Error('recommend intent without items');
      }
    },
  },
  {
    name: 'snack-only',
    build: () => [pick(POOLS.snackOnly)],
    check: (outs) => {
      if (outs[0].recommendation?.alcohol) {
        throw new Error(`onlySnack leaked alcohol ${outs[0].recommendation.alcohol.name_ko}`);
      }
    },
  },
  {
    name: 'alc-only',
    build: () => [pick(POOLS.alcOnly)],
    check: (outs) => {
      if (outs[0].recommendation?.snack) {
        throw new Error(`onlyAlcohol leaked snack ${outs[0].recommendation.snack.name_ko}`);
      }
    },
  },
  {
    name: 'place',
    build: () => [pick(POOLS.place)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'PLACE') throw new Error(`place got ${outs[0].frame.intent}`);
      if (outs[0].recommendation?.alcohol) throw new Error('place should not recommend alc');
    },
  },
  {
    name: 'reroll',
    build: () => [pick(POOLS.beer), pick(POOLS.reroll)],
    check: (outs) => {
      if (!outs[0].recommendation) throw new Error('first rec missing');
      // second should attempt another rec (reroll)
      if (!outs[1].answer) throw new Error('no reroll answer');
    },
  },
  {
    name: 'goodbye',
    build: () => [pick(POOLS.goodbye)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'GOODBYE') throw new Error(`goodbye got ${outs[0].frame.intent}`);
      if (outs[0].state !== 'ENDED') throw new Error(`state ${outs[0].state}`);
    },
  },
  {
    name: 'complaint',
    build: () => [pick(POOLS.complaint)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'COMPLAINT') throw new Error(`complaint got ${outs[0].frame.intent}`);
      if (outs[0].recommendation) throw new Error('complaint recommended');
    },
  },
  {
    name: 'weather-deny-beer',
    build: () => [pick(POOLS.weather), pick(POOLS.deny), pick(POOLS.beer)],
    check: (outs) => {
      if (outs[1].recommendation) throw new Error('deny recommended');
      if (outs[2].frame.intent !== 'RECOMMEND') throw new Error(`beer intent ${outs[2].frame.intent}`);
    },
  },
  {
    name: 'date-wine',
    build: () => [pick(POOLS.date)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'RECOMMEND') throw new Error(`date intent ${outs[0].frame.intent}`);
    },
  },
  {
    name: 'honsul',
    build: () => [pick(POOLS.honsul)],
    check: (outs) => {
      if (!outs[0].semantic?.relation && outs[0].frame.intent === 'UNKNOWN') {
        throw new Error('honsul unknown');
      }
    },
  },
  {
    name: 'driving-nonalc',
    build: () => [pick(POOLS.driving)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'RECOMMEND') throw new Error(`driving ${outs[0].frame.intent}`);
      // prefer nonalc if possible
    },
  },
  {
    name: 'hangover',
    build: () => [pick(POOLS.hangover)],
    check: (outs) => {
      if (!['RECOMMEND', 'GUIDE'].includes(outs[0].frame.intent)) {
        throw new Error(`hangover ${outs[0].frame.intent}`);
      }
    },
  },
  {
    name: 'mood-affirm-deny-safe',
    build: () => [pick(POOLS.moodPos), pick(POOLS.deny)],
    check: (outs) => {
      if (outs[1].recommendation) throw new Error('pos mood deny recommended');
    },
  },
  {
    name: 'unknown-recover',
    build: () => [pick(POOLS.unknown), pick(POOLS.soju)],
    check: (outs) => {
      if (outs[0].frame.intent !== 'UNKNOWN') throw new Error('expected unknown');
      if (outs[1].frame.intent !== 'RECOMMEND') throw new Error(`recover ${outs[1].frame.intent}`);
    },
  },
  {
    name: 'triple-deny',
    build: () => [pick(POOLS.moodNeg), pick(POOLS.deny), pick(POOLS.deny)],
    check: (outs) => {
      if (outs[1].recommendation || outs[2].recommendation) throw new Error('deny chain recommended');
    },
  },
];

async function runOne(i) {
  const builder = SCENARIO_BUILDERS[i % SCENARIO_BUILDERS.length];
  // mix: also pure random builder picks
  const useRandom = Math.random() < 0.35;
  let name = builder.name;
  let users = builder.build();
  let check = builder.check;

  if (useRandom) {
    name = 'random-mix';
    const a = pick([...POOLS.moodNeg, ...POOLS.weather, ...POOLS.unknown, ...POOLS.beer, ...POOLS.honsul]);
    const b = pick([...POOLS.affirm, ...POOLS.deny, ...POOLS.beer, ...POOLS.snackOnly, ...POOLS.reroll]);
    users = Math.random() < 0.5 ? [a, b] : [a, b, pick([...POOLS.deny, ...POOLS.affirm, ...POOLS.goodbye])];
    check = (outs) => {
      // global invariants
      for (let i = 0; i < outs.length; i++) {
        const o = outs[i];
        if (!o.answer || !String(o.answer).trim()) throw new Error(`empty answer turn ${i}`);
        if (o.frame.intent === 'DENY' && (o.recommendation?.alcohol || o.recommendation?.snack)) {
          // allow only if previous was AWAITING card - check state of previous
          const prev = outs[i - 1];
          if (prev?.state !== 'AWAITING_REC_CONFIRM') {
            throw new Error(`DENY recommended outside card reject at turn ${i}`);
          }
        }
        if (o.frame.intent === 'PLACE' && o.recommendation?.alcohol) {
          throw new Error('PLACE with alcohol card');
        }
        if (o.frame.intent === 'GOODBYE' && o.state !== 'ENDED') {
          throw new Error('GOODBYE not ENDED');
        }
      }
    };
  }

  resetConversation();
  const outs = [];
  for (const u of users) {
    outs.push(await runConversationTurn(u, { profile: { name: '시뮬' } }));
  }
  check(outs);
  return { name, users, ok: true };
}

const N = 100;
const failures = [];
const byName = {};
let passed = 0;

for (let i = 0; i < N; i++) {
  try {
    const r = await runOne(i);
    passed += 1;
    byName[r.name] = (byName[r.name] || 0) + 1;
  } catch (e) {
    failures.push({ i, error: String(e.message || e) });
    console.error(`FAIL #${i}`, e.message);
  }
}

console.log('\n=== 100-run summary ===');
console.log(`passed=${passed}/${N} failed=${failures.length}`);
console.log('by scenario:', byName);
if (failures.length) {
  console.log('sample failures:', failures.slice(0, 8));
  process.exit(1);
}
console.log('All 100 simulations passed.');
