import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFanfare, playApplause, playFail } from '../utils/audio';
import { assetUrl } from '../utils/assets';

// 깔끔한 CSS 다트 핀 (SVG)
const DartSvg = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(3px 10px 5px rgba(0,0,0,0.8))', transform: 'rotate(-45deg)' }}>
    {/* 꼬리 날개 (Flight) */}
    <path d="M 80 80 L 100 70 L 90 90 Z" fill="#ef4444" />
    <path d="M 80 80 L 70 100 L 90 90 Z" fill="#b91c1c" />
    {/* 몸통 (Barrel) */}
    <rect x="50" y="45" width="40" height="10" fill="#9ca3af" transform="rotate(45 50 50)" rx="2" />
    <rect x="52" y="47" width="36" height="6" fill="#d1d5db" transform="rotate(45 50 50)" />
    {/* 바늘 (Tip) */}
    <polygon points="10,90 30,70 30,75" fill="#d1d5db" transform="rotate(45 20 80)" />
    <polygon points="50,50 20,50 20,48" fill="#d1d5db" transform="rotate(45 50 50)" />
    {/* 진짜 팁 */}
    <polygon points="20,49 0,49 20,51" fill="#f3f4f6" transform="rotate(45 20 50)" />
  </svg>
);

export default function DartGame() {
  const [position, setPosition] = useState(50); // 0 to 100 (Vertical: 100 is top, 0 is bottom)
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
    speed.current = 2.0 + Math.random() * 2.5; // 2.0 ~ 4.5
    setIsPlaying(true);
  };

  const stopGame = () => {
    if (!isPlaying) {
      // 준비 상태에서 다트 핀을 누르면 쏘기 시작함
      if (!result) startGame();
      else {
        // 이미 결과가 있으면 초기화하고 시작
        startGame();
      }
      return;
    }

    playClick();
    setIsPlaying(false);
    cancelAnimationFrame(requestRef.current);

    // 판정 로직: 50(정중앙)에서 얼마나 떨어져 있는가? 최대 50
    const distance = Math.abs(50 - position);
    
    // 다트판 실제 반지름 (260px / 2 = 130px)
    // distance(0~50)을 다트판 반지름(110px)에 매핑.
    const baseRadius = (distance / 50) * 110; 
    const randomScatter = Math.random() * 15 - 7.5; 
    const finalRadius = Math.max(0, Math.min(125, baseRadius + randomScatter));
    
    const angle = Math.random() * 2 * Math.PI;
    const dartX = Math.cos(angle) * finalRadius;
    const dartY = Math.sin(angle) * finalRadius; // (위아래)

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
    }, 400); // 다트 날아가는 시간
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        🎯 다트 복불복
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        오른쪽 다트를 눌러 파워를 정중앙에 맞춰 쏘세요!
      </p>

      {/* 게임 메인 UI (좌: 게이지, 중: 과녁, 우: 발사 버튼) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%' }}>
        
        {/* 왼쪽: 세로 파워 게이지 */}
        <div style={{
          position: 'relative',
          width: '30px',
          height: '260px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '15px',
          boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.1)',
          overflow: 'hidden'
        }}>
          {/* 눈금선 (정중앙 50% 마커) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '4px',
            background: '#fff',
            transform: 'translateY(-50%)',
            zIndex: 10,
            boxShadow: '0 0 5px #fff'
          }} />
          
          {/* 채워지는 게이지 바 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${position}%`,
            background: position > 40 && position < 60 
              ? 'linear-gradient(to top, #4ade80, #22c55e)' // 초록 (안전)
              : position > 20 && position < 80 
                ? 'linear-gradient(to top, #fbbf24, #f59e0b)' // 노랑 (경고)
                : 'linear-gradient(to top, #ef4444, #b91c1c)', // 빨강 (위험)
            transition: 'background 0.2s'
          }} />
        </div>

        {/* 중앙: 다트판 영역 */}
        <div style={{ position: 'relative', width: '260px', height: '260px' }}>
          {/* 다트판 배경 (유저 업로드 이미지) */}
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            backgroundImage: `url(${assetUrl('assets/drinks/dartboard.png')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 20px 30px rgba(0,0,0,0.8), inset 0 10px 20px rgba(0,0,0,0.5)',
            border: '8px solid #111'
          }}>
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
                  width: '60px',
                  height: '60px',
                  marginLeft: '-30px',
                  marginTop: '-30px',
                  zIndex: 20,
                  transformOrigin: 'bottom right'
                }}
              >
                <DartSvg size={60} />
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
                  background: 'rgba(0,0,0,0.9)',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '16px',
                  color: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                  fontWeight: '900',
                  fontSize: '1.3rem',
                  zIndex: 30,
                  whiteSpace: 'nowrap',
                  border: '2px solid',
                  borderColor: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
                }}
              >
                {result.score === 'BULLSEYE' ? '정중앙! 🎉 (벌칙 면제)' : 
                 result.score === 'GOOD' ? '안전권! 👍' : 
                 '아웃! 마셔! 🍻'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 오른쪽: 발사 버튼 (다트 핀 이미지) */}
        <div style={{ position: 'relative', width: '80px', height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          
          <motion.div
            onClick={stopGame}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, x: -10 }}
            animate={{ 
              y: isPlaying ? [-5, 5, -5] : 0 
            }}
            transition={{ y: { repeat: Infinity, duration: 0.5 } }}
            style={{ 
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
              border: isPlaying ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 10px 20px rgba(0,0,0,0.5)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* 생성한 흰색 배경 다트 이미지를 multiply로 합성하여 다트만 남게 함 */}
            <img 
              src={assetUrl('assets/drinks/dart_pin.jpg')} 
              alt="Dart" 
              style={{ 
                width: '120%', 
                height: '120%', 
                objectFit: 'contain', 
                mixBlendMode: 'multiply',
                transform: 'rotate(-45deg)'
              }} 
            />
          </motion.div>
          
          <div style={{ marginTop: '1rem', color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {isPlaying ? 'SHOOT!' : (result ? '다시 쏘기' : '다트 쏘기')}
          </div>
        </div>
      </div>
    </div>
  );
}
