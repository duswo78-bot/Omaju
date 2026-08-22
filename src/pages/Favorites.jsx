import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useDrinkContext } from '../context/DrinkContext';
import { buildPendingContext } from '../data/drinkIdMap';

export default function Favorites() {
  const navigate = useNavigate();
  const { getFavoriteDrinks, toggleFavorite, isFavorite } = useDrinkContext();
  const favoriteDrinks = getFavoriteDrinks();

  const openDrink = (drink) => {
    localStorage.setItem('omaju_pending_context', buildPendingContext(drink));
    navigate('/recommendation', { state: { selectedDrink: drink } });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', paddingBottom: '6rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>즐겨찾기</h1>
      </header>

      {favoriteDrinks.length === 0 ? (
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
      )}
    </div>
  );
}
