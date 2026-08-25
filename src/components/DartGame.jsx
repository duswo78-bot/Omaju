import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFanfare, playApplause, playFail } from '../utils/audio';
import { assetUrl } from '../utils/assets';

const DartPin = ({ size = 60 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ filter: 'drop-shadow(5px 15px 10px rgba(0,0,0,0.6))', display: 'block' }}>
    {/* 바늘 (Tip) - 위쪽(y=5)을 향하도록 배치 */}
    <polygon points="50,5 47,35 53,35" fill="#e5e7eb" />
    <polygon points="50,5 50,35 53,35" fill="#9ca3af" /> 
    
    {/* 배럴 (Barrel) - 화려한 금장 */}
    <rect x="44" y="35" width="12" height="20" fill="#fbbf24" rx="2" />
    <rect x="43" y="40" width="14" height="2" fill="#d97706" />
    <rect x="43" y="45" width="14" height="2" fill="#d97706" />
    <rect x="43" y="50" width="14" height="2" fill="#d97706" />
    
    {/* 샤프트 (Shaft) */}
    <rect x="46" y="55" width="8" height="20" fill="#f3f4f6" />
    <rect x="50" y="55" width="4" height="20" fill="#d1d5db" />
    
    {/* 플라이트 (Flight) - 위로 갈수록(y=75방향) 좁아지고, 아래로 갈수록(y=98방향) 솟은/넓어진 모양 */}
    {/* 파란색 뒷배경 깃 */}
    <path d="M50,75 L20,95 L45,95 L50,85 L55,95 L80,95 Z" fill="#3b82f6" />
    {/* 빨간색 포인트 깃 */}
    <path d="M50,75 L35,95 L50,85 L65,95 Z" fill="#ef4444" />
    {/* 딥블루 중앙선 */}
    <path d="M50,75 L48,95 L52,95 Z" fill="#1e3a8a" />
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

    let scoreNum = 0;
    if (distance <= 2) scoreNum = 100;
    else if (distance <= 10) scoreNum = 80;
    else if (distance <= 20) scoreNum = 50;
    else if (distance <= 30) scoreNum = 30;
    else scoreNum = 0;
    
    // 비행 각도 계산 (버튼 시작 위치 x: 200, y: 170 대비)
    const startX = 200;
    const startY = 170;
    const flightAngleRad = Math.atan2(dartY - startY, dartX - startX);
    const flightAngleDeg = (flightAngleRad * 180) / Math.PI;
    // 다트 바늘이 위를 향하므로(0도), 날아가는 방향에 맞추려면 각도에 90을 더함
    const dartRotation = flightAngleDeg + 90;

    // 날아가는 애니메이션 시작
    setResult({ distance, score: scoreNum, dartX, dartY, dartRotation, startX, startY, isFlying: true });

    // 1초(1000ms) 뒤 도착했을 때 사운드 및 결과 메시지 표시
    setTimeout(() => {
      if (scoreNum === 100) { playFanfare(); playApplause(); }
      else if (scoreNum >= 50) { playPop(); }
      else { playFail(); }
      
      setResult(prev => ({ ...prev, isFlying: false }));
    }, 1000); 
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0.5rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        <span className="emoji-icon">🎯</span> 다트 복불복
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        게이지가 정중앙에 올 때 🎯 아이콘을 누르세요!
      </p>

      {/* 게임 영역 */}
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
          {/* 깔끔한 다트 핀 모양 */}
          <AnimatePresence>
            {result && (
              <motion.div
                // 계산된 비행 각도(dartRotation)를 유지하며 날아감
                initial={{ scale: 1.5, opacity: 1, x: result.startX, y: result.startY, rotate: result.dartRotation }}
                animate={{ scale: 1, opacity: 1, x: result.dartX, y: result.dartY, rotate: result.dartRotation }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '50px',
                  height: '50px',
                  marginLeft: '-25px',
                  marginTop: '-25px',
                  zIndex: 20,
                  transformOrigin: '50% 10%', 
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

        {/* 오른쪽: 버튼 위치를 330px로 변경 (기존 250px에서 80px 더 내림) */}
        <div style={{ position: 'absolute', right: '5px', zIndex: 10, marginTop: '330px' }}>
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
            <motion.div 
              animate={{ y: isPlaying ? [0, -10, 0] : 0 }}
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
              fontSize: '1.2rem',
              marginTop: '0.5rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {isPlaying ? 'STOP' : 'GO'}
            </div>
          </motion.button>
        </div>
      </div>

      {/* 결과 메시지: 과녁을 가리지 않도록 더 아래로(-30px) 내림 */}
      <div style={{ position: 'absolute', bottom: '-30px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 30, pointerEvents: 'none' }}>
        <AnimatePresence>
          {result && !result.isFlying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                background: 'rgba(9, 9, 11, 0.95)',
                padding: '0.8rem 2rem',
                borderRadius: '16px',
                color: result.score === 100 ? '#4ade80' : result.score >= 50 ? '#60a5fa' : '#ef4444',
                fontWeight: '900',
                fontSize: '1.4rem',
                border: '2px solid',
                borderColor: result.score === 100 ? '#4ade80' : result.score >= 50 ? '#60a5fa' : '#ef4444',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
              }}
            >
              {result.score === 100 ? '100점! 정중앙! 🎉' : 
               result.score >= 50 ? `${result.score}점! 👍` : 
               result.score > 0 ? `${result.score}점! 까비 😅` : 
               '0점! 아웃! 🍻'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
