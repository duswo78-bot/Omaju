import React, { useMemo, useState } from 'react';
import gamesData from '../data/games.json';

export default function GameRules() {
  const games = useMemo(
    () => [...gamesData].sort((a, b) => (b.funLevel || 0) - (a.funLevel || 0)),
    []
  );
  const [openId, setOpenId] = useState(games[0]?.id || null);
  const open = games.find((g) => g.id === openId) || games[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '1rem', maxWidth: '520px' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.35rem', textAlign: 'center' }}>
        술게임 규칙 카드
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        AI 추천에도 쓰이는 {games.length}개 게임 규칙집
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {games.map((game) => {
          const active = open?.id === game.id;
          return (
            <button
              key={game.id}
              onClick={() => setOpenId(game.id)}
              className="glass-panel"
              style={{
                textAlign: 'left',
                padding: '1rem 1.1rem',
                border: active ? '1px solid rgba(168,85,247,0.55)' : '1px solid transparent',
                background: active ? 'rgba(168,85,247,0.15)' : undefined,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '1.05rem' }}>{game.name}</strong>
                <span style={{ fontSize: '0.75rem', color: '#f9a8d4' }}>
                  {game.minPeople}~{game.maxPeople}인 · 난이도 {game.difficulty}/5
                </span>
              </div>
              {active && (
                <>
                  <p style={{ margin: '0.65rem 0 0.5rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontSize: '0.92rem' }}>
                    {game.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {(game.tags || []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
