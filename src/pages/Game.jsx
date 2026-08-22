import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SpinBottle from '../components/SpinBottle';
import DadJokes from '../components/DadJokes';
import SobrietyTest from '../components/SobrietyTest';

const games = [
  { id: 'bottle', component: <SpinBottle /> },
  { id: 'jokes', component: <DadJokes /> },
  { id: 'sobriety', component: <SobrietyTest /> }
];

export default function Game() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = games.length - 1;
      if (next >= games.length) next = 0;
      return next;
    });
  };

  const variants = {
    enter: (direction) => {
      return {
        x: direction > 0 ? 300 : -300,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 300 : -300,
        opacity: 0
      };
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* 캐러셀 네비게이션 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1.5rem', marginTop: '1rem' }}>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => paginate(-1)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {games.map((_, idx) => (
            <div 
              key={idx}
              style={{
                width: idx === currentIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx === currentIndex ? '#a78bfa' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => paginate(1)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <ChevronRight size={24} />
        </motion.button>
      </div>

      {/* 게임 컴포넌트 렌더링 영역 */}
      <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            style={{ position: 'absolute', width: '100%', maxWidth: '500px', height: '100%' }}
          >
            {games[currentIndex].component}
          </motion.div>
        </AnimatePresence>
      </div>
      
    </div>
  );
}
