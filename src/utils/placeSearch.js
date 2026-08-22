/** 지도 딥링크 (목록 API 실패/키 없을 때 보조) */

export function buildPlaceQuery(snackName, drinkName) {
  const snack = (snackName || '').trim();
  const drink = (drinkName || '').trim();
  if (snack && drink) return `${snack} ${drink} 맛집`;
  if (snack) return `${snack} 술집`;
  if (drink) return `${drink} 맛집`;
  return '술집 맛집';
}

export function naverMapSearchUrl(query) {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

export function kakaoMapSearchUrl(query) {
  return `https://map.kakao.com/?q=${encodeURIComponent(query)}`;
}

export function openPlaceSearch(provider, snackName, drinkName) {
  const query = buildPlaceQuery(snackName, drinkName);
  const url = provider === 'kakao' ? kakaoMapSearchUrl(query) : naverMapSearchUrl(query);
  window.open(url, '_blank', 'noopener,noreferrer');
}
