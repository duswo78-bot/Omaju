import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { DEFAULT_RADIUS_M, REGION_PRESETS } from '../data/venueTaxonomy';
import { haversineMeters } from './geoService';

/**
 * 카카오 로컬 검색
 * - 개발/프리뷰: Vite 프록시 `/api/kakao` (CORS 회피)
 * - Android: OmajuKakao 네이티브 플러그인 (Authorization 보장) → CapacitorHttp 폴백
 * - 웹 배포: VITE_KAKAO_API_BASE 프록시 권장
 * - JS SDK는 웹 전용 보조 (네이티브 WebView는 도메인 미등록으로 거의 항상 실패)
 *
 * Android에서 CapacitorHttp만 쓰면 Authorization이 빠져 HTTP 401이 나는 경우가 있음.
 * localhost(Vite)는 브라우저 fetch가 헤더를 정상 전달해서 문제 없음.
 */

const OmajuKakao = registerPlugin('OmajuKakao');

function isNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function summarizeBody(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data.slice(0, 220);
  try {
    return JSON.stringify(data).slice(0, 220);
  } catch {
    return String(data).slice(0, 220);
  }
}

function parseJsonBody(data) {
  if (data == null) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      throw Object.assign(new Error('Kakao response JSON parse failed'), {
        code: 'KAKAO_PARSE',
        body: data.slice(0, 220),
      });
    }
  }
  return data;
}

async function nativeKakaoGetViaPlugin(pathOnly, restKey, params) {
  const res = await OmajuKakao.localGet({
    path: pathOnly,
    restKey,
    params: params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : {},
  });
  const status = Number(res?.status ?? 0);
  if (!status || status < 200 || status >= 300) {
    const text = summarizeBody(res?.body || res?.data);
    throw Object.assign(new Error(`Kakao HTTP ${status || 0}: ${text}`), {
      code: 'KAKAO_HTTP',
      status: status || 0,
      body: text,
    });
  }
  if (res?.data && typeof res.data === 'object') return res.data;
  return parseJsonBody(res?.body);
}

async function nativeKakaoGet(url, restKey, params, pathOnly) {
  const errors = [];

  // 0) Android 전용 플러그인 — Authorization을 Java에서 직접 세팅 (401 방지)
  if (Capacitor.getPlatform() === 'android' && pathOnly) {
    try {
      return await nativeKakaoGetViaPlugin(pathOnly, restKey, params);
    } catch (e) {
      // 플러그인 미등록(구 APK)이면 CapacitorHttp로 폴백
      if (e?.code === 'UNIMPLEMENTED' || /not implemented|plugin/i.test(String(e?.message || ''))) {
        console.warn('[kakaoLocal] OmajuKakao plugin missing, fallback CapacitorHttp');
      } else {
        errors.push(e);
        // 401이면 헤더 문제 가능성이 커 CapacitorHttp 재시도는 의미 없음 — 바로 throw
        if (e?.status === 401 || e?.code === 'NO_KAKAO_KEY') throw e;
      }
    }
  }

  // 69e3085에서 동작하던 방식: 쿼리를 URL에 붙이고 CapacitorHttp.get
  // (26d6cc9의 request+params 분리가 기기 401로 회귀한 이력 있음)
  const fullUrl = params
    ? `${url}?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      ).toString()}`
    : url;
  const headers = {
    Authorization: `KakaoAK ${restKey}`,
    Accept: 'application/json',
  };

  try {
    const res = await CapacitorHttp.get({
      url: fullUrl,
      headers,
      connectTimeout: 15000,
      readTimeout: 20000,
    });
    const status = Number(res?.status ?? 0);
    if (status >= 200 && status < 300) {
      return parseJsonBody(res.data);
    }
    const text = summarizeBody(res?.data);
    errors.push(
      Object.assign(new Error(`Kakao HTTP ${status || 0}: ${text}`), {
        code: 'KAKAO_HTTP',
        status: status || 0,
        body: text,
      })
    );
  } catch (e) {
    errors.push(
      Object.assign(new Error(`Kakao native request failed: ${e?.message || e}`), {
        code: 'KAKAO_NATIVE',
        cause: e,
      })
    );
  }

  throw errors[errors.length - 1] || Object.assign(new Error('KAKAO_NATIVE'), { code: 'KAKAO_NATIVE' });
}

