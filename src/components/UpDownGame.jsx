import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playUp, playDown, playSuccess, playFail } from '../utils/audio';

const DEFAULT_NICKS = ['나', '알콜요정', '술고래', '안주킬러', '인싸', '꽐라', '맥주파괴자', '소주감별사'];

export default function UpDownGame() {
  const [mode, setMode] = useState('setup'); // setup, playing, end
  const [playerCount, setPlayerCount] = useState(3);
  const [players, setPlayers] = useState(['나', '친구1', '친구2']);
  
  const [targetNumber, setTargetNumber] = useState(0);
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [turnIndex, setTurnIndex] = useState(0);
  
  const [guess, setGuess] = useState('');
  const [log, setLog] = useState([]);
  const [resultMsg, setResultMsg] = useState(null);
  const [penalizedPlayers, setPenalizedPlayers] = useState([]);

  // Setup: update default names when player count changes
  useEffect(() => {
    if (mode === 'setup') {
      const newPlayers = ['나'];
      for (let i = 1; i < Math.max(3, playerCount); i++) {
        newPlayers.push(DEFAULT_NICKS[i % DEFAULT_NICKS.length] || `친구${i}`);
      }
      setPlayers(newPlayers);
    }
  }, [playerCount, mode]);

  const handlePlayerCount = (change) => {
    playClick();
    const newCount = Math.max(3, Math.min(10, playerCount + change));
    setPlayerCount(newCount);
  };

  const handleNameChange = (index, val) => {
    const copy = [...players];
    copy[index] = val;
    setPlayers(copy);
  };

  const startGame = () => {
    playClick();
    if (players.length < 3) {
      alert("양 옆에서 마시려면 최소 3명이 필요합니다!");
      return;
    }
    setTargetNumber(Math.floor(Math.random() * 100) + 1); // 1~100
    setMin(1);
    setMax(100);
    setTurnIndex(0);
    setLog([]);
    setGuess('');
    setResultMsg(null);
    setPenalizedPlayers([]);
    setMode('playing');
  };

  const reset = () => {
    playClick();
    setMode('setup');
  };

  const submitGuess = (e) => {
    e?.preventDefault();
    const num = parseInt(guess, 10);
    if (isNaN(num) || num < min || num > max) {
      alert(`${min}에서 ${max} 사이의 숫자를 입력해주세요!`);
      return;
    }

    const currentPlayer = players[turnIndex];

    if (num === targetNumber) {
      // 정답!
      playSuccess();
      setTimeout(playFail, 600);
      const leftIdx = (turnIndex - 1 + players.length) % players.length;
      const rightIdx = (turnIndex + 1) % players.length;
      const leftPlayer = players[leftIdx];
      const rightPlayer = players[rightIdx];

      setResultMsg(`${currentPlayer} 정답! (숫자: ${targetNumber})`);
      setPenalizedPlayers([leftPlayer, rightPlayer]);
      setMode('end');
    } else {
      // 오답
      if (num < targetNumber) {
        playUp();
        setMin(num + 1);
        setLog(prev => [{ player: currentPlayer, num, result: 'UP 🔺' }, ...prev]);
      } else {
        playDown();
        setMax(num - 1);
        setLog(prev => [{ player: currentPlayer, num, result: 'DOWN 🔻' }, ...prev]);
      }
      setGuess('');
      setTurnIndex((turnIndex + 1) % players.length);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.35rem', background: 'linear-gradient(135deg, #4ade80, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        업앤다운
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.4' }}>
        1~100 사이의 숫자를 맞춰보세요.<br/>맞춘 사람의 <strong>양 옆 사람</strong>이 마십니다! 🍻
      </p>

      <AnimatePresence mode="wait">
        {mode === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '360px', padding: '1.5rem' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.5rem' }}>플레이어 수 (최소 3명)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <button 
                  onClick={() => setPlayerCount(Math.max(3, playerCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >−</button>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', minWidth: '40px' }}>{Math.max(3, playerCount)}명</span>
                <button 
                  onClick={() => setPlayerCount(Math.min(10, playerCount + 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >+</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              {players.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 'bold', width: '20px' }}>{i+1}</span>
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #4ade80, #3b82f6)', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(74, 222, 128, 0.3)' }}
            >
              게임 시작
            </button>
          </motion.div>
        )}

        {mode === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.5rem 1rem', borderRadius: '999px', display: 'inline-block' }}>
              👉 {players[turnIndex]} 차례
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>정답 범위</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>
                <motion.span key={`min-${min}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ color: '#fb7185' }}>{min}</motion.span>
                <span style={{ fontSize: '1.5rem', color: '#6b7280' }}>~</span>
                <motion.span key={`max-${max}`} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ color: '#38bdf8' }}>{max}</motion.span>
              </div>
            </div>

            <form onSubmit={submitGuess} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="number"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="숫자 입력"
                autoFocus
                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}
              />
              <button 
                type="submit"
                style={{ padding: '0 1.5rem', borderRadius: '12px', border: 'none', background: '#4ade80', color: '#000', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
              >
                확인
              </button>
            </form>

            <div style={{ width: '100%', marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '0.8rem', textAlign: 'left', minHeight: '120px', maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>히스토리</div>
              <AnimatePresence>
                {log.map((entry, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={`${entry.num}-${idx}`} 
                    style={{ color: idx === 0 ? '#fff' : 'var(--text-secondary)', fontSize: '0.9rem', padding: '0.3rem 0', fontWeight: idx === 0 ? 'bold' : 'normal', display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>{entry.player}: {entry.num}</span>
                    <span style={{ color: entry.result.includes('UP') ? '#fb7185' : '#38bdf8' }}>{entry.result}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {mode === 'end' && (
          <motion.div
            key="end"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '360px', padding: '2rem 1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)' }}
          >
            <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>{resultMsg}</div>
            
            <div style={{ margin: '2rem 0' }}>
              <div style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem', letterSpacing: '1px' }}>🚨 벌칙 당첨자 🚨</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                {penalizedPlayers.map(p => (
                  <div key={p} style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', background: 'rgba(239, 68, 68, 0.5)', padding: '0.5rem 2rem', borderRadius: '999px' }}>
                    "{p}"
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '1rem' }}>정답자 양 옆사람 원샷! 🍻</div>
            </div>

            <button
              onClick={reset}
              style={{ width: '100%', marginTop: '1rem', border: 'none', borderRadius: '999px', padding: '1rem', background: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem' }}
            >
              다시 하기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
