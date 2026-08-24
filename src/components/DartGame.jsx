import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFanfare, playApplause, playFail } from '../utils/audio';
import { assetUrl } from '../utils/assets';

export default function DartGame() {
  const [position, setPosition] = useState(50); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState(null); 
  
  const requestRef = useRef();
  const direction = useRef(1);
  const speed = useRef(2.5);

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
    speed.current = 2.0 + Math.random() * 2.5; 
    setIsPlaying(true);
  };

  const stopGame = () => {
    if (!isPlaying) {
      if (!result) startGame();
      else startGame();
      return;
    }

    playClick();
    setIsPlaying(false);
    cancelAnimationFrame(requestRef.current);

    const distance = Math.abs(50 - position);
    // 290px 다트판 -> 반경 145px. 최대 135px까지 꽂힘.
    const baseRadius = (distance / 50) * 125; 
    const randomScatter = Math.random() * 15 - 7.5; 
    const finalRadius = Math.max(0, Math.min(135, baseRadius + randomScatter));
    
    const angle = Math.random() * 2 * Math.PI;
    const dartX = Math.cos(angle) * finalRadius;
    const dartY = Math.sin(angle) * finalRadius; 

    let score = '';
    if (distance <= 4) {
      score = 'BULLSEYE';
      setTimeout(() => { playFanfare(); playApplause(); }, 400); 
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
    }, 400); 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0.5rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        <span className="emoji-icon">🎯</span> 다트 복불복
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        게이지가 정중앙에 올 때 🎯 아이콘을 누르세요!
      </p>

      {/* 게임 영역 (다트판이 무조건 화면 정중앙에 오도록 Absolute/Relative 활용) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', height: '290px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        
        {/* 왼쪽: 세로 게이지 (크기 10% 축소에 맞춰서 높이 260px) */}
        <div style={{
          position: 'absolute',
          left: '5px',
          width: '32px',
          height: '260px', 
          background: '#09090b',
          borderRadius: '16px',
          boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.8), 0 0 0 2px #27272a, 0 10px 15px rgba(0,0,0,0.5)',
          overflow: 'visible',
          padding: '4px',
          zIndex: 10
        }}>
          {/* 타겟 마커 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '-6px',
            right: '-6px',
            height: '4px',
            background: '#fff',
            transform: 'translateY(-50%)',
            zIndex: 10,
            borderRadius: '2px',
            boxShadow: '0 0 10px #fff, 0 0 20px #4ade80'
          }} />
          
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: '#18181b',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* 게이지 바 */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${position}%`,
              background: position > 40 && position < 60 
                ? 'linear-gradient(to top, #22c55e, #4ade80)' 
                : position > 20 && position < 80 
                  ? 'linear-gradient(to top, #eab308, #fde047)' 
                  : 'linear-gradient(to top, #dc2626, #f87171)',
              boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4), 0 0 20px ' + (position > 40 && position < 60 ? '#4ade80' : position > 20 && position < 80 ? '#fde047' : '#f87171'),
              transition: 'background 0.2s, box-shadow 0.2s',
              borderRadius: '12px'
            }} />
          </div>
        </div>

        {/* 중앙: 다트판 영역 (화면 중앙 정렬 유지. 320px에서 10% 줄인 290px) */}
        <div style={{ position: 'relative', width: '290px', height: '290px' }}>
          {/* 완벽하게 중심이 맞는 고해상도 생성 다트판 이미지 */}
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            backgroundImage: `url(${assetUrl('assets/drinks/dartboard2.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 10px 20px rgba(0,0,0,0.8)',
            border: '4px solid #111'
          }}>
          </div>

          {/* 깔끔한 다트 핀 이모지 */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 4, opacity: 0, y: 150, rotate: 45 }}
                animate={{ scale: 1, opacity: 1, x: result.dartX, y: result.dartY, rotate: 0 }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '40px',
                  height: '40px',
                  // 📍 이모지의 뾰족한 끝(하단 중앙)이 정확히 좌표에 오도록 세밀하게 보정
                  marginLeft: '-20px',
                  marginTop: '-36px',
                  zIndex: 20,
                  transformOrigin: 'bottom center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <div style={{ 
                  fontSize: '44px', 
                  filter: 'drop-shadow(5px 15px 8px rgba(0,0,0,0.8))' 
                }}>📍</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 오른쪽: 배경이 제거된 대형 아이콘 버튼 (다트판과 동일한 높이에 배치) */}
        <div style={{ position: 'absolute', right: '5px', zIndex: 10 }}>
          <motion.button
            onClick={stopGame}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85, rotate: -15 }}
            style={{ 
              background: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {/* 크기를 대폭 키운 다트 아이콘 */}
            <motion.div 
              animate={{ y: isPlaying ? [0, -5, 0] : 0 }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              style={{ 
                fontSize: '3.5rem', 
                filter: isPlaying ? 'drop-shadow(0 0 10px rgba(239,68,68,0.8)) drop-shadow(0 5px 10px rgba(0,0,0,0.8))' : 'drop-shadow(0 5px 10px rgba(0,0,0,0.8))' 
              }}
            >
              <span className="emoji-icon">🎯</span>
            </motion.div>
            <div style={{ 
              color: isPlaying ? '#ef4444' : '#fff', 
              fontWeight: '900', 
              fontSize: '1rem',
              marginTop: '0.2rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {isPlaying ? 'STOP' : 'GO'}
            </div>
          </motion.button>
        </div>
      </div>

      {/* 결과 메시지를 다트판 아래에 고정 표시 */}
      <div style={{ height: '60px', marginTop: '3rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                background: 'rgba(9, 9, 11, 0.95)',
                padding: '0.8rem 2rem',
                borderRadius: '16px',
                color: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                fontWeight: '900',
                fontSize: '1.4rem',
                border: '2px solid',
                borderColor: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
              }}
            >
              {result.score === 'BULLSEYE' ? '정중앙! 🎉' : 
               result.score === 'GOOD' ? '안전권! 👍' : 
               '아웃! 🍻'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
