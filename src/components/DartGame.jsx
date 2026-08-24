import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFanfare, playApplause, playFail } from '../utils/audio';

export default function DartGame() {
  const [position, setPosition] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState(null); // { distance, score, dartX, dartY }
  
  const requestRef = useRef();
  const direction = useRef(1);
  const speed = useRef(2);

  const animate = () => {
    setPosition(prev => {
      let next = prev + speed.current * direction.current;
      if (next >= 100) {
        next = 100;
        direction.current = -1;
      } else if (next <= 0) {
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
    playClick();
    setResult(null);
    setPosition(50);
    direction.current = Math.random() > 0.5 ? 1 : -1;
    speed.current = 1.5 + Math.random() * 2.0; // 1.5 ~ 3.5
    setIsPlaying(true);
  };

  const stopGame = () => {
    if (!isPlaying) return;
    playClick();
    setIsPlaying(false);
    cancelAnimationFrame(requestRef.current);

    // 판정 로직: 50(정중앙)에서 얼마나 떨어져 있는가? 최대 50
    const distance = Math.abs(50 - position);
    
    // 다트 좌표 계산 (극좌표계)
    // distance(0~50)을 다트판 반지름(120px)에 매핑. (약간의 랜덤 분산 추가)
    const baseRadius = (distance / 50) * 120; 
    const randomScatter = Math.random() * 10 - 5; 
    const finalRadius = Math.max(0, Math.min(130, baseRadius + randomScatter));
    
    const angle = Math.random() * 2 * Math.PI;
    const dartX = Math.cos(angle) * finalRadius;
    const dartY = Math.sin(angle) * finalRadius;

    let score = '';
    if (distance <= 4) {
      score = 'BULLSEYE';
      setTimeout(() => { playFanfare(); playApplause(); }, 400); // 꽂힌 직후 재생
    } else if (distance <= 15) {
      score = 'GOOD';
      setTimeout(() => playPop(), 400);
    } else if (distance <= 35) {
      score = 'MISS';
      setTimeout(() => playFail(), 400);
    } else {
      score = 'OUT';
      setTimeout(() => playFail(), 400);
    }
    
    setTimeout(() => {
      setResult({ distance, score, dartX, dartY });
    }, 400); // 다트 날아가는 시간
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        🎯 다트 복불복
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        정중앙 초록색에 맞춰 다트를 쏘세요!<br/>중앙에서 멀어질수록 벌칙의 늪으로...
      </p>

      {/* 3D 게이지 영역 */}
      <div style={{ 
        position: 'relative', 
        width: '320px', 
        height: '40px',
        background: 'linear-gradient(90deg, #ef4444 0%, #fbbf24 30%, #4ade80 45%, #22c55e 50%, #4ade80 55%, #fbbf24 70%, #ef4444 100%)',
        borderRadius: '20px',
        boxShadow: 'inset 0 5px 10px rgba(255,255,255,0.2), inset 0 -5px 10px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.5)',
        marginBottom: '2rem',
        border: '2px solid rgba(255,255,255,0.2)'
      }}>
        {/* 정중앙 마커 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '-5px',
          bottom: '-5px',
          width: '4px',
          background: '#fff',
          transform: 'translateX(-50%)',
          borderRadius: '2px',
          boxShadow: '0 0 10px #fff'
        }} />
        
        {/* 움직이는 타겟 (십자선) */}
        <div
          style={{
            position: 'absolute',
            left: \\%\,
            top: '50%',
            width: '24px',
            height: '24px',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '50%',
            boxShadow: '0 0 15px rgba(255,255,255,1)',
            border: '3px solid #000',
            zIndex: 10,
          }}
        >
          <div style={{ position: 'absolute', top: '10px', left: '-5px', right: '-5px', height: '2px', background: '#000' }} />
          <div style={{ position: 'absolute', left: '10px', top: '-5px', bottom: '-5px', width: '2px', background: '#000' }} />
        </div>
      </div>

      {/* 다트판 영역 */}
      <div style={{ position: 'relative', width: '260px', height: '260px', marginBottom: '2rem' }}>
        {/* 다트판 배경 */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle, #ef4444 10%, #22c55e 10%, #22c55e 30%, #ef4444 30%, #ef4444 50%, #22c55e 50%, #22c55e 70%, #ef4444 70%, #ef4444 90%, #000 90%)',
          border: '10px solid #1f2937',
          boxShadow: '0 20px 30px rgba(0,0,0,0.5), inset 0 10px 20px rgba(0,0,0,0.5)'
        }}>
          {/* 다트판 구분선 (가로세로/대각선) */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', background: 'rgba(0,0,0,0.5)', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', background: 'rgba(0,0,0,0.5)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', background: 'rgba(0,0,0,0.5)', transform: 'translateX(-50%) rotate(45deg)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', background: 'rgba(0,0,0,0.5)', transform: 'translateX(-50%) rotate(-45deg)' }} />
        </div>

        {/* 날아와서 꽂힌 다트 */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ scale: 3, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, x: result.dartX, y: result.dartY }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '40px',
                height: '40px',
                marginLeft: '-20px',
                marginTop: '-35px',
                zIndex: 20,
                transformOrigin: 'bottom center'
              }}
            >
              <div style={{ fontSize: '40px', filter: 'drop-shadow(5px 15px 5px rgba(0,0,0,0.7))' }}>🎯</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 결과 메시지 팝업 */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.85)',
                padding: '0.8rem 1.5rem',
                borderRadius: '16px',
                color: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                fontWeight: '900',
                fontSize: '1.2rem',
                zIndex: 30,
                whiteSpace: 'nowrap',
                border: '2px solid',
                borderColor: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}
            >
              {result.score === 'BULLSEYE' ? '정중앙! 🎉 (벌칙 면제)' : 
               result.score === 'GOOD' ? '안전권! 👍' : 
               '아웃! 마셔! 🍻'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 컨트롤 버튼 (3D 원형 팝업 버튼 스타일) */}
      <motion.button 
        onClick={isPlaying ? stopGame : startGame}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.9, y: 5 }}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px', 
          height: '120px',
          fontSize: '1.3rem', 
          fontWeight: '900', 
          background: isPlaying 
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)' 
            : 'linear-gradient(135deg, #4ade80, #16a34a)',
          border: '4px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: isPlaying 
            ? '0 10px 0 #7f1d1d, 0 20px 30px rgba(239,68,68,0.6), inset 0 4px 10px rgba(255,255,255,0.5)' 
            : '0 10px 0 #14532d, 0 20px 30px rgba(74,222,128,0.6), inset 0 4px 10px rgba(255,255,255,0.5)',
          textShadow: '0 2px 6px rgba(0,0,0,0.4)',
          transform: 'translateZ(0)',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isPlaying ? 'SHOOT!' : (result ? '다시' : '준비')}
      </motion.button>
    </div>
  );
}
