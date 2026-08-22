import { KAKAO_CATEGORY, DEFAULT_RADIUS_M } from '../data/venueTaxonomy';
import { haversineMeters } from './geoService';

const KAKAO_KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

export function getKakaoRestKey() {
  return import.meta.env.VITE_KAKAO_REST_KEY || '';
}

export function getKakaoJsKey() {
  return import.meta.env.VITE_KAKAO_JS_KEY || '';
}

export function hasKakaoKey() {
  return Boolean(getKakaoJsKey() || getKakaoRestKey());
}

let mapsSdkPromise = null;

function loadKakaoMapsSdk() {
  const jsKey = getKakaoJsKey();
  if (!jsKey) return Promise.reject(Object.assign(new Error('NO_KAKAO_JS_KEY'), { code: 'NO_KAKAO_JS_KEY' }));
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
  if (mapsSdkPromise) return mapsSdkPromise;

  mapsSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-omaju-kakao="1"]');
    if (existing) {
      existing.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve(window.kakao));
      });
      return;
    }
    const script = document.createElement('script');
    script.dataset.omajuKakao = '1';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&libraries=services&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(Object.assign(new Error('KAKAO_SDK_LOAD_FAIL'), { code: 'KAKAO_SDK_LOAD_FAIL' }));
    document.head.appendChild(script);
  });
  return mapsSdkPromise;
}

function normalizeSdkPlace(place, origin) {
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

/** 브라우저용: Kakao Maps JS SDK Places (도메인 등록된 JS 키) */
export async function searchKakaoPlacesViaSdk({
  query,
  lat,
  lng,
  radius = DEFAULT_RADIUS_M,
  size = 12,
}) {
  const kakao = await loadKakaoMapsSdk();
  const places = new kakao.maps.services.Places();
  const origin = { lat, lng };

  return new Promise((resolve, reject) => {
    places.keywordSearch(
      query,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve((data || []).slice(0, size).map((p) => normalizeSdkPlace(p, origin)));
          return;
        }
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }
        reject(Object.assign(new Error(`Kakao SDK status: ${status}`), { code: 'KAKAO_SDK' }));
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

/**
 * REST 키워드 검색 — 브라우저 CORS에 막힐 수 있어 SDK 실패 시 보조
 */
export async function searchKakaoPlacesRest({
  query,
  lat,
  lng,
  radius = DEFAULT_RADIUS_M,
  size = 12,
  categoryGroupCode = KAKAO_CATEGORY.FOOD,
}) {
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
  if (categoryGroupCode) params.set('category_group_code', categoryGroupCode);

  const res = await fetch(`${KAKAO_KEYWORD_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${key}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Kakao API ${res.status}: ${text}`), {
      code: 'KAKAO_HTTP',
      status: res.status,
    });
  }

  const data = await res.json();
  const origin = { lat, lng };
  return (data.documents || []).map((doc) => normalizeSdkPlace(doc, origin));
}

export async function searchKakaoPlaces(args) {
  if (getKakaoJsKey()) {
    try {
      return await searchKakaoPlacesViaSdk(args);
    } catch (e) {
      if (getKakaoRestKey()) return searchKakaoPlacesRest(args);
      throw e;
    }
  }
  return searchKakaoPlacesRest(args);
}

/** 여러 검색어를 순차 시도해 결과 병합 */
export async function searchKakaoWithFallbackQueries({ queries, lat, lng, radius }) {
  const seen = new Set();
  const merged = [];
  for (const query of queries) {
    try {
      const places = await searchKakaoPlaces({ query, lat, lng, radius });
      for (const p of places) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push({ ...p, matchedQuery: query });
      }
      if (merged.length >= 8) break;
    } catch (e) {
      if (e.code === 'NO_KAKAO_KEY' || e.code === 'NO_KAKAO_JS_KEY') throw e;
    }
  }
  return merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}
