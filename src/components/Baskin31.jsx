import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

function nextCountOptions(current) {
  const left = 31 - current;
  if (left <= 0) return [];
  return [1, 2, 3].filter((n) => n <= left);
}

export default function Baskin31() {
  const [count, setCount] = useState(0);
  const [log, setLog] = useState([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [loser, setLoser] = useState(null);

  const options = useMemo(() => nextCountOptions(count), [count]);

  const pushLog = (who, n, next) => {
    setLog((prev) => [`${who}: +${n} → ${next}`, ...prev].slice(0, 8));
  };

  const finishIfNeeded = (next, who) => {
    if (next >= 31) {
      setCount(31);
      setLoser(who === '나' ? '나' : 'AI');
      setPlayerTurn(false);
      return true;
    }
    return false;
  };

  const aiMove = (from) => {
    const opts = nextCountOptions(from);
    if (!opts.length) return;
    // Prefer leaving multiples of 4 when possible
    let choice = opts[0];
    for (const n of opts) {
      if ((from + n) % 4 === 3) choice = n;
    }
    if (from + choice >= 31) choice = opts[opts.length - 1];
    const next = from + choice;
    pushLog('AI', choice, next);
    if (!finishIfNeeded(next, 'AI')) {
      setCount(next);
      setPlayerTurn(true);
    } else {
      setCount(31);
    }
  };

  const play = (n) => {
    if (!playerTurn || loser || !options.includes(n)) return;
    const next = count + n;
    pushLog('나', n, next);
    if (finishIfNeeded(next, '나')) {
      setCount(31);
      return;
    }
    setCount(next);
    setPlayerTurn(false);
    setTimeout(() => aiMove(next), 450);
  };

  const reset = () => {
    setCount(0);
    setLog([]);
    setPlayerTurn(true);
    setLoser(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>
        베스킨라빈스 31
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        1~3개씩 숫자를 말하세요. 31을 말하는 사람이 원샷!
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>현재 숫자</div>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#c4b5fd', lineHeight: 1 }}>{count}</div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: loser ? '#fb7185' : '#86efac' }}>
          {loser ? `${loser === '나' ? '내가' : 'AI가'} 31! 벌칙 🍺` : playerTurn ? '내 차례' : 'AI 생각 중...'}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          {options.map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.94 }}
              disabled={!playerTurn || Boolean(loser)}
              onClick={() => play(n)}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                border: 'none',
                fontWeight: 800,
                fontSize: '1.25rem',
                cursor: !playerTurn || loser ? 'not-allowed' : 'pointer',
                background: !playerTurn || loser ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#fff',
              }}
            >
              +{n}
            </motion.button>
          ))}
        </div>

        <button
          onClick={reset}
          style={{
            marginTop: '1rem',
            border: 'none',
            borderRadius: '999px',
            padding: '0.55rem 1rem',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          다시 하기
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', marginTop: '1rem' }}>
        {log.map((line, idx) => (
          <div key={`${line}-${idx}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.25rem 0' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
