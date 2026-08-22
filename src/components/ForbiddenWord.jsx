import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const WORD_POOL = [
  '술', '맥주', '소주', '안주', '회식', '원샷', '치맥', '소맥', '건배', '알코올',
  '취하다', '안주', '치킨', '삼겹살', '막걸리', '하이볼', '폭탄주', '대리', '해장', '숙취'
];

function pickForbidden(count = 3) {
  const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function ForbiddenWord() {
  const [forbidden, setForbidden] = useState(() => pickForbidden(3));
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [alive, setAlive] = useState(true);
  const [seconds, setSeconds] = useState(45);

  useEffect(() => {
    if (!alive) return undefined;
    if (seconds <= 0) {
      setAlive(false);
      return undefined;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, alive]);

  const hint = useMemo(
    () => '금지어를 말하지 않고 45초 동안 대화하세요. 입력창에 치면 검사합니다.',
    []
  );

  const submit = () => {
    if (!alive || !input.trim()) return;
    const text = input.trim();
    const hit = forbidden.find((w) => text.includes(w));
    setHistory((prev) => [`나: ${text}`, ...prev].slice(0, 6));
    setInput('');
    if (hit) {
      setAlive(false);
      setHistory((prev) => [`💥 금지어 "${hit}" 사용! 원샷`, ...prev].slice(0, 6));
    }
  };

  const reset = () => {
    setForbidden(pickForbidden(3));
    setInput('');
    setHistory([]);
    setAlive(true);
    setSeconds(45);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>
        금지어 게임
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        {hint}
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#fff' }}>
          <strong>남은 시간 {seconds}s</strong>
          <span style={{ color: alive ? '#86efac' : '#fb7185' }}>{alive ? '생존 중' : '탈락'}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
          {forbidden.map((w) => (
            <span
              key={w}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(244,63,94,0.2)',
                border: '1px solid rgba(251,113,133,0.45)',
                color: '#fecdd3',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {w}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={input}
            disabled={!alive}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="금지어 피해 말하기..."
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              padding: '0 0.9rem',
              fontSize: '1rem',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={submit}
            disabled={!alive}
            style={{
              border: 'none',
              borderRadius: '12px',
              padding: '0 1rem',
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              cursor: alive ? 'pointer' : 'not-allowed',
            }}
          >
            말하기
          </motion.button>
        </div>

        <button
          onClick={reset}
          style={{
            marginTop: '0.9rem',
            width: '100%',
            border: 'none',
            borderRadius: '10px',
            padding: '0.65rem',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          새 금지어로 다시
        </button>

        <div style={{ marginTop: '1rem' }}>
          {history.map((line, idx) => (
            <div key={`${line}-${idx}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.2rem 0' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
