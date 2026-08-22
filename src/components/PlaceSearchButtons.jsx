import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import PlaceFinderSheet from './PlaceFinderSheet';

/**
 * 안주 → 주점 찾기 진입점
 * 단순 지도 오픈이 아니라, 검색 의도 변환 + 위치 + (카카오키 있으면) 목록 시트
 */
export default function PlaceSearchButtons({ snackName, drinkName, snackCategory, compact = false }) {
  const [open, setOpen] = useState(false);
  if (!snackName && !drinkName) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: compact ? '0.55rem' : '0.75rem',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.45rem',
          border: '1px solid rgba(103, 232, 249, 0.4)',
          background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(167,139,250,0.2))',
          color: '#e0f2fe',
          borderRadius: '10px',
          padding: compact ? '0.55rem 0.7rem' : '0.75rem',
          fontWeight: 700,
          fontSize: compact ? '0.8rem' : '0.9rem',
          cursor: 'pointer',
        }}
      >
        <MapPin size={compact ? 14 : 16} />
        이 안주 파는 근처 주점 찾기
      </button>

      <PlaceFinderSheet
        open={open}
        onClose={() => setOpen(false)}
        snackName={snackName}
        drinkName={drinkName}
        snackCategory={snackCategory}
      />
    </>
  );
}
