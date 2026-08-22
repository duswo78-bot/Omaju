import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const TARGET_BEATS = 8;

export default function ApartmentGame() {
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [message, setMessage] = useState('시작을 누르고 박자에 맞춰 탭!');
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const lastTapRef = useRef(0);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const stop = (finalMessage, success) => {
    clearInterval(timerRef.current);
    setRunning(false);
    setResult(success ? 'clear' : 'fail');
    setMessage(finalMessage);
  };

  const start = () => {
    clearInterval(timerRef.current);
    setRunning(true);
    setBeat(0);
    setScore(0);
    setResult(null);
    setMessage('박자 타는 중... 아파트!');
    lastTapRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setBeat((prev) => {
        const next = prev + 1;
        if (next > TARGET_BEATS + 2) {
          stop('박자를 놓쳤어요. 원샷!', false);
          return prev;
        }
        return next;
      });
    }, 650);
  };

  const tap = () => {
    if (!running) return;
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;
    const onBeat = delta > 480 && delta < 820;
    if (onBeat) {
      const nextScore = score + 1;
      setScore(nextScore);
      setMessage(`좋아요! ${nextScore}/${TARGET_BEATS}`);
      if (nextScore >= TARGET_BEATS) {
        stop('클리어! 오늘은 살아남았습니다 🎉', true);
      }
    } else {
      stop('박자 아웃! 원샷 🍺', false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>
        아파트 게임
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        박자에 맞춰 탭하세요. {TARGET_BEATS}번 성공하면 생존!
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>비트</div>
        <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#f9a8d4', margin: '0.4rem 0' }}>{beat}</div>
        <div style={{ minHeight: '2.4rem', color: result === 'fail' ? '#fb7185' : result === 'clear' ? '#86efac' : '#fff' }}>
          {message}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={running ? tap : start}
          style={{
            marginTop: '1rem',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            border: 'none',
            fontWeight: 800,
            fontSize: '1.2rem',
            color: '#fff',
            cursor: 'pointer',
            background: running
              ? 'linear-gradient(135deg, #f472b6, #a855f7)'
              : 'linear-gradient(135deg, #22d3ee, #818cf8)',
            boxShadow: '0 10px 30px rgba(168,85,247,0.35)',
          }}
        >
          {running ? '탭!' : '시작'}
        </motion.button>

        <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          성공 {score} / {TARGET_BEATS}
        </div>
      </div>
    </div>
  );
}
