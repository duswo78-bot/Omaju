import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { assetUrl } from '../utils/assets';

const funnyNicknames = [
  '부장님', '막내', '술부심', '안주킬러', '계산할사람',
  '내일반차', '토사물', '알쓰', '소주요정', '맥주하마',
  '물충', '집보내줘', '눈치게임패자', '흑기사', '만취러',
  '주사왕', '회식파괴자', '귀가요정', '술고래', '알콜쓰레기',
  '지갑전사', '술자리인싸', '대리기사', '막차요정', '화장실귀신'
];

export default function SpinBottle() {
  const [rotation, setRotation] = useState(0);
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [spinTransition, setSpinTransition] = useState({ type: 'spring', stiffness: 30, damping: 18 });

  useEffect(() => {
    const shuffled = [...funnyNicknames].sort(() => Math.random() - 0.5);
    setPlayers(shuffled.slice(0, playerCount));
    setWinner(null);
  }, [playerCount]);

  const spinBottle = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    const extraRotation = Math.floor(Math.random() * 360);
    const totalRotation = rotation + 2160 + extraRotation; 
    setRotation(totalRotation);

    const randomStyle = Math.random();
    let animDuration = 4000;
    
    if (randomStyle < 0.3) {
      setSpinTransition({ type: 'tween', ease: [0.15, 1.15, 0.8, 1], duration: 7 });
      animDuration = 7000;
    } else if (randomStyle < 0.6) {
      setSpinTransition({ type: 'tween', ease: [0.05, 0.85, 0.1, 1], duration: 7.5 });
      animDuration = 7500;
    } else if (randomStyle < 0.8) {
      setSpinTransition({ type: 'tween', ease: [0.1, 0.9, 0.2, 1], duration: 6 });
      animDuration = 6000;
    } else {
      setSpinTransition({ type: 'tween', ease: [0.2, 1, 0.4, 1], duration: 5.5 });
      animDuration = 5500;
    }

    setTimeout(() => {
      const finalAngle = totalRotation % 360;
      // 병 이미지가 기본적으로 왼쪽(-90도)을 향하고 있으므로, 
      // 시각적인 방향과 수학적 각도를 맞추기 위해 270도를 더해줌 (또는 90도를 뺌)
      const effectiveAngle = (finalAngle + 270) % 360;
      const sliceAngle = 360 / playerCount;
      const winnerIndex = Math.floor(((effectiveAngle + sliceAngle / 2) % 360) / sliceAngle) % playerCount;
      setWinner(players[winnerIndex]);
      setIsSpinning(false);

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4ade80', '#facc15', '#fbbf24', '#f43f5e', '#60a5fa']
      });
    }, animDuration);
  };

  const reshuffleNames = () => {
    const shuffled = [...funnyNicknames].sort(() => Math.random() - 0.5);
    setPlayers(shuffled.slice(0, playerCount));
    setWinner(null);
  };

  const radius = 160;
  const playerPositions = players.map((name, i) => {
    const angle = (i * (360 / playerCount)) - 90;
    const rad = (angle * Math.PI) / 180;
    return { name, x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  });

  const playerColors = ['#fbbf24', '#60a5fa', '#f43f5e', '#4ade80', '#a78bfa', '#fb923c', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        🍾 병 돌리기
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        걸리면 벌칙! 병을 터치해서 돌려보세요
      </p>

      {/* 인원 설정 */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>인원수</span>
        <button 
          onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
          disabled={isSpinning}
          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #555', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: isSpinning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSpinning ? 0.5 : 1 }}
        >−</button>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#facc15', minWidth: '30px', textAlign: 'center' }}>{playerCount}</span>
        <button 
          onClick={() => setPlayerCount(Math.min(10, playerCount + 1))}
          disabled={isSpinning}
          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #555', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.2rem', cursor: isSpinning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSpinning ? 0.5 : 1 }}
        >+</button>
        <button 
          onClick={reshuffleNames}
          disabled={isSpinning}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #a78bfa50', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', fontSize: '0.8rem', cursor: isSpinning ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isSpinning ? 0.5 : 1 }}
        >🎲 셔플</button>
      </div>

      {/* 병 돌리기 영역 */}
      <div style={{ 
        position: 'relative', 
        width: '380px', 
        height: '380px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: '2rem',
        backgroundImage: `url(${assetUrl('assets/drinks/3d_roulette.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '50%',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.8)',
        border: '2px solid rgba(255,255,255,0.1)',
        transform: 'scale(0.85)', // 모바일 화면에 맞게 약간 축소
        transformOrigin: 'center top'
      }}>
        
        {playerPositions.map((pos, i) => (
          <motion.div 
            key={`${players[i]}-${i}`}
            initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
            animate={{ 
              opacity: 1, 
              scale: winner === players[i] ? 1.3 : 1,
              x: "-50%",
              y: "-50%",
              textShadow: winner === players[i] ? `0 0 20px ${playerColors[i % playerColors.length]}` : 'none'
            }}
            transition={{ delay: i * 0.05, type: 'spring' }}
            style={{ 
              position: 'absolute', 
              left: `calc(50% + ${pos.x * 0.85}px)`, 
              top: `calc(50% + ${pos.y * 0.85}px)`, 
              fontWeight: 'bold', 
              fontSize: winner === players[i] ? '0.9rem' : '0.75rem',
              color: winner === players[i] ? '#fff' : playerColors[i % playerColors.length],
              background: winner === players[i] ? `${playerColors[i % playerColors.length]}30` : 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(6px)',
              padding: '0.4rem 0.7rem',
              borderRadius: '20px',
              border: winner === players[i] ? `2px solid ${playerColors[i % playerColors.length]}` : '1px solid rgba(255,255,255,0.1)',
              whiteSpace: 'nowrap',
              zIndex: winner === players[i] ? 20 : 5,
              boxShadow: winner === players[i] ? `0 0 20px ${playerColors[i % playerColors.length]}50` : 'none'
            }}
          >
            {players[i]}
          </motion.div>
        ))}

        <motion.div
          animate={{ rotate: rotation }}
          transition={spinTransition}
          onClick={spinBottle}
          style={{ 
            cursor: isSpinning ? 'wait' : 'pointer', 
            zIndex: 10, 
            touchAction: 'none', 
            width: '180px', 
            height: '420px', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.7))',
            WebkitTapHighlightColor: 'transparent'
          }}
          whileHover={!isSpinning ? { scale: 1.1 } : {}}
          whileTap={!isSpinning ? { scale: 0.9 } : {}}
        >
          <img src={assetUrl('assets/drinks/3d_bottle.png')} alt="Bottle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </motion.div>
      </div>
      
      <AnimatePresence>
        {winner && (
          <motion.div
            key="winner"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="glass-panel"
            style={{
              padding: '1.2rem 2rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.3rem', letterSpacing: '2px' }}>🚨 벌칙 당첨 🚨</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
              "{winner}"
            </div>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem' }}>원샷 가즈아~ 🍻</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        onClick={spinBottle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="glass-panel"
        style={{ 
          padding: '1rem 3rem', 
          fontSize: '1.2rem', 
          fontWeight: 'bold', 
          background: isSpinning 
            ? 'rgba(100,100,100,0.2)' 
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(250, 204, 21, 0.2))', 
          border: '1px solid #facc1550', 
          color: isSpinning ? '#666' : '#facc15', 
          cursor: isSpinning ? 'wait' : 'pointer',
          marginTop: winner ? '0' : '-10px'
        }}
        disabled={isSpinning}
      >
        {isSpinning ? '돌아가는 중...' : '🍾 돌리기!'}
      </motion.button>
    </div>
  );
}
