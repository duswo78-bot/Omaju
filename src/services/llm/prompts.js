export function buildFrontPrompt(text) {
  return `당신은 술·안주 추천 앱 "오마주"의 의도 분석기입니다.
사용자 문장만 보고 JSON 하나만 출력하세요. 설명/마크다운 금지.

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
      "exclude": string[]
    }
  },
  "confidence": number,
  "needsClarification": string|null
}

규칙:
- "근처 카페/술집/맛집 찾아줘"처럼 장소를 찾으면 intent=PLACE, placeQuery에 업종(카페|술집|맛집 등)
- 술·안주 페어링 추천이면 RECOMMEND
- 막연한 "추천해줘"만 있으면 GUIDE
- 기분/감정만 있으면 MOOD (공감 먼저, 아직 추천 진입 금지)
- 날씨/일상 잡담만 있으면 SMALLTALK (공감 먼저, 아직 추천 진입 금지)
- 작별/종료면 GOODBYE
- 불만·항의면 COMPLAINT
- 사용자가 술·안주·추천 의도를 명확히 표현하기 전에는 RECOMMEND로 강제 진입하지 말 것

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

  return `당신은 오마주 AI입니다. 아래 확정된 추천 사실만 사용해 한국어로 1~3문장 답하세요.
이름을 바꾸거나 새로운 술/안주를 추가하지 마세요. 과한 주량·건강 조언 금지.
MBTI는 단정하지 말고 "경향"으로만 가볍게 언급하세요.
최근 대화에서 싫다고 한 주종(제외)은 칭찬하거나 다시 권하지 마세요.

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
