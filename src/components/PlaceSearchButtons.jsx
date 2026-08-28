import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import PlaceFinderSheet from './PlaceFinderSheet';

/**
 * 안주 → 주점/가게 찾기 진입점 (venueQuery로 직접 카페/술집 검색도 가능)
 */
export default function PlaceSearchButtons({
  snackName,
  drinkName,
  snackCategory,
  venueQuery,
  compact = false,
  label = '근처 가게 찾기',
  inline = false,
  autoOpen = false,
}) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen, venueQuery, snackName]);

  if (!snackName && !drinkName && !venueQuery) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: inline ? 0 : (compact ? '0.55rem' : '0.75rem'),
          width: inline ? undefined : '100%',
          flex: inline ? 1 : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          border: '1px solid rgba(103, 232, 249, 0.4)',
          background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(167,139,250,0.2))',
          color: '#e0f2fe',
          borderRadius: '8px',
          padding: compact || inline ? '0.75rem 0.5rem' : '0.75rem',
          fontWeight: 700,
          fontSize: compact || inline ? '0.85rem' : '0.9rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <MapPin size={compact || inline ? 14 : 16} />
        {label}
      </button>

      <PlaceFinderSheet
        open={open}
        onClose={() => setOpen(false)}
        snackName={snackName}
        drinkName={drinkName}
        snackCategory={snackCategory}
        venueQuery={venueQuery}
      />
    </>
  );
}
