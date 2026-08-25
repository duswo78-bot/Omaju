import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useDrinkContext } from '../context/DrinkContext';
import { buildPendingContext } from '../data/drinkIdMap';
import snacksData from '../data/snacks.json';

export default function Favorites() {
  const navigate = useNavigate();
  const { 
    getFavoriteDrinks, toggleFavorite, isFavorite,
    getFavoriteSnackIds, toggleFavoriteSnack, isFavoriteSnack 
  } = useDrinkContext();
  
  const favoriteDrinks = getFavoriteDrinks();
  const favoriteSnackIds = getFavoriteSnackIds();
  const favoriteSnacks = snacksData.filter(s => favoriteSnackIds.includes(s.id));

  const [tab, setTab] = useState('drinks'); // 'drinks' or 'snacks'

  const openDrink = (drink) => {
    localStorage.setItem('omaju_pending_context', buildPendingContext(drink));
    navigate('/recommendation', { state: { selectedDrink: drink } });
  };

  const openSnack = (snack) => {
    // You can navigate to recipe page directly
    navigate('/recipe', { state: { selectedSnack: snack } });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>찜 목록</h1>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setTab('drinks')}
          style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: tab === 'drinks' ? '2px solid #ec4899' : '2px solid transparent', color: tab === 'drinks' ? '#ec4899' : 'var(--text-secondary)', fontWeight: tab === 'drinks' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          찜한 술 ({favoriteDrinks.length})
        </button>
        <button
          onClick={() => setTab('snacks')}
          style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: tab === 'snacks' ? '2px solid #ec4899' : '2px solid transparent', color: tab === 'snacks' ? '#ec4899' : 'var(--text-secondary)', fontWeight: tab === 'snacks' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          찜한 안주 ({favoriteSnacks.length})
        </button>
      </div>

      {tab === 'drinks' && (
        favoriteDrinks.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', gap: '0.75rem' }}>
            <Heart size={36} color="var(--text-secondary)" />
            <p style={{ margin: 0 }}>아직 찜한 술이 없습니다.</p>
            <button
              onClick={() => navigate('/home')}
              style={{ marginTop: '0.5rem', padding: '0.7rem 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              홈에서 술 고르기
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            {favoriteDrinks.map((drink) => (
              <div
                key={drink.id}
                className="glass-panel"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', position: 'relative', cursor: 'pointer' }}
                onClick={() => openDrink(drink)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(drink.id);
                  }}
                  style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  aria-label="찜 해제"
                >
                  <Heart size={18} fill={isFavorite(drink.id) ? '#f43f5e' : 'none'} color="#f43f5e" />
                </button>
                <img
                  src={drink.imagePath}
                  alt={drink.name}
                  style={{ width: '72px', height: '72px', objectFit: 'contain' }}
                />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: drink.color || 'var(--text-primary)' }}>{drink.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>안주 추천 보기</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'snacks' && (
        favoriteSnacks.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', gap: '0.75rem' }}>
            <Heart size={36} color="var(--text-secondary)" />
            <p style={{ margin: 0 }}>아직 찜한 안주가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {favoriteSnacks.map((snack) => (
              <div
                key={snack.id}
                className="glass-panel"
                style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', cursor: 'pointer' }}
                onClick={() => openSnack(snack)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteSnack(snack.id);
                  }}
                  style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  aria-label="찜 해제"
                >
                  <Heart size={20} fill={isFavoriteSnack(snack.id) ? '#f43f5e' : 'none'} color="#f43f5e" />
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', paddingRight: '2rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '600', margin: 0, color: '#fff' }}>{snack.name_ko}</h2>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {snack.category}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  {snack.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--surface-highlight)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
