import { DEFAULT_RADIUS_M } from '../data/venueTaxonomy';
import { haversineMeters } from './geoService';

/**
 * 카카오 로컬 검색
 * - 개발/프리뷰: Vite 프록시 `/api/kakao` (CORS 회피)
 * - 배포: VITE_KAKAO_API_BASE 가 있으면 그 프록시 사용, 없으면 dapi 직접(브라우저 CORS에 막힐 수 있음)
 * - JS SDK는 보조 (JS키+도메인 등록 필요)
 */

export function getKakaoRestKey() {
  return import.meta.env.VITE_KAKAO_REST_KEY || import.meta.env.VITE_KAKAO_JS_KEY || '';
}

export function getKakaoJsKey() {
  return import.meta.env.VITE_KAKAO_JS_KEY || '';
}

export function hasKakaoKey() {
  return Boolean(getKakaoRestKey() || getKakaoJsKey());
}

function apiBase() {
  if (import.meta.env.VITE_KAKAO_API_BASE) return import.meta.env.VITE_KAKAO_API_BASE.replace(/\/$/, '');
  // 로컬/프리뷰는 Vite 프록시
  if (import.meta.env.DEV) return '/api/kakao';
  // 같은 origin 프록시가 있을 때 (커스텀 도메인 등)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return '/api/kakao';
  return 'https://dapi.kakao.com';
}

function normalizePlace(place, origin) {
  const lat = Number(place.y);
  const lng = Number(place.x);
  return {
    id: place.id,
    name: place.place_name,
    category: place.category_name,
    phone: place.phone,
    address: place.road_address_name || place.address_name,
    lat,
    lng,
    distance: Number(place.distance) || haversineMeters(origin, { lat, lng }),
    url: place.place_url,
    provider: 'kakao',
  };
}

let mapsSdkPromise = null;

function loadKakaoMapsSdk() {
  const jsKey = getKakaoJsKey();
  if (!jsKey) {
    return Promise.reject(Object.assign(new Error('NO_KAKAO_JS_KEY'), { code: 'NO_KAKAO_JS_KEY' }));
  }
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
  if (mapsSdkPromise) return mapsSdkPromise;

  mapsSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&libraries=services&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      mapsSdkPromise = null;
      reject(Object.assign(new Error('KAKAO_SDK_LOAD_FAIL'), { code: 'KAKAO_SDK_LOAD_FAIL' }));
    };
    document.head.appendChild(script);
  });
  return mapsSdkPromise;
}

async function searchViaSdk({ query, lat, lng, radius, size }) {
  const kakao = await loadKakaoMapsSdk();
  const places = new kakao.maps.services.Places();
  const origin = { lat, lng };

  return new Promise((resolve, reject) => {
    places.keywordSearch(
      query,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve((data || []).slice(0, size).map((p) => normalizePlace(p, origin)));
          return;
        }
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }
        reject(Object.assign(new Error(`Kakao SDK: ${status}`), { code: 'KAKAO_SDK', status }));
      },
      {
        location: new kakao.maps.LatLng(lat, lng),
        radius,
        size,
        sort: kakao.maps.services.SortBy.DISTANCE,
      }
    );
  });
}

async function searchViaRest({ query, lat, lng, radius, size }) {
  const key = getKakaoRestKey();
  if (!key) {
    throw Object.assign(new Error('NO_KAKAO_KEY'), { code: 'NO_KAKAO_KEY' });
  }

  const params = new URLSearchParams({
    query,
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    size: String(size),
    sort: 'distance',
  });

  const url = `${apiBase()}/v2/local/search/keyword.json?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Kakao HTTP ${res.status}: ${text}`), {
      code: 'KAKAO_HTTP',
      status: res.status,
    });
  }

  const data = await res.json();
  return (data.documents || []).map((doc) => normalizePlace(doc, { lat, lng }));
}

export async function searchKakaoPlaces({
  query,
  lat,
  lng,
  radius = DEFAULT_RADIUS_M,
  size = 15,
}) {
  const errors = [];

  // 1) REST (프록시 경유 시 안정적)
  try {
    return await searchViaRest({ query, lat, lng, radius, size });
  } catch (e) {
    errors.push(e);
  }

  // 2) JS SDK 보조
  try {
    return await searchViaSdk({ query, lat, lng, radius, size });
  } catch (e) {
    errors.push(e);
  }

  const last = errors[errors.length - 1] || new Error('KAKAO_SEARCH_FAIL');
  throw last;
}

export async function searchKakaoWithFallbackQueries({ queries, lat, lng, radius }) {
  const seen = new Set();
  const merged = [];
  let lastError = null;

  for (const query of queries) {
    try {
      const places = await searchKakaoPlaces({ query, lat, lng, radius, size: 12 });
      for (const p of places) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push({ ...p, matchedQuery: query });
      }
      // 충분히 모이면 중단
      if (merged.length >= 10) break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!merged.length && lastError) throw lastError;
  return merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}
