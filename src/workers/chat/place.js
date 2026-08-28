import { extractPlaceQueryFromText } from '../../utils/snackToVenueQuery.js';

/**
 * 근처 가게/카페/술집 검색 의도 — UI에서 PlaceFinder를 연다.
 */
export function handlePlace(text, context) {
  const frame = context.frame;
  const query =
    frame?.slots?.placeQuery ||
    extractPlaceQueryFromText(text) ||
    extractPlaceQueryFromText(frame?.rawText) ||
    '술집';

  const answer = `"${query}" 근처를 찾아볼게요. 위치를 확인한 뒤 가까운 곳부터 보여 드릴게요.`;

  return {
    answer,
    bestAlc: null,
    bestSnack: null,
    bestGame: null,
    placeSearch: {
      venueQuery: query,
      label: `근처 ${query}`,
    },
    state: 'IDLE',
  };
}
