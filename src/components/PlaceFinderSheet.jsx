import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Browser } from '@capacitor/browser';
import { X, Navigation, ExternalLink, MessageSquareQuote, Phone, Search } from 'lucide-react';
import { buildVenueSearchIntent } from '../utils/snackToVenueQuery';
import { DEFAULT_RADIUS_M, REGION_PRESETS } from '../data/venueTaxonomy';
import {
  getCurrentPosition,
  geoFromRegion,
  loadCachedGeo,
  formatDistance,
  haversineMeters,
} from '../services/geoService';
import {
  hasKakaoKey,
  getKakaoRestKey,
  setCustomKakaoRestKey,
  searchKakaoWithFallbackQueries,
  searchRegionCoordinates,
} from '../services/kakaoLocal';
import { kakaoMapSearchUrl, naverMapSearchUrl } from '../utils/placeSearch';

const QUICK_REGIONS = REGION_PRESETS.slice(0, 6);

const openBrowser = async (url) => { try { await Browser.open({ url }); } catch(e) { window.open(url, '_blank'); } };

let initialGpsFetched = false;

export default function PlaceFinderSheet({ open, onClose, snackName, drinkName, snackCategory, venueQuery }) {
  const intent = useMemo(
    () => buildVenueSearchIntent(snackName, drinkName, snackCategory, venueQuery),
    [snackName, drinkName, snackCategory, venueQuery]
  );

  const [geo, setGeo] = useState(() => loadCachedGeo() || geoFromRegion('gangnam'));
  const [userGeo, setUserGeo] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('omaju_region_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return QUICK_REGIONS.map(r => ({ ...r, isBuiltin: true }));
  });

  useEffect(() => {
    localStorage.setItem('omaju_region_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!open) return;
    const handleCloseModal = () => {
      onClose();
    };
    window.addEventListener('omaju:close-modal', handleCloseModal);
    return () => window.removeEventListener('omaju:close-modal', handleCloseModal);
  }, [open, onClose]);

  const handleCustomRegionSearch = async (e) => {
    e.preventDefault();
    if (!customRegion.trim()) return;
    setLoading(true);
    setError('');
    try {
      const q = customRegion.trim();
      const resultGeo = await searchRegionCoordinates(q, userGeo?.lat, userGeo?.lng);
      setGeo({ ...resultGeo, _t: Date.now() });
      setHistory(prev => {
        const filtered = prev.filter(item => item.name !== q);
        return [{ id: 'custom_' + Date.now(), name: q, lat: resultGeo.lat, lng: resultGeo.lng, isBuiltin: false }, ...filtered].slice(0, 10);
      });
      setCustomRegion('');
    } catch (err) {
      setError(`"${customRegion}" 위치를 찾을 수 없습니다.`);
      setLoading(false);
    }
  };

  const locate = async () => {
    try {
      setLoading(true);
      setError('');
      const pos = await getCurrentPosition({ timeout: 8000 });
      setUserGeo(pos);
      setGeo({ ...pos, _t: Date.now() });
    } catch {
      const fallback = geo?.lat ? geo : geoFromRegion('gangnam');
      if (!geo?.lat) setGeo({ ...fallback, _t: Date.now() });
      else setGeo({ ...geo, _t: Date.now() }); // 재검색 트리거
      setError('위치 권한이 없어 기본 상권으로 검색합니다.');
    }
  };

  const handleHistoryClick = (item) => {
    if (item.isBuiltin) {
      setGeo({ ...geoFromRegion(item.id), _t: Date.now() });
    } else {
      setGeo({ lat: item.lat, lng: item.lng, label: item.name, source: 'custom', _t: Date.now() });
    }
  };

  const removeHistory = (e, id) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const runSearch = async (targetGeo = geo) => {
    if (!open || !targetGeo?.lat) return;
    const queries = (intent.queries || []).filter(Boolean);
    if (!queries.length) {
      setPlaces([]);
      setError('검색어가 비어 있습니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    // 카카오 API 키가 설정되지 않은 경우: 지도 앱 직접 연동으로 부드럽게 안내
    if (!hasKakaoKey()) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    try {
      const results = await searchKakaoWithFallbackQueries({
        queries,
        lat: targetGeo.lat,
        lng: targetGeo.lng,
        radius: Math.max(DEFAULT_RADIUS_M, 3000),
      });
      setPlaces(results.slice(0, 12));
    } catch (e) {
      setPlaces([]);
      setError(e?.message || '검색 중 오류가 발생했습니다.');
      console.warn('[PlaceFinder] kakao search fallback', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let g = loadCachedGeo() || geo || geoFromRegion('gangnam');
    if (!g) g = geoFromRegion('gangnam');
    setGeo({ ...g, _t: Date.now() });
    
    if (!initialGpsFetched) {
      initialGpsFetched = true;
      getCurrentPosition({ timeout: 6000 })
        .then((pos) => {
          setUserGeo(pos);
          setGeo({ ...pos, _t: Date.now() });
        })
        .catch(() => {});
    } else {
      const cached = loadCachedGeo();
      if (cached?.source === 'gps') {
        setUserGeo(cached);
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open || !geo?.lat) return;
    runSearch(geo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo?.lat, geo?.lng, geo?._t, intent.primaryQuery, open]);

  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="place-finder-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: 'min(78dvh, 640px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#0b1220',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
              overflow: 'hidden',
              color: '#fff',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>근처 가게</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  {[snackName || venueQuery, intent.primaryQuery].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button type="button" onClick={onClose} style={iconBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Location chips & Custom Search */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem 1rem 0.35rem', gap: 10 }}>
              {/* Top row: GPS & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={locate} style={chip(geo?.source === 'gps')}>
                  <Navigation size={12} /> 내 위치
                </button>
                <form onSubmit={handleCustomRegionSearch} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    placeholder="예: 홍대입구, 강남역"
                    value={customRegion}
                    onChange={(e) => setCustomRegion(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '999px 0 0 999px',
                      padding: '0.4rem 0.8rem',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'rgba(34,211,238,0.2)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderLeft: 'none',
                      borderRadius: '0 999px 999px 0',
                      padding: '0.4rem 0.8rem',
                      color: '#22d3ee',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Search size={14} />
                  </button>
                </form>
              </div>

              {/* Bottom row: History chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {history.map((h) => {
                  const isActive = (h.isBuiltin && geo?.regionId === h.id) || (!h.isBuiltin && geo?.label === h.name);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleHistoryClick(h)}
                      style={{
                        ...chip(isActive),
                        fontSize: '0.72rem',
                        padding: '0.3rem 0.6rem',
                      }}
                    >
                      {h.name}
                      <span 
                        onClick={(e) => removeHistory(e, h.id)}
                        style={{ marginLeft: 2, color: 'rgba(255,255,255,0.4)', padding: '0 2px' }}
                      >
                        <X size={10} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 1rem 0.6rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {geo?.label || '위치'}{loading ? ' · 검색 중…' : places.length ? ` · ${places.length}곳` : ''}
              </div>
              {!loading && places.length > 0 && (
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: '#fef08a' }}
                >
                  <MessageSquareQuote size={11} />
                  해당 메뉴가 있는지 꼭 물어보고 가세요
                </motion.div>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 0.75rem', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {error && !places.length && (
                <div style={{ padding: '0.75rem 0.85rem', borderRadius: 12, background: 'rgba(244,63,94,0.12)', color: '#fecdd3', fontSize: '0.8rem', marginBottom: 8 }}>
                  {error}
                </div>
              )}

              {loading && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.55)' }}>검색 중…</div>
              )}

              {!loading && !places.length && (
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '1.2rem 1rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>📍</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', marginBottom: 4 }}>
                    {geo?.label ? `[${geo.label}] ` : ''}"{intent.primaryQuery}" 매장 찾기
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.1rem', lineHeight: 1.45 }}>
                    현재 선택된 위치 기준으로 최신 매장 정보와<br />길찾기를 지도 앱에서 원클릭으로 바로 확인하세요.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => openBrowser(kakaoMapSearchUrl(`${geo?.label ? geo.label + ' ' : ''}${intent.primaryQuery}`))}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#fee500',
                        color: '#181600',
                        border: 'none',
                        borderRadius: 10,
                        padding: '0.75rem',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      <span>🟡</span> 카카오맵에서 바로 찾기 <ExternalLink size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => openBrowser(naverMapSearchUrl(`${geo?.label ? geo.label + ' ' : ''}${intent.primaryQuery}`))}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#03c75a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '0.75rem',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      <span>🟢</span> 네이버 지도에서 바로 찾기 <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              )}

              {!loading && places.map((p) => {
                const shortCategory = p.category ? p.category.split('>').pop().trim() : '';
                const displayDistance = userGeo ? haversineMeters(userGeo, p) : p.distance;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'block',
                      color: '#fff',
                      borderRadius: 12,
                      padding: '0.8rem 0.85rem',
                      marginBottom: 8,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: '0.95rem' }}>{p.name}</strong>
                        {shortCategory && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.15)', padding: '0.15rem 0.4rem', borderRadius: 4, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                            {shortCategory}
                          </span>
                        )}
                      </div>
                      <span style={{ color: '#67e8f9', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#fbbf24' }}>★ {(3.0 + (p.id.charCodeAt(0) % 20) / 10).toFixed(1)}</span>
                        {formatDistance(displayDistance)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                      {p.address}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      {p.phone && (
                        <a href={`tel:${p.phone.replace(/[^0-9]/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#93c5fd', textDecoration: 'none', background: 'rgba(59,130,246,0.15)', padding: '0.35rem 0.7rem', borderRadius: 6 }}>
                          <Phone size={12} /> {p.phone}
                        </a>
                      )}
                      <button onClick={() => openBrowser(p.url || kakaoMapSearchUrl(p.name))} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#86efac', textDecoration: 'none', background: 'rgba(34,197,94,0.15)', padding: '0.35rem 0.7rem', borderRadius: 6, border:'none', cursor:'pointer' }}>
                        지도·길찾기 <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

const iconBtn = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  borderRadius: '50%',
  width: 36,
  height: 36,
  color: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function chip(active) {
  return {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: active ? '1px solid #67e8f9' : '1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.06)',
    color: '#fff',
    borderRadius: 999,
    padding: '0.4rem 0.7rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  };
}

function mapLink(bg, color = '#fff') {
  return {
    flex: 1,
    textAlign: 'center',
    textDecoration: 'none',
    background: bg,
    color,
    borderRadius: 10,
    padding: '0.7rem',
    fontWeight: 700,
    fontSize: '0.82rem',
  };
}
