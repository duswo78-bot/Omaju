import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import snacksData from '../data/snacks.json';
import relationsData from '../data/relations.json';
import { resolveAiAlcoholIds, buildPendingContext } from '../data/drinkIdMap';

function scoreToStars(score) {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

function getSnackRecommendations(uiDrinkId, limit = 16) {
  const aiIds = new Set(resolveAiAlcoholIds(uiDrinkId));
  const snackById = new Map(snacksData.map((s) => [s.id, s]));
  const scores = new Map();

  for (const rel of relationsData) {
    if (!aiIds.has(rel.source)) continue;
    const prev = scores.get(rel.target) || 0;
    if (rel.score > prev) scores.set(rel.target, rel.score);
  }

  for (const snack of snacksData) {
    if (!snack.bestDrinks?.some((id) => aiIds.has(id))) continue;
    const prev = scores.get(snack.id) || 0;
    if (prev < 72) scores.set(snack.id, Math.max(prev, 72));
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => {
      const snack = snackById.get(id);
      if (!snack) return null;
      return {
        ...snack,
        matchScore: score,
        stars: scoreToStars(score),
        tags: (snack.tags || []).slice(0, 3).map((t) => (t.startsWith('#') ? t : `#${t}`)),
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

export default function Recommendation() {
  const location = useLocation();
  const navigate = useNavigate();
  const drink = location.state?.selectedDrink;

  const [showAll, setShowAll] = useState(false);
  const recommendations = useMemo(
    () => (drink ? getSnackRecommendations(drink.id, showAll ? 40 : 16) : []),
    [drink, showAll]
  );

  if (!drink) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>선택된 주종이 없습니다.</p>
        <button onClick={() => navigate('/home')}>홈으로 돌아가기</button>
      </div>
    );
  }

  const askAi = () => {
    localStorage.setItem('omaju_pending_context', buildPendingContext(drink));
    window.dispatchEvent(new CustomEvent('omaju:open-ai-chat'));
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', paddingBottom: '6rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
          <span style={{ color: drink.color }}>{drink.name}</span>엔 이 안주!
        </h1>
      </header>

      <button
        onClick={askAi}
        style={{
          marginBottom: '1.25rem',
          padding: '0.85rem 1rem',
          borderRadius: '12px',
          border: '1px solid rgba(168, 85, 247, 0.45)',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.2))',
          color: '#fff',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        OMAJU AI에게 {drink.name} 페어링 물어보기
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
          추천 안주 {recommendations.length}개 · 전체 안주 DB {snacksData.length}개
        </div>
        {recommendations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>
            아직 매칭된 안주 데이터가 없습니다. AI에게 직접 물어보세요.
          </div>
        ) : (
          recommendations.map((item) => (
            <div key={item.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>{item.name_ko}</h2>
                <span style={{ color: '#facc15', whiteSpace: 'nowrap' }}>
                  {'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}
                </span>
              </div>
              {item.category && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {item.category}
                  {item.recipe?.time ? ` · ${item.recipe.time}` : ''}
                  {item.recipe?.difficulty ? ` · ${item.recipe.difficulty}` : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--surface-highlight)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {item.recipe?.ingredients?.length > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
                  재료 미리보기: {item.recipe.ingredients.slice(0, 3).join(', ')}
                  {item.recipe.ingredients.length > 3 ? '…' : ''}
                </div>
              )}
              <button
                onClick={() => navigate('/recipe', { state: { recipe: item } })}
                style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                레시피 보기
              </button>
            </div>
          ))
        )}
        {!showAll && recommendations.length >= 16 && (
          <button
            onClick={() => setShowAll(true)}
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            안주 더 보기
          </button>
        )}
      </div>
    </div>
  );
}
