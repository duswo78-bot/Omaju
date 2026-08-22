/** 안주/술을 취급하는 주점·맛집 지도 검색 */

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
