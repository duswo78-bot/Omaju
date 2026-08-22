import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SobrietyTest() {
  const [position, setPosition] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState(null); // { score, message, color }
  const requestRef = useRef();
  const direction = useRef(1);
  // 왕복 속도를 조금 빠르게 설정 (프레임당 2.5% 이동)
  const speed = useRef(2.5);

  const animate = () => {
    setPosition(prev => {
      let next = prev + direction.current * speed.current;
      if (next >= 100) { 
        next = 100; 
        direction.current = -1; 
      }
      if (next <= 0) { 
        next = 0; 
        direction.current = 1; 
      }
      return next;
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);

  const startGame = () => {
    setResult(null);
    setPosition(50);
    // 무작위 방향과 속도 변동성 추가
    direction.current = Math.random() > 0.5 ? 1 : -1;
    speed.current = 2.5 + Math.random() * 1.5; // 2.5 ~ 4.0
    setIsPlaying(true);
  };

  const stopGame = () => {
    if (!isPlaying) return;
    setIsPlaying(false);
    cancelAnimationFrame(requestRef.current);

    // 판정 로직: 50(정중앙)에서 얼마나 떨어져 있는가?
    const distance = Math.abs(50 - position);
    
    if (distance <= 3) {
      setResult({ score: 'PERFECT', message: '당신은 완벽하게 멀쩡합니다! 🎯', color: '#4ade80' });
    } else if (distance <= 12) {
      setResult({ score: 'GOOD', message: '오~ 아직 안 취하셨네요! 👍', color: '#60a5fa' });
    } else if (distance <= 25) {
      setResult({ score: 'WARNING', message: '살짝 알딸딸하신데요? 🥴', color: '#fbbf24' });
    } else {
      setResult({ score: 'DRUNK', message: '만취 상태! 당장 귀가하세요! 🚨', color: '#ef4444' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        🥴 취기 테스트
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        좌우로 빠르게 움직이는 바늘을<br/>정확히 <strong>초록색 정중앙</strong>에서 멈추세요!
      </p>

      {/* 3D 튜브/게이지 영역 */}
      <div style={{ 
        position: 'relative', 
        width: '320px', 
        height: '48px',
        background: 'linear-gradient(90deg, #ef4444 0%, #fbbf24 30%, #4ade80 45%, #22c55e 50%, #4ade80 55%, #fbbf24 70%, #ef4444 100%)',
        borderRadius: '24px',
        // 안쪽 그림자(입체감) 및 유리 광택 효과
        boxShadow: 'inset 0 10px 15px rgba(255,255,255,0.3), inset 0 -10px 15px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.5)',
        marginBottom: '3.5rem',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'visible'
      }}>
        {/* 유리관 표면 반사광 */}
        <div style={{
          position: 'absolute',
          top: '2px',
          left: '10px',
          right: '10px',
          height: '14px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: '10px',
          pointerEvents: 'none'
        }} />

        {/* 정중앙 타겟 마커 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '-8px',
          bottom: '-8px',
          width: '6px',
          background: 'rgba(255,255,255,0.8)',
          transform: 'translateX(-50%)',
          borderRadius: '3px',
          boxShadow: '0 0 10px #fff, 0 0 20px #4ade80',
          border: '1px solid rgba(0,0,0,0.2)',
          zIndex: 1
        }} />
        
        {/* 고화질 3D 금속 바늘 이미지 */}
        <motion.div
          style={{
            position: 'absolute',
            left: `${position}%`,
            top: '-30px', // 게이지 위쪽에서 찌르도록 위치
            width: '28px',
            height: '60px',
            transform: 'translateX(-50%)',
            zIndex: 10,
            filter: 'drop-shadow(0 15px 10px rgba(0,0,0,0.6))'
          }}
        >
          <img src="/assets/drinks/3d_needle.png" alt="Needle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </motion.div>
      </div>

      {/* 결과창 */}
      <div style={{ height: '100px', marginBottom: '1.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8, rotateX: 45 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateX: -45 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100 }}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                width: '80%',
                background: `${result.color}20`,
                border: `1px solid ${result.color}50`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.4), inset 0 0 30px ${result.color}20`,
                transformStyle: 'preserve-3d'
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: result.color, marginBottom: '0.3rem', textShadow: `0 0 20px ${result.color}` }}>
                {result.score}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#fff', wordBreak: 'keep-all', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {result.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 컨트롤 버튼 (3D 팝업 버튼 스타일) */}
      <motion.button 
        onClick={isPlaying ? stopGame : startGame}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95, y: 2 }}
        style={{ 
          padding: '1rem 3rem', 
          fontSize: '1.2rem', 
          fontWeight: '900', 
          background: isPlaying 
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)' 
            : 'linear-gradient(135deg, #4ade80, #16a34a)',
          border: 'none',
          borderRadius: '16px',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: isPlaying 
            ? '0 10px 0 #7f1d1d, 0 20px 30px rgba(239,68,68,0.5), inset 0 2px 5px rgba(255,255,255,0.4)' 
            : '0 10px 0 #14532d, 0 20px 30px rgba(74,222,128,0.5), inset 0 2px 5px rgba(255,255,255,0.4)',
          width: '200px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transform: 'translateZ(0)'
        }}
      >
        {isPlaying ? '🛑 정지!' : (result ? '🔄 다시하기' : '▶️ 시작')}
      </motion.button>
    </div>
  );
}
