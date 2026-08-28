import alcoholsData from '../../data/alcohols.json';
import snacksData from '../../data/snacks.json';
import { INTENTS, emptyFrame } from './schema.js';
import { ruleNlu } from './ruleNlu.js';

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

const MAX_RESOLVED_ALC = 12;
const MAX_RESOLVED_SNK = 24;

/**
 * 힌트 → 카탈로그 ID. 짧은 힌트는 과매칭을 막기 위해 이름 일치 위주.
 * 카테고리 힌트(소주/맥주…)는 카테고리 정확 일치만 허용하고 상한을 둔다.
 */
function resolveAlcoholIds(hints = []) {
  const exact = [];
  const category = [];
  for (const hint of hints) {
    const h = String(hint).trim();
    if (!h) continue;
    for (const alc of alcoholsData) {
      if (alc.id === h || alc.name_ko === h) {
        exact.push(alc.id);
        continue;
      }
      if (h.length >= 2 && alc.name_ko?.includes(h)) {
        exact.push(alc.id);
        continue;
      }
      if (alc.category === h) {
        category.push(alc.id);
      }
    }
  }
  const merged = uniq([...exact, ...category]);
  return merged.slice(0, MAX_RESOLVED_ALC);
}

function resolveSnackIds(hints = []) {
  const ids = [];
  for (const hint of hints) {
    const h = String(hint).trim();
    if (!h) continue;
    for (const snk of snacksData) {
      if (snk.id === h || snk.name_ko === h) {
        ids.push(snk.id);
        continue;
      }
      // 1글자 힌트(회/전 등): 이름 선두·정확 포함만, 태그 매칭 금지
      if (h.length === 1) {
        if (snk.name_ko?.includes(h)) ids.push(snk.id);
        continue;
      }
      if (snk.name_ko?.includes(h)) {
        ids.push(snk.id);
        continue;
      }
      // 태그는 힌트 길이 2+ 이고 태그 전체가 힌트를 포함할 때만
      if ((snk.tags || []).some((t) => String(t) === h || String(t).includes(h))) {
        ids.push(snk.id);
      }
    }
  }
  return uniq(ids).slice(0, MAX_RESOLVED_SNK);
}

/**
 * LLM Front draft를 느슨하게 파싱. 실패 시 null.
 * @param {unknown} draft
 * @returns {Partial<import('./schema.js').NluFrame>|null}
 */
