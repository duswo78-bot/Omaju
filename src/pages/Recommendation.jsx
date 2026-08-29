import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, Heart, Search, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import snacksData from '../data/snacks.json';
import relationsData from '../data/relations.json';
import alcoholsData from '../data/alcohols.json';
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
    if (snack.bestDrinks?.some((id) => aiIds.has(id))) {
      const prev = scores.get(snack.id) || 0;
      if (prev < 80) scores.set(snack.id, Math.max(prev, 80));
    }
  }

  // Also check pairings from alcohols.json
  for (const alc of alcoholsData) {
    if (!aiIds.has(alc.id)) continue;
    for (const snkId of alc.pairings || []) {
      const prev = scores.get(snkId) || 0;
      if (prev < 90) scores.set(snkId, Math.max(prev, 90));
    }
  }

  // Also check category-level matches (e.g. 위스키안주, 와인안주, 맥주안주, 백주안주, 중식안주)
  const matchedAlcs = alcoholsData.filter((a) => aiIds.has(a.id));
  const categoryNames = new Set(matchedAlcs.map((a) => a.category));
  for (const cat of categoryNames) {
    for (const snack of snacksData) {
      if (
        snack.category === `${cat}안주` ||
        snack.tags?.includes(`${cat}안주`) ||
        snack.tags?.includes(cat) ||
        (cat === '백주' && (snack.category === '중식안주' || snack.tags?.includes('중식')))
      ) {
        const prev = scores.get(snack.id) || 0;
        if (prev < 82) scores.set(snack.id, Math.max(prev, 82));
      }
    }
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const recommendations = useMemo(
    () => (drink ? getSnackRecommendations(drink.id, showAll ? 40 : 16) : []),
    [drink, showAll, shuffleToken]
  );
  const reshuffle = useCallback(() => setShuffleToken((n) => n + 1), []);

  // 직접 검색 필터링
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const aiIds = new Set(resolveAiAlcoholIds(drink?.id));

    return snacksData
      .filter((s) => {
        const name = (s.name_ko || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const tags = (s.tags || []).join(' ').toLowerCase();
        const ingredients = (s.recipe?.ingredients || []).join(' ').toLowerCase();
        return name.includes(q) || cat.includes(q) || tags.includes(q) || ingredients.includes(q);
      })
      .map((snack) => {
        let score = 75;
        if (snack.bestDrinks?.some((id) => aiIds.has(id))) score = 90;
        for (const alc of alcoholsData) {
          if (aiIds.has(alc.id) && alc.pairings?.includes(snack.id)) score = 95;
        }
        return {
          ...snack,
          matchScore: score,
          stars: scoreToStars(score),
          tags: (snack.tags || []).slice(0, 3).map((t) => (t.startsWith('#') ? t : `#${t}`)),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [searchQuery, drink]);

  const isSearching = isSearchOpen && searchQuery.trim().length > 0;
  const displayedList = isSearching ? searchResults : recommendations;

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
    <div className="animate-fade-in" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
          <span style={{ color: drink.color }}>{drink.name}</span>엔 이 안주!
        </h1>
      </header>

      {/* ===== 상단 액션 바: AI 물어보기 / 다른 안주 / 돋보기 검색 (or 펼쳐진 검색창) ===== */}
      <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {!isSearchOpen ? (
            <motion.div
              key="button-row"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <button
                onClick={askAi}
                style={{
                  flex: 1,
                  padding: '0.85rem 0.65rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.2))',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                }}
              >
                <Sparkles size={14} color="#c084fc" />
                <span>OMAJU AI에게 물어보기</span>
              </button>
              <button
                onClick={reshuffle}
                style={{
                  padding: '0.85rem 0.85rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                다른 안주
              </button>
              <button
                onClick={() => setIsSearchOpen(true)}
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  aspectRatio: '1 / 1',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0,
                }}
                title="안주 직접 검색"
                aria-label="안주 직접 검색"
              >
                <Search size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="search-bar"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  borderRadius: '12px',
                  padding: '0 0.8rem',
                  height: '44px',
                }}
              >
                <Search size={17} color="#a855f7" style={{ flexShrink: 0, marginRight: '0.5rem' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="안주 이름이나 재료 검색 (예: 감자튀김, 치즈)"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                style={{
                  padding: '0 0.9rem',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
          {isSearching
            ? `검색 결과 ${displayedList.length}개`
            : `추천 안주 ${recommendations.length}개 · 전체 안주 DB ${snacksData.length}개`}
        </div>
        {displayedList.length === 0 ? (
          <div className="glass-panel" style={{ padding: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {isSearching ? `"${searchQuery}"에 대한 안주 검색 결과가 없습니다.` : '아직 매칭된 안주 데이터가 없습니다. AI에게 직접 물어보세요.'}
          </div>
        ) : (
          displayedList.map((item) => (
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
        {!isSearching && !showAll && recommendations.length >= 16 && (
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
