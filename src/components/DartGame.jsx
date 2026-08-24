import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFanfare, playApplause, playFail } from '../utils/audio';
import { assetUrl } from '../utils/assets';

const DartPin = ({ size = 60 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ filter: 'drop-shadow(5px 15px 10px rgba(0,0,0,0.6))', display: 'block' }}>
    {/* 바늘 (Tip) - 은빛 메탈 */}
    <polygon points="50,95 47,65 53,65" fill="#e5e7eb" />
    <polygon points="50,95 50,65 53,65" fill="#9ca3af" /> 
    
    {/* 배럴 (Barrel) - 눈에 띄는 화려한 금장 */}
    <rect x="44" y="45" width="12" height="20" fill="#fbbf24" rx="2" />
    <rect x="43" y="48" width="14" height="2" fill="#d97706" />
    <rect x="43" y="53" width="14" height="2" fill="#d97706" />
    <rect x="43" y="58" width="14" height="2" fill="#d97706" />
    
    {/* 샤프트 (Shaft) - 화이트/실버 */}
    <rect x="46" y="25" width="8" height="20" fill="#f3f4f6" />
    <rect x="50" y="25" width="4" height="20" fill="#d1d5db" />
    
    {/* 플라이트 (Flight) - 크고 화려한 파란색 깃털 베이스에 빨간색 포인트 */}
    {/* 큰 뒷배경 깃 (파란색) */}
    <path d="M50,2 L25,25 L45,25 L50,12 L55,25 L75,25 Z" fill="#3b82f6" />
    {/* 앞쪽 깃 (빨간색 포인트) */}
    <path d="M50,2 L40,25 L50,12 L60,25 Z" fill="#ef4444" />
    {/* 중앙 기둥 디테일 */}
    <path d="M50,2 L48,25 L52,25 Z" fill="#1e3a8a" />
  </svg>
);

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
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0.5rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        <span className="emoji-icon">🎯</span> 다트 복불복
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        게이지가 정중앙에 올 때 🎯 아이콘을 누르세요!
      </p>

      {/* 게임 영역 (다트판이 무조건 화면 정중앙에 오도록 Absolute/Relative 활용) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', height: '290px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        
        {/* 왼쪽: 세로 게이지 */}
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

        {/* 중앙: 다트판 영역 */}
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

          {/* 깔끔한 다트 핀 모양 */}
          <AnimatePresence>
            {result && (
              <motion.div
                // 우측 하단(버튼 위치)에서 출발해서 꽂히는 애니메이션
                initial={{ scale: 3, opacity: 0, x: 200, y: 150, rotate: 90 }}
                animate={{ scale: 1, opacity: 1, x: result.dartX, y: result.dartY, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '50px',
                  height: '50px',
                  // 사이즈 50px일 때 바늘 끝(50,95)의 중심 보정: 좌우 -25px, 상하 -47.5px
                  marginLeft: '-25px',
                  marginTop: '-47.5px',
                  zIndex: 20,
                  transformOrigin: 'bottom center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <DartPin size={50} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 오른쪽: 배경이 제거된 대형 아이콘 버튼 (오른쪽에 붙이되 250px 아래로) */}
        <div style={{ position: 'absolute', right: '5px', zIndex: 10, marginTop: '250px' }}>
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
            {/* 리얼한 다트 핀 렌더링 */}
            <motion.div 
              animate={{ y: isPlaying ? [0, -10, 0] : 0 }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              <DartPin size={80} />
            </motion.div>
            <div style={{ 
              color: isPlaying ? '#ef4444' : '#fff', 
              fontWeight: '900', 
              fontSize: '1.2rem',
              marginTop: '0.5rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {isPlaying ? 'STOP' : 'GO'}
            </div>
          </motion.button>
        </div>
      </div>

      {/* 결과 메시지를 다트판 아래 빈 공간에 Absolute로 표시하여 불필요한 스크롤 여백 제거 */}
      <div style={{ position: 'absolute', bottom: '0px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 30, pointerEvents: 'none' }}>
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
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
