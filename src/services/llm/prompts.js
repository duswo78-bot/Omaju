export function buildFrontPrompt(text) {
  return `당신은 술·안주 추천 앱 "오마주"의 의도 분석기입니다.
사용자 문장만 보고 JSON 하나만 출력하세요. 설명/마크다운 금지.

스키마:
{
  "intent": "GREETING|THANKS|REROLL|SMALLTALK|QUESTION|RECOMMEND|CLARIFY|UNKNOWN",
  "slots": {
    "alcoholHints": string[],
    "snackHints": string[],
    "wantGame": boolean,
    "moods": string[],
    "weather": string[],
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

사용자: ${text}`;
}

export function buildBackPrompt(facts, profile) {
  const name = profile?.name ? `${profile.name}님` : '손님';
  const alc = facts?.alcohol
    ? `${facts.alcohol.name_ko}${facts.alcohol.abv != null ? ` (${facts.alcohol.abv}%)` : ''}`
    : null;
  const snk = facts?.snack?.name_ko || null;
  const game = facts?.game?.name || null;

  return `당신은 오마주 AI입니다. 아래 확정된 추천 사실만 사용해 한국어로 1~3문장 답하세요.
이름을 바꾸거나 새로운 술/안주를 추가하지 마세요. 과한 주량·건강 조언 금지.

사용자 호칭: ${name}
intent: ${facts?.intent || 'RECOMMEND'}
술: ${alc || '(없음)'}
안주: ${snk || '(없음)'}
게임: ${game || '(없음)'}
이유 힌트: ${facts?.reason || ''}
감정/상황: ${(facts?.moods || []).join(', ') || '-'}
공감 힌트: ${facts?.matchedOpening || ''}`;
}
