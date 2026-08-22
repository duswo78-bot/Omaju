import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import alcoholsData from '../data/alcohols.json';

export default function Recipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;
  const alcoholNameById = useMemo(
    () => new Map(alcoholsData.map((a) => [a.id, a.name_ko])),
    []
  );

  if (!recipe) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <button onClick={() => navigate(-1)}>뒤로 가기</button>
      </div>
    );
  }

  const itemRecipe = recipe.recipe || {
    time: '20분',
    difficulty: '초급',
    ingredients: [`${recipe.name_ko} 주재료`, '기본 양념', '약간의 정성'],
    steps: [
      '재료를 알맞은 크기로 손질합니다.',
      '팬이나 냄비에 재료를 넣고 조리합니다.',
      '맛있게 완성된 요리를 그릇에 담아냅니다!',
    ],
  };

  const pairDrinks = (recipe.bestDrinks || [])
    .map((id) => alcoholNameById.get(id) || id)
    .filter(Boolean);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', paddingBottom: '6rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{recipe.name_ko} 레시피</h1>
      </header>

      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
            {recipe.name_ko}
          </h2>
          {recipe.category && (
            <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {recipe.category}
              {recipe.name_en ? ` · ${recipe.name_en}` : ''}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>조리 시간</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{itemRecipe.time}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>난이도</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{itemRecipe.difficulty}</span>
          </div>
        </div>

        {(recipe.tags || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--surface-highlight)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            재료 ({itemRecipe.ingredients.length})
          </h3>
          <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', lineHeight: '1.8', margin: 0, padding: 0 }}>
            {itemRecipe.ingredients.map((ing, idx) => (
              <li key={idx}>{ing}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            조리 순서
          </h3>
          <ol style={{ color: 'var(--text-secondary)', lineHeight: '1.8', margin: 0, paddingLeft: '1.1rem' }}>
            {itemRecipe.steps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '0.65rem' }}>{step}</li>
            ))}
          </ol>
        </div>

        {pairDrinks.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>잘 어울리는 술</h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {pairDrinks.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
