import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, RefreshCw, ExternalLink } from 'lucide-react';
import { buildVenueSearchIntent } from '../utils/snackToVenueQuery';
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS } from '../data/venueTaxonomy';
import {
  getCurrentPosition,
  getRegionPresets,
  geoFromRegion,
  loadCachedGeo,
  formatDistance,
} from '../services/geoService';
import { hasKakaoKey, searchKakaoWithFallbackQueries } from '../services/kakaoLocal';
import { kakaoMapSearchUrl, naverMapSearchUrl } from '../utils/placeSearch';

export default function PlaceFinderSheet({ open, onClose, snackName, drinkName, snackCategory }) {
  const intent = useMemo(
    () => buildVenueSearchIntent(snackName, drinkName, snackCategory),
    [snackName, drinkName, snackCategory]
  );

  const [geo, setGeo] = useState(() => loadCachedGeo());
  const [radius, setRadius] = useState(DEFAULT_RADIUS_M);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const kakaoReady = hasKakaoKey();
  const regions = getRegionPresets();

  const locate = async () => {
    setLoadingGeo(true);
    setError('');
    try {
      const pos = await getCurrentPosition();
      setGeo(pos);
      setStatus('현재 위치를 가져왔습니다.');
    } catch {
      setError('위치를 가져오지 못했습니다. 아래 상권을 선택해 주세요.');
    } finally {
      setLoadingGeo(false);
    }
  };

  const pickRegion = (regionId) => {
    const next = geoFromRegion(regionId);
    if (next) {
      setGeo(next);
      setError('');
      setStatus(`${next.label} 기준으로 검색합니다.`);
    }
  };

  const runSearch = async () => {
    if (!geo?.lat || !geo?.lng) {
      setError('먼저 현재 위치 또는 상권을 선택하세요.');
      return;
    }
    if (!kakaoReady) {
      setPlaces([]);
      setStatus('카카오 REST 키가 없어 앱 안 목록 대신 지도 검색으로 안내합니다.');
      return;
    }

    setLoadingPlaces(true);
    setError('');
    setStatus(`"${intent.primaryQuery}" 등으로 주변 장소를 분석 중...`);
    try {
      const results = await searchKakaoWithFallbackQueries({
        queries: intent.queries,
        lat: geo.lat,
        lng: geo.lng,
        radius,
      });
      setPlaces(results);
      setStatus(
        results.length
          ? `${geo.label || '선택 위치'} · ${radius / 1000}km 내 ${results.length}곳`
          : '조건에 맞는 곳이 없습니다. 반경을 넓히거나 상권을 바꿔보세요.'
      );
    } catch (e) {
      setPlaces([]);
      setError(e.code === 'NO_KAKAO_KEY'
        ? '카카오 API 키가 필요합니다.'
        : '장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoadingPlaces(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!geo) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !geo) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, geo?.lat, geo?.lng, radius, intent.primaryQuery]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '88dvh',
            overflow: 'auto',
            background: 'rgba(10, 14, 28, 0.97)',
            borderRadius: '20px 20px 0 0',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '1rem 1rem 1.4rem',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>근처 가게 찾기</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', marginTop: 2 }}>
                {snackName}{drinkName ? ` · ${drinkName}` : ''}
              </div>
            </div>
            <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '0.85rem 1rem', marginBottom: '0.85rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#c4b5fd', fontWeight: 700, marginBottom: 4 }}>검색 의도</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{intent.venueType}</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 1.45 }}>{intent.reason}</div>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {intent.queries.slice(0, 4).map((q) => (
                <span key={q} style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>
                  {q}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={locate}
              disabled={loadingGeo}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                border: 'none',
                borderRadius: 12,
                padding: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'linear-gradient(135deg,#22d3ee,#818cf8)',
                color: '#0f172a',
              }}
            >
              <Navigation size={16} />
              {loadingGeo ? '위치 확인 중...' : '현재 위치'}
            </button>
            <button
              type="button"
              onClick={runSearch}
              disabled={loadingPlaces || !geo}
              style={{
                width: 48,
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="다시 검색"
            >
              <RefreshCw size={16} className={loadingPlaces ? 'spin' : undefined} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickRegion(r.id)}
                style={{
                  flexShrink: 0,
                  border: geo?.regionId === r.id ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.12)',
                  background: geo?.regionId === r.id ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {r.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRadius(r.id)}
                style={{
                  flex: 1,
                  border: radius === r.id ? '1px solid #67e8f9' : '1px solid rgba(255,255,255,0.12)',
                  background: radius === r.id ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '0.45rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {(status || error) && (
            <div style={{ fontSize: '0.82rem', color: error ? '#fda4af' : 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
              {error || status}
              {geo && !error && (
                <span style={{ marginLeft: 6 }}>
                  <MapPin size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {geo.label}
                </span>
              )}
            </div>
          )}

          {!kakaoReady && (
            <div className="glass-panel" style={{ padding: '0.9rem', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>목록 검색을 쓰려면 카카오 JS 키 필요</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45, marginBottom: 10 }}>
                `.env`에 `VITE_KAKAO_JS_KEY`를 넣고(도메인 등록 후) 다시 빌드하면, 변환된 검색어로 주변 주점 목록이 앱 안에 표시됩니다.
                지금은 변환된 키워드로 지도를 엽니다.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={naverMapSearchUrl(intent.primaryQuery)}
                  target="_blank"
                  rel="noreferrer"
                  style={linkBtnStyle('#03c75a')}
                >
                  네이버로 "{intent.primaryQuery}"
                </a>
                <a
                  href={kakaoMapSearchUrl(intent.primaryQuery)}
                  target="_blank"
                  rel="noreferrer"
                  style={linkBtnStyle('#fee500', '#111')}
                >
                  카카오로 검색
                </a>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingPlaces && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.65)' }}>검색 중...</div>
            )}
            {!loadingPlaces && places.map((p) => (
              <a
                key={p.id}
                href={p.url || kakaoMapSearchUrl(p.name)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: '#fff',
                  borderRadius: 14,
                  padding: '0.9rem 1rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: '0.98rem' }}>{p.name}</strong>
                  <span style={{ color: '#67e8f9', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formatDistance(p.distance)}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                  {p.category?.split('>').slice(-2).join(' · ')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>
                  {p.address}
                </div>
                {p.matchedQuery && (
                  <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginTop: 6 }}>
                    매칭 키워드: {p.matchedQuery}
                  </div>
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: '0.75rem', color: '#86efac' }}>
                  상세/길찾기 <ExternalLink size={12} />
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function linkBtnStyle(bg, color = '#fff') {
  return {
    flex: 1,
    textAlign: 'center',
    textDecoration: 'none',
    background: bg,
    color,
    borderRadius: 10,
    padding: '0.65rem 0.5rem',
    fontWeight: 700,
    fontSize: '0.78rem',
  };
}
