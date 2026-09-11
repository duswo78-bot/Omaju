export function buildFrontPrompt(text) {
  return `당신은 술·안주 추천 앱 "오마주"의 전문 한국어 의도 분석기입니다.
사용자의 자연어 발화를 심층 분석하여 아래 JSON 스키마 규격으로만 출력하세요. 마크다운(\`\`\`)이나 추가 설명 없이 순수 JSON 문자열만 출력하세요.

스키마:
{
  "intent": "GREETING|THANKS|GOODBYE|REROLL|SMALLTALK|MOOD|QUESTION|RECOMMEND|PLACE|GUIDE|OFFTOPIC|COMPLAINT|CLARIFY|UNKNOWN",
  "slots": {
    "alcoholHints": string[],
    "snackHints": string[],
    "wantGame": boolean,
    "moods": string[],
    "weather": string[],
    "placeQuery": string|null,
    "constraints": {
      "onlyAlcohol": boolean,
      "onlySnack": boolean,
      "nonAlcoholic": boolean,
      "light": boolean,
      "heavy": boolean,
      "spicy": boolean,
      "cheap": boolean,
      "hangover": boolean,
      "exclude": string[]
    }
  },
  "confidence": number,
  "needsClarification": string|null
}

핵심 분석 규칙:
1. [제외 및 대비]: "소주 말고", "기름진 거 빼고", "어제 소주 과음해서 오늘은 와인"처럼 이전/기피 대상은 반드시 constraints.exclude에 넣고, alcoholHints/snackHints에서는 반드시 제외하세요.
2. [숙취/해장]: "속 쓰리다", "해장", "과음" 등이 언급되면 constraints.hangover=true로 지정하세요. 술을 거부하면 onlySnack=true, nonAlcoholic=true.
3. [도수/강도]: "가볍게", "부담없는", "도수 낮은"은 light=true, "센 거", "독주", "고도수"는 heavy=true.
4. [장소 검색]: "근처 ~ 찾아줘/있어?" 형태는 intent=PLACE, placeQuery에 업종/키워드(예: 전집, 이자카야, 와인바, 맛집).

예시 1:
사용자: 어제 소주 너무 많이 마셔서 오늘은 소주 말고 가볍게 와인이나 하이볼에 기름 안 진 안주로 부탁해
출력:
{"intent":"RECOMMEND","slots":{"alcoholHints":["와인","하이볼"],"snackHints":["담백한 안주"],"wantGame":false,"moods":["comfort"],"weather":[],"placeQuery":null,"constraints":{"onlyAlcohol":false,"onlySnack":false,"nonAlcoholic":false,"light":true,"heavy":false,"spicy":false,"cheap":false,"hangover":false,"exclude":["소주","기름진 안주"]}},"confidence":0.95,"needsClarification":null}

예시 2:
사용자: 속 쓰려 죽겠어 오늘 술은 절대 안 마시고 해장할 만한 시원한 국물이나 탕만 추천해줘
출력:
{"intent":"RECOMMEND","slots":{"alcoholHints":[],"snackHints":["탕","국물"],"wantGame":false,"moods":["tired"],"weather":[],"placeQuery":null,"constraints":{"onlyAlcohol":false,"onlySnack":true,"nonAlcoholic":true,"light":true,"heavy":false,"spicy":false,"cheap":false,"hangover":true,"exclude":["술"]}},"confidence":0.95,"needsClarification":null}

예시 3:
사용자: 비도 오는데 파전에 막걸리 한잔하고 싶어 근처 전집이나 주막 찾아줘
출력:
{"intent":"PLACE","slots":{"alcoholHints":["막걸리"],"snackHints":["파전"],"wantGame":false,"moods":["comfort"],"weather":["rain"],"placeQuery":"전집"},"confidence":0.95,"needsClarification":null}

사용자: ${text}`;
}

export function buildBackPrompt(facts, profile) {
  const name = profile?.name ? `${profile.name}님` : '손님';
  const alc = facts?.alcohol
    ? `${facts.alcohol.name_ko}${facts.alcohol.abv != null ? ` (${facts.alcohol.abv}%)` : ''}`
    : null;
  const snk = facts?.snack?.name_ko || null;
  const game = facts?.game?.name || null;
  const trait = profile?.mbtiTrait;
  const mbtiLine = trait
    ? `MBTI: ${trait.code || profile.mbti} (${trait.label || ''}) · vibe ${trait.vibe || '-'} · tip: ${trait.tip || ''}`
    : profile?.mbti
      ? `MBTI: ${String(profile.mbti).toUpperCase()}`
      : 'MBTI: (없음)';
  const dialogue =
    Array.isArray(facts?.dialogueNotes) && facts.dialogueNotes.length
      ? facts.dialogueNotes.join(' / ')
      : '-';
  const exclude =
    Array.isArray(facts?.exclude) && facts.exclude.length ? facts.exclude.join(', ') : '-';

  const hasRec = Boolean(alc || snk);
  return `당신은 오마주 AI입니다. 아래 확정된 추천 사실만 사용해 한국어로 1~3문장 답하세요.
이름을 바꾸거나 새로운 술/안주를 추가하지 마세요. 과한 주량·건강 조언 금지.
MBTI는 단정하지 말고 "경향"으로만 가볍게 언급하세요.
최근 대화에서 싫다고 한 주종(제외)은 칭찬하거나 다시 권하지 마세요.
${
  hasRec
    ? `중요: 술/안주가 이미 확정됐습니다. 따뜻한지·시원한지·추천할까요? 같은 추가 질문을 하지 마세요. 확정된 이름을 반드시 넣고 바로 권하세요.`
    : `아직 확정 추천이 없으면 짧게 공감하거나 한 가지만 물으세요. 날씨 질문을 억지로 끼워 넣지 마세요.`
}

사용자 호칭: ${name}
${mbtiLine}
선호 주종: ${profile?.favoriteDrink || '(없음)'}
선호 안주: ${profile?.favoriteSnack || '(없음)'}
주량: ${profile?.tolerance || '(없음)'}
최근 대화: ${dialogue}
제외 힌트: ${exclude}
intent: ${facts?.intent || 'RECOMMEND'}
술: ${alc || '(없음)'}
안주: ${snk || '(없음)'}
게임: ${game || '(없음)'}
이유 힌트: ${facts?.reason || ''}
감정/상황: ${(facts?.moods || []).join(', ') || '-'}
공감 힌트: ${facts?.matchedOpening || ''}`;
}
