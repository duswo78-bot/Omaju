import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, Heart } from 'lucide-react';
import snacksData from '../data/snacks.json';
import relationsData from '../data/relations.json';
import { resolveAiAlcoholIds, buildPendingContext } from '../data/drinkIdMap';
import { useDrinkContext } from '../context/DrinkContext';
import { weightedSample } from '../workers/utils/random.js';
import PlaceSearchButtons from '../components/PlaceSearchButtons';

function scoreToStars(score) {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

function buildScoredSnacks(uiDrinkId) {
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
    .sort((a, b) => b.matchScore - a.matchScore);
}

/** 상위권 풀에서 가중 샘플링 → 같은 술이어도 매번 목록이 달라짐 */
function getSnackRecommendations(uiDrinkId, limit = 16) {
  const ranked = buildScoredSnacks(uiDrinkId);
  if (!ranked.length) return [];
  const topScore = ranked[0].matchScore;
  const pool = ranked
    .filter((s) => s.matchScore >= Math.max(68, topScore - 18))
    .slice(0, Math.max(limit * 3, 48));
  const sampled = weightedSample(pool, Math.min(limit, pool.length), (s) => s.matchScore);
  // 화면에서는 점수순으로 보이게 재정렬
  return sampled.sort((a, b) => b.matchScore - a.matchScore);
}

export default function Recommendation() {
  const navigate = useNavigate();
  const location = useLocation();
  const drink = location.state?.selectedDrink;
  const { toggleFavoriteSnack, isFavoriteSnack } = useDrinkContext();

  const [showAll, setShowAll] = useState(false);
  const [shuffleToken, setShuffleToken] = useState(0);
  const recommendations = useMemo(
    () => (drink ? getSnackRecommendations(drink.id, showAll ? 40 : 16) : []),
    [drink, showAll, shuffleToken]
  );
  const reshuffle = useCallback(() => setShuffleToken((n) => n + 1), []);

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

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <button
          onClick={askAi}
          style={{
            flex: 1,
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.45)',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.2))',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          OMAJU AI에게 물어보기
        </button>
        <button
          onClick={reshuffle}
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          다른 안주
        </button>
      </div>

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
            <div key={item.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
              <button
                onClick={() => toggleFavoriteSnack(item.id)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label="안주 찜하기"
              >
                <Heart 
                  size={22} 
                  color={isFavoriteSnack(item.id) ? '#f43f5e' : 'rgba(255,255,255,0.4)'}
                  fill={isFavoriteSnack(item.id) ? '#f43f5e' : 'none'}
                />
              </button>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '0.75rem', paddingRight: '2rem' }}>
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
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'stretch' }}>
                <button
                  onClick={() => navigate('/recipe', { state: { recipe: item } })}
                  style={{ flex: 1, padding: '0.75rem 0.5rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  레시피
                </button>
                <PlaceSearchButtons
                  inline
                  label="근처 가게 찾기"
                  snackName={item.name_ko}
                  drinkName={drink.name}
                  snackCategory={item.category}
                />
              </div>
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
