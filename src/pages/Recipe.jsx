import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Recipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;

  if (!recipe) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <button onClick={() => navigate(-1)}>뒤로 가기</button>
      </div>
    );
  }

  // DB에서 가져온 레시피 정보 (없을 경우를 대비한 기본값 설정)
  const itemRecipe = recipe.recipe || {
    time: "20분",
    difficulty: "초급",
    ingredients: [
      `${recipe.name_ko}용 주재료 적당량`,
      "기본 양념",
      "약간의 정성"
    ],
    steps: [
      "재료를 알맞은 크기로 손질합니다.",
      "팬이나 냄비에 재료를 넣고 조리합니다.",
      "맛있게 완성된 요리를 그릇에 담아냅니다!"
    ]
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recipe.name_ko} 레시피</h1>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
          {recipe.name_ko}
        </h2>
        
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

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>재료</h3>
          <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            {itemRecipe.ingredients.map((ing, idx) => (
              <li key={idx}>{ing}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>조리 순서</h3>
          <ol style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '0.5rem' }}>
            {itemRecipe.steps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
