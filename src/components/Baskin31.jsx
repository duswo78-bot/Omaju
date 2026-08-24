import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFail } from '../utils/audio';

function nextCountOptions(current) {
  const left = 31 - current;
  if (left <= 0) return [];
  return [1, 2, 3].filter((n) => n <= left);
}

const DEFAULT_NICKS = ['나', '알콜요정', '술고래', '안주킬러', '인싸', '꽐라', '맥주파괴자', '소주감별사'];

export default function Baskin31() {
  const [mode, setMode] = useState('setup'); // 'setup', 'playing'
  const [playerCount, setPlayerCount] = useState(1);
  const [players, setPlayers] = useState(['나']);
  
  const [count, setCount] = useState(0);
  const [log, setLog] = useState([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [loser, setLoser] = useState(null);
  
  const [shuffledOptions, setShuffledOptions] = useState([]);

  // Setup: update default names when player count changes
  useEffect(() => {
    if (mode === 'setup') {
      const newPlayers = ['나'];
      for (let i = 1; i < playerCount; i++) {
        newPlayers.push(DEFAULT_NICKS[i % DEFAULT_NICKS.length] || `친구${i}`);
      }
      setPlayers(newPlayers);
    }
  }, [playerCount, mode]);

  const isAiMode = playerCount === 1;
  const gamePlayers = isAiMode ? ['나', 'OMAJU AI'] : players;
  const currentTurnPlayer = gamePlayers[turnIndex];
  const isAITurn = isAiMode && turnIndex === 1;

  // Options update and shuffle
  useEffect(() => {
    if (mode === 'playing') {
      const opts = nextCountOptions(count);
      setShuffledOptions([...opts].sort(() => Math.random() - 0.5));
    }
  }, [count, mode]);

  const pushLog = (who, n, next) => {
    setLog((prev) => [`${who}: +${n} → ${next}`, ...prev].slice(0, 6));
  };

  const finishIfNeeded = (next, who) => {
    if (next >= 31) {
      setCount(31);
      setLoser(who);
      playFail();
      return true;
    }
    return false;
  };

  const play = (n, who) => {
    playPop();
    const next = count + n;
    pushLog(who, n, next);
    
    if (finishIfNeeded(next, who)) return;
    
    setCount(next);
    setTurnIndex((turnIndex + 1) % gamePlayers.length);
  };

  // AI Logic
  useEffect(() => {
    if (mode === 'playing' && isAITurn && !loser) {
      const timer = setTimeout(() => {
        const opts = nextCountOptions(count);
        if (!opts.length) return;
        
        let choice = opts[0];
        // AI Strategy: leave multiples of 4 (e.g. 2, 6, 10, 14, 18, 22, 26, 30)
        for (const n of opts) {
          if ((count + n) % 4 === 2) choice = n;
        }
        if (count + choice >= 31) choice = opts[opts.length - 1]; // Forced to lose
        
        play(choice, 'OMAJU AI');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [mode, isAITurn, loser, count]); // Added dependencies

  const startGame = () => {
    playClick();
    setCount(0);
    setLog([]);
    setTurnIndex(0);
    setLoser(null);
    setMode('playing');
  };

  const reset = () => {
    playClick();
    setMode('setup');
  };

  const handleNameChange = (index, val) => {
    const copy = [...players];
    copy[index] = val;
    setPlayers(copy);
  };

  const handlePlayerCount = (change) => {
    playClick();
    const newCount = Math.max(1, Math.min(10, playerCount + change));
    setPlayerCount(newCount);
  };

  // Patterns will be handled by Game.jsx wrapper now

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.35rem', background: 'linear-gradient(135deg, #ec4899, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        배스킨라빈스 31
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        귀엽고 잔혹한 31 게임! 31을 말하면 벌칙 🍻
      </p>

      <AnimatePresence mode="wait">
        {mode === 'setup' ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '360px', padding: '1.5rem' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.5rem' }}>플레이어 수</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <button 
                  onClick={() => handlePlayerCount(-1)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >−</button>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', minWidth: '40px' }}>{playerCount}명</span>
                <button 
                  onClick={() => handlePlayerCount(1)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >+</button>
              </div>
            </div>

            {playerCount === 1 ? (
              <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', color: '#60a5fa', fontWeight: 'bold' }}>
                🤖 OMAJU AI와 1:1 대결!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                {players.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#ec4899', fontSize: '0.8rem', fontWeight: 'bold', width: '20px' }}>{i+1}</span>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                      style={{ flex: 1, padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={startGame}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ec4899, #3b82f6)', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)' }}
            >
              게임 시작
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: loser ? '#ef4444' : '#60a5fa', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '999px', display: 'inline-block' }}>
              {loser ? `🚨 ${loser} 당첨! 🚨` : `👉 ${currentTurnPlayer} 차례`}
            </div>
            
            <div style={{ margin: '1.5rem 0' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>현재 숫자</div>
              <motion.div 
                key={count}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ fontSize: '4rem', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 4px 20px rgba(236, 72, 153, 0.5)' }}
              >
                {count}
              </motion.div>
            </div>

            {/* 숫자 버튼 영역 */}
            {!loser && (
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginTop: '1.5rem', minHeight: '70px', padding: '0.5rem' }}>
                <AnimatePresence>
                  {shuffledOptions.map((n) => (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      whileTap={{ scale: 0.9 }}
                      key={n}
                      disabled={isAITurn}
                      onClick={() => play(n, currentTurnPlayer)}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        fontWeight: 900,
                        fontSize: '1.5rem',
                        cursor: isAITurn ? 'not-allowed' : 'pointer',
                        background: isAITurn ? 'rgba(255,255,255,0.1)' : (n === 1 ? '#ec4899' : n === 2 ? '#a855f7' : '#3b82f6'),
                        color: '#fff',
                        boxShadow: isAITurn ? 'none' : '0 8px 15px rgba(0,0,0,0.3)',
                      }}
                    >
                      +{n}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {loser && (
              <button
                onClick={reset}
                style={{ marginTop: '1.5rem', border: 'none', borderRadius: '999px', padding: '0.8rem 2rem', background: '#fff', color: '#ec4899', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem' }}
              >
                다시 하기
              </button>
            )}

            <div style={{ width: '100%', marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '0.8rem', textAlign: 'left', minHeight: '120px' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>게임 기록</div>
              {log.map((line, idx) => (
                <div key={idx} style={{ color: idx === 0 ? '#fff' : 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.2rem 0', fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                  {line}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
