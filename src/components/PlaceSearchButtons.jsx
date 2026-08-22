import React from 'react';
import { MapPin } from 'lucide-react';
import { openPlaceSearch, buildPlaceQuery } from '../utils/placeSearch';

export default function PlaceSearchButtons({ snackName, drinkName, compact = false }) {
  if (!snackName && !drinkName) return null;
  const query = buildPlaceQuery(snackName, drinkName);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        gap: compact ? '0.45rem' : '0.5rem',
        marginTop: compact ? '0.55rem' : '0.75rem',
      }}
    >
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginRight: '0.15rem' }}>
          <MapPin size={14} />
          근처 주점
        </div>
      )}
      <button
        type="button"
        onClick={() => openPlaceSearch('naver', snackName, drinkName)}
        title={`네이버 지도: ${query}`}
        style={{
          flex: 1,
          border: '1px solid rgba(3, 199, 90, 0.45)',
          background: 'rgba(3, 199, 90, 0.16)',
          color: '#bbf7d0',
          borderRadius: '10px',
          padding: compact ? '0.45rem 0.6rem' : '0.65rem 0.75rem',
          fontWeight: 700,
          fontSize: compact ? '0.75rem' : '0.85rem',
          cursor: 'pointer',
        }}
      >
        네이버 지도
      </button>
      <button
        type="button"
        onClick={() => openPlaceSearch('kakao', snackName, drinkName)}
        title={`카카오맵: ${query}`}
        style={{
          flex: 1,
          border: '1px solid rgba(254, 229, 0, 0.45)',
          background: 'rgba(254, 229, 0, 0.12)',
          color: '#fef08a',
          borderRadius: '10px',
          padding: compact ? '0.45rem 0.6rem' : '0.65rem 0.75rem',
          fontWeight: 700,
          fontSize: compact ? '0.75rem' : '0.85rem',
          cursor: 'pointer',
        }}
      >
        카카오맵
      </button>
    </div>
  );
}