async function kakaoGetJson(pathAndQuery, restKey, params) {
  const base = apiBase();
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  // params를 따로 쓸 때는 path에서 쿼리를 빼 둔다
  const pathOnly = path.split('?')[0];
  const url = `${base}${params ? pathOnly : path}`;

  if (isNative()) {
    // 네이티브는 항상 dapi 직접(또는 플러그인). 프록시 base여도 path만 넘김.
    const directUrl = `https://dapi.kakao.com${pathOnly}`;
    return nativeKakaoGet(directUrl, restKey, params, pathOnly);
  }

  const fullUrl = params
    ? `${url}?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      ).toString()}`
    : url;

  const res = await fetch(fullUrl, {
    headers: {
      Authorization: `KakaoAK ${restKey}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Kakao HTTP ${res.status}: ${text}`), {
      code: 'KAKAO_HTTP',
      status: res.status,
    });
  }
  return res.json();
}

const DEFAULT_KAKAO_KEY = '167bb3713d47a624020a8820a96b95b3';

export function getKakaoRestKey() {
  const rawKey = (
    import.meta.env.VITE_KAKAO_REST_KEY ||
    import.meta.env.VITE_KAKAO_JS_KEY ||
    DEFAULT_KAKAO_KEY
  );
  return rawKey.replace(/[^a-fA-F0-9]/g, '');
}

export function setCustomKakaoRestKey(key) {
  // Removed to enforce default key
}

export function getKakaoJsKey() {
  const rawKey = import.meta.env.VITE_KAKAO_JS_KEY || DEFAULT_KAKAO_KEY;
  return rawKey.replace(/[^a-fA-F0-9]/g, '');
}

export function hasKakaoKey() {
  return Boolean(getKakaoRestKey() || getKakaoJsKey());
}

function apiBase() {
  if (import.meta.env.VITE_KAKAO_API_BASE) return import.meta.env.VITE_KAKAO_API_BASE.replace(/\/$/, '');
  if (isNative()) return 'https://dapi.kakao.com';
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
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(Object.assign(new Error('NO_DOM'), { code: 'NO_DOM' }));
  }
  // Android/iOS WebView(https://localhost)는 카카오 JS키 도메인 등록이 없어 SDK 로드가 거의 항상 실패한다.
  if (isNative()) {
    return Promise.reject(
      Object.assign(new Error('KAKAO_SDK_SKIPPED_ON_NATIVE'), {
        code: 'KAKAO_SDK_SKIPPED_ON_NATIVE',
      })
    );
  }
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
      try {
        window.kakao.maps.load(() => resolve(window.kakao));
      } catch (e) {
        mapsSdkPromise = null;
        reject(
          Object.assign(new Error(`KAKAO_SDK_INIT_FAIL: ${e?.message || e}`), {
            code: 'KAKAO_SDK_INIT_FAIL',
            cause: e,
          })
        );
      }
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

  const params = {
    query,
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    size: String(size),
    sort: 'distance',
  };

  const data = await kakaoGetJson('/v2/local/search/keyword.json', key, params);
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

  // 1) REST (네이티브는 CapacitorHttp, 웹은 프록시/fetch)
  try {
    return await searchViaRest({ query, lat, lng, radius, size });
  } catch (e) {
    errors.push(e);
    console.warn('[kakaoLocal] REST failed', e?.code || e?.message, e?.status);
  }

  // 2) JS SDK는 웹 전용. 네이티브에서는 도메인 이슈로 KAKAO_SDK_LOAD_FAIL만 남기므로 스킵.
  if (!isNative()) {
    try {
      return await searchViaSdk({ query, lat, lng, radius, size });
    } catch (e) {
      errors.push(e);
      console.warn('[kakaoLocal] SDK failed', e?.code || e?.message);
    }
  }

  // REST 실패가 진짜 원인이므로 마지막(SDK) 대신 첫 에러를 우선 노출
  const primary =
    errors.find((e) => e?.code === 'KAKAO_HTTP' || e?.code === 'KAKAO_NATIVE' || e?.code === 'NO_KAKAO_KEY') ||
    errors[0] ||
    new Error('KAKAO_SEARCH_FAIL');
  throw primary;
}

