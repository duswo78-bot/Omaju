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
    const baseRadius = (distance / 50) * 110; 
    const randomScatter = Math.random() * 15 - 7.5; 
    const finalRadius = Math.max(0, Math.min(125, baseRadius + randomScatter));
    
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
        🎯 다트 복불복
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        게이지가 정중앙에 올 때 타이밍을 맞춰 발사하세요!
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', width: '100%' }}>
        
        {/* 아주 세련된 네온 스타일 세로 파워 게이지 */}
        <div style={{
          position: 'relative',
          width: '36px',
          height: '280px',
          background: '#09090b',
          borderRadius: '18px',
          boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.8), 0 0 0 2px #27272a, 0 10px 15px rgba(0,0,0,0.5)',
          overflow: 'visible',
          padding: '4px'
        }}>
          {/* 타겟 마커 (바깥쪽으로 살짝 튀어나온 디자인) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '-8px',
            right: '-8px',
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
            borderRadius: '14px',
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
              borderRadius: '14px'
            }} />
          </div>
        </div>

        {/* 중앙: 다트판 영역 */}
        <div style={{ position: 'relative', width: '260px', height: '260px' }}>
          {/* 유저가 업로드한 리얼 다트판 이미지 */}
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            backgroundImage: `url(${assetUrl('assets/drinks/dartboard.png')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 10px 20px rgba(0,0,0,0.5)',
            border: '6px solid #1c1917'
          }}>
          </div>

          {/* 깔끔한 다트 핀 이모지 (지저분한 SVG나 합성 이미지 대신 가장 선명함) */}
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
                  marginLeft: '-20px',
                  marginTop: '-35px',
                  zIndex: 20,
                  transformOrigin: 'bottom center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <div style={{ 
                  fontSize: '46px', 
                  filter: 'drop-shadow(5px 15px 8px rgba(0,0,0,0.8))' 
                }}>📍</div>
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
                  background: 'rgba(9, 9, 11, 0.95)',
                  padding: '1rem 2rem',
                  borderRadius: '20px',
                  color: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                  fontWeight: '900',
                  fontSize: '1.4rem',
                  zIndex: 30,
                  whiteSpace: 'nowrap',
                  border: '2px solid',
                  borderColor: result.score === 'BULLSEYE' ? '#4ade80' : result.score === 'GOOD' ? '#60a5fa' : '#ef4444',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
                }}
              >
                {result.score === 'BULLSEYE' ? '정중앙! 🎉' : 
                 result.score === 'GOOD' ? '안전권! 👍' : 
                 '아웃! 🍻'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 오른쪽: 진짜 아케이드 물리 버튼 스타일 */}
        <div style={{ position: 'relative', width: '80px', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          
          <motion.button
            onClick={stopGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ 
              scale: 0.95, 
              y: 12, 
              boxShadow: isPlaying
                ? '0 0px 0 #991b1b, 0 5px 10px rgba(220,38,38,0.5), inset 0 2px 5px rgba(255,255,255,0.4)'
                : '0 0px 0 #166534, 0 5px 10px rgba(22,163,74,0.5), inset 0 2px 5px rgba(255,255,255,0.4)'
            }}
            style={{ 
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isPlaying ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: '3px solid rgba(255,255,255,0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontWeight: '900',
              fontSize: '1rem',
              boxShadow: isPlaying 
                ? '0 12px 0 #991b1b, 0 15px 25px rgba(220,38,38,0.7), inset 0 2px 5px rgba(255,255,255,0.4)' 
                : '0 12px 0 #166534, 0 15px 25px rgba(22,163,74,0.7), inset 0 2px 5px rgba(255,255,255,0.4)',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
              transition: 'box-shadow 0.1s, transform 0.1s',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🎯</div>
            {isPlaying ? 'STOP' : 'GO'}
          </motion.button>
          
        </div>
      </div>
    </div>
  );
}