export function parseFrontDraft(draft) {
  if (!draft) return null;
  let obj = draft;
  if (typeof draft === 'string') {
    try {
      const trimmed = draft.trim();
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start < 0 || end < 0) return null;
      obj = JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;

  const intent = INTENTS.includes(obj.intent) ? obj.intent : undefined;
  const slots = obj.slots && typeof obj.slots === 'object' ? obj.slots : {};
  return {
    intent,
    slots: {
      alcoholHints: uniq(slots.alcoholHints),
      snackHints: uniq(slots.snackHints),
      wantGame: Boolean(slots.wantGame),
      moods: uniq(slots.moods),
      weather: uniq(slots.weather),
      placeQuery: slots.placeQuery ? String(slots.placeQuery).trim() : undefined,
      constraints: {
        onlyAlcohol: Boolean(slots.constraints?.onlyAlcohol),
        onlySnack: Boolean(slots.constraints?.onlySnack),
        nonAlcoholic: Boolean(slots.constraints?.nonAlcoholic),
        spicy: Boolean(slots.constraints?.spicy),
        light: Boolean(slots.constraints?.light),
        cheap: Boolean(slots.constraints?.cheap),
        hangover: Boolean(slots.constraints?.hangover),
        exclude: uniq(slots.constraints?.exclude),
      },
    },
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.6,
    needsClarification: obj.needsClarification || undefined,
    guideHint: obj.guideHint || undefined,
    source: 'llm_front',
  };
}

/**
 * 규칙 Frame과 LLM draft를 병합·검증해 최종 Frame을 만든다.
 * @param {string} rawText
 * @param {string} cleanText
 * @param {unknown} [frontDraft]
 * @returns {import('./schema.js').NluFrame}
 */
export function buildNluFrame(rawText, cleanText, frontDraft) {
  const rule = ruleNlu(rawText, cleanText);
  const draft = parseFrontDraft(frontDraft);

  if (!draft) {
    const resolved = {
      alcoholIds: resolveAlcoholIds(rule.slots.alcoholHints),
      snackIds: resolveSnackIds(rule.slots.snackHints),
    };
    return { ...rule, resolved };
  }

  const intent = draft.intent || rule.intent;
  const slots = {
    alcoholHints: uniq([...(draft.slots.alcoholHints || []), ...(rule.slots.alcoholHints || [])]),
    snackHints: uniq([...(draft.slots.snackHints || []), ...(rule.slots.snackHints || [])]),
    wantGame: draft.slots.wantGame || rule.slots.wantGame,
    moods: uniq([...(draft.slots.moods || []), ...(rule.slots.moods || [])]),
    weather: uniq([...(draft.slots.weather || []), ...(rule.slots.weather || [])]),
    placeQuery: draft.slots.placeQuery || rule.slots.placeQuery,
    constraints: {
      onlyAlcohol: draft.slots.constraints?.onlyAlcohol || rule.slots.constraints?.onlyAlcohol,
      onlySnack: draft.slots.constraints?.onlySnack || rule.slots.constraints?.onlySnack,
      nonAlcoholic: draft.slots.constraints?.nonAlcoholic || rule.slots.constraints?.nonAlcoholic,
      spicy: draft.slots.constraints?.spicy || rule.slots.constraints?.spicy,
      light: draft.slots.constraints?.light || rule.slots.constraints?.light,
      cheap: draft.slots.constraints?.cheap || rule.slots.constraints?.cheap,
      hangover: draft.slots.constraints?.hangover || rule.slots.constraints?.hangover,
      exclude: uniq([
        ...(draft.slots.constraints?.exclude || []),
        ...(rule.slots.constraints?.exclude || []),
      ]),
    },
  };

  // 규칙이 분명하면 draft보다 우선
  let mergedIntent = intent;
  const ruleHasEntity =
    (rule.slots?.alcoholHints || []).length > 0 || (rule.slots?.snackHints || []).length > 0;
  if (rule.intent === 'PLACE' && rule.confidence >= 0.8) {
    mergedIntent = 'PLACE';
    if (!slots.placeQuery) slots.placeQuery = rule.slots.placeQuery;
  } else if (rule.intent === 'RECOMMEND' && rule.confidence >= 0.7 && ruleHasEntity) {
    // "맥주 추천해줘"를 FRONT가 MOOD/GUIDE/날씨 질문으로 덮지 못하게
    mergedIntent = 'RECOMMEND';
  } else if (rule.intent === 'MOOD' && rule.confidence >= 0.7) {
    mergedIntent = 'MOOD';
  } else if (rule.intent === 'GOODBYE' && rule.confidence >= 0.7) {
    mergedIntent = 'GOODBYE';
  } else if (rule.intent === 'COMPLAINT' && rule.confidence >= 0.7) {
    mergedIntent = 'COMPLAINT';
  } else if (
    (rule.intent === 'OFFTOPIC' || rule.intent === 'GUIDE' || rule.intent === 'SMALLTALK') &&
    rule.confidence >= 0.7 &&
    draft.intent === 'RECOMMEND' &&
    !(slots.alcoholHints?.length || slots.snackHints?.length)
  ) {
    mergedIntent = rule.intent;
  }

  const frame = emptyFrame({
    intent: mergedIntent,
    slots,
    confidence: Math.max(draft.confidence || 0, rule.confidence || 0),
    domainScore: rule.domainScore,
    needsClarification: draft.needsClarification || rule.needsClarification,
    guideHint: rule.guideHint || draft.guideHint,
    source: 'merged',
    rawText,
    matchedOpening: rule.matchedOpening,
  });

  frame.resolved = {
    alcoholIds: resolveAlcoholIds(slots.alcoholHints),
    snackIds: resolveSnackIds(slots.snackHints),
  };

  return frame;
}