export async function searchKakaoWithFallbackQueries({ queries, lat, lng, radius }) {
  const seen = new Set();
  const merged = [];
  let lastError = null;
  const list = [...new Set((queries || []).map((q) => String(q || '').trim()).filter(Boolean))];

  if (!list.length) {
    throw Object.assign(new Error('EMPTY_QUERY'), { code: 'EMPTY_QUERY' });
  }
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    throw Object.assign(new Error('INVALID_GEO'), { code: 'INVALID_GEO' });
  }

  for (const query of list) {
    try {
      const places = await searchKakaoPlaces({ query, lat: Number(lat), lng: Number(lng), radius, size: 12 });
      for (const p of places) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push({ ...p, matchedQuery: query });
      }
      // 충분히 모이면 중단
      if (merged.length >= 10) break;
    } catch (e) {
      lastError = e;
      console.warn('[kakaoLocal] query failed', query, e?.code || e?.message);
    }
  }

  if (!merged.length && lastError) throw lastError;
  return merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

export async function searchRegionCoordinates(query, userLat, userLng) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    throw new Error('EMPTY_QUERY');
  }

  // 1) Fast lookup in REGION_PRESETS
  const matchedPreset = REGION_PRESETS.find(
    (p) =>
      trimmed.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(p.id.toLowerCase())
  );

  const key = getKakaoRestKey();
  const errors = [];

  if (key) {
    try {
      const keywordParams = { query: trimmed, size: '1' };
      if (userLat && userLng) {
        keywordParams.y = String(userLat);
        keywordParams.x = String(userLng);
      }
      const keywordData = await kakaoGetJson('/v2/local/search/keyword.json', key, keywordParams);
      if (keywordData.documents?.length > 0) {
        return {
          lat: Number(keywordData.documents[0].y),
          lng: Number(keywordData.documents[0].x),
          label: keywordData.documents[0].place_name || trimmed,
          source: 'custom',
        };
      }

      // Fallback to Address Search if Keyword Search finds nothing
      const addressData = await kakaoGetJson('/v2/local/search/address.json', key, {
        query: trimmed,
        size: '1',
      });
      if (addressData.documents?.length > 0) {
        return {
          lat: Number(addressData.documents[0].y),
          lng: Number(addressData.documents[0].x),
          label: addressData.documents[0].address_name || trimmed,
          source: 'custom',
        };
      }
    } catch (e) {
      errors.push(e);
      console.warn('[kakaoLocal] region REST failed', e?.code || e?.message);
    }
  }

  // 2) Preset fallback when no key or API failed
  if (matchedPreset) {
    return {
      lat: matchedPreset.lat,
      lng: matchedPreset.lng,
      label: matchedPreset.name,
      source: 'preset',
    };
  }

  // 3) JS SDK 보조 — 웹만
  if (!isNative()) {
    try {
      const kakao = await loadKakaoMapsSdk();
      const places = new kakao.maps.services.Places();
      const geocoder = new kakao.maps.services.Geocoder();

      return await new Promise((resolve, reject) => {
        const options = { size: 1 };
        if (userLat && userLng) {
          options.location = new kakao.maps.LatLng(userLat, userLng);
        }
        places.keywordSearch(
          trimmed,
          (data, status) => {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
              resolve({
                lat: Number(data[0].y),
                lng: Number(data[0].x),
                label: trimmed,
                source: 'custom',
              });
            } else {
              geocoder.addressSearch(trimmed, (addrData, addrStatus) => {
                if (addrStatus === kakao.maps.services.Status.OK && addrData.length > 0) {
                  resolve({
                    lat: Number(addrData[0].y),
                    lng: Number(addrData[0].x),
                    label: trimmed,
                    source: 'custom',
                  });
                } else {
                  reject(new Error('REGION_NOT_FOUND'));
                }
              });
            }
          },
          options
        );
      });
    } catch (e) {
      errors.push(e);
    }
  }

  // 4) Last fallback to user coords or primary preset
  if (matchedPreset) {
    return {
      lat: matchedPreset.lat,
      lng: matchedPreset.lng,
      label: matchedPreset.name,
      source: 'preset',
    };
  }
  if (userLat && userLng) {
    return {
      lat: Number(userLat),
      lng: Number(userLng),
      label: trimmed,
      source: 'custom',
    };
  }

  throw (
    errors.find((e) => e?.code === 'KAKAO_HTTP' || e?.code === 'KAKAO_NATIVE') ||
    errors[0] ||
    new Error('REGION_SEARCH_FAIL')
  );
}
