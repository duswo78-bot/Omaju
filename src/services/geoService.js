import { Geolocation } from '@capacitor/geolocation';
import { REGION_PRESETS } from '../data/venueTaxonomy';

const GEO_CACHE_KEY = 'omaju_last_geo';

export function getRegionPresets() {
  return REGION_PRESETS;
}

export function loadCachedGeo() {
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveCachedGeo(geo) {
  localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
}

/**
 * @returns {Promise<{ lat: number, lng: number, label: string, source: 'gps'|'region'|'cache' }>}
 */
export async function getCurrentPosition(options = {}) {
  const { enableHighAccuracy = false } = options;
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy });
    const geo = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      label: '현재 위치',
      source: 'gps',
    };
    saveCachedGeo(geo);
    return geo;
  } catch (err) {
    throw new Error('위치 권한이 없거나 위치를 가져올 수 없습니다.');
  }
}

export function geoFromRegion(regionId) {
  const region = REGION_PRESETS.find((r) => r.id === regionId);
  if (!region) return null;
  const geo = {
    lat: region.lat,
    lng: region.lng,
    label: region.name,
    source: 'region',
    regionId: region.id,
  };
  saveCachedGeo(geo);
  return geo;
}

export function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
