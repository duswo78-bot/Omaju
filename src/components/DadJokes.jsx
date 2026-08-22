import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { assetUrl } from '../utils/assets';
import jokes from '../data/dadJokes.json';

export default function DadJokes() {
  const [currentIndex, setCurrentIndex] = useState(Math.floor(Math.random() * jokes.length));
  const [isFlipped, setIsFlipped] = useState(false);

  const nextJoke = () => {
    setIsFlipped(false);
    setTimeout(() => {
      let nextIdx = currentIndex;
      while (nextIdx === currentIndex) {
        nextIdx = Math.floor(Math.random() * jokes.length);
      }
      setCurrentIndex(nextIdx);
    }, 300); // 카드가 다시 앞으로 돌아오는 시간을 줌
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
        😎 아재개그 사전
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        아재개그 {jokes.length}선 · 카드를 터치하면 정답이 나옵니다. 웃으면 원샷!
      </p>

      {/* 3D 카드 컨테이너 */}
      <div 
        style={{ 
          perspective: '1200px', 
          width: '300px', 
          height: '400px',
          cursor: 'pointer',
          marginBottom: '3rem',
          position: 'relative'
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          animate={{ 
            rotateY: isFlipped ? 180 : 0,
            y: [-10, 10, -10]
          }}
          transition={{ 
            rotateY: { duration: 0.7, type: 'spring', stiffness: 60, damping: 15 },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            zIndex: 2
          }}
        >
          {/* 카드 앞면 (질문) */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundImage: `url(${assetUrl('assets/drinks/3d_card_front.png')})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
            textAlign: 'center',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))'
          }}>
            {/* 3D 요소(글씨)가 카드보다 튀어나오게 보이도록 translateZ 적용 */}
            <div style={{ transform: 'translateZ(60px)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))' }}>🤔</div>
              <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '900', wordBreak: 'keep-all', lineHeight: 1.4, textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                {jokes[currentIndex].q}
              </h2>
            </div>
            <div style={{ position: 'absolute', bottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', transform: 'translateZ(30px)', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>
              👆 터치해서 정답 확인
            </div>
          </div>

          {/* 카드 뒷면 (정답) */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundImage: `url(${assetUrl('assets/drinks/3d_card_back.png')})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
            textAlign: 'center',
            transform: 'rotateY(180deg)',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))'
          }}>
            <div style={{ transform: 'translateZ(60px)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 10px 10px rgba(139,92,246,0.5))' }}>😆</div>
              <h2 style={{ fontSize: '2.2rem', color: '#c4b5fd', fontWeight: '900', wordBreak: 'keep-all', textShadow: '0 10px 20px rgba(0,0,0,0.8), 0 0 15px rgba(167,139,250,0.8)' }}>
                {jokes[currentIndex].a}
              </h2>
            </div>
          </div>
        </motion.div>

        {/* 바닥 그림자 (카드가 둥둥 떠있는 느낌을 극대화) */}
        <motion.div
          animate={{
            scale: [1, 0.85, 1],
            opacity: [0.3, 0.15, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '10%',
            width: '80%',
            height: '20px',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 70%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
      </div>

      <motion.button 
        onClick={nextJoke}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95, y: 2 }}
        style={{ 
          padding: '1rem 3rem', 
          fontSize: '1.2rem', 
          fontWeight: '900', 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', 
          border: '1px solid rgba(255,255,255,0.4)', 
          borderRadius: '16px',
          color: '#fff', 
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.3)',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        👉 다음 개그
      </motion.button>
    </div>
  );
}
