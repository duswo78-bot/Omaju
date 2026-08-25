import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SpinBottle from '../components/SpinBottle';
import DadJokes from '../components/DadJokes';
import SobrietyTest from '../components/SobrietyTest';
import Baskin31 from '../components/Baskin31';
import UpDownGame from '../components/UpDownGame';
import DartGame from '../components/DartGame';
import GameRules from '../components/GameRules';

const games = [
  { id: 'bottle', title: '돌려돌려 병', component: <SpinBottle /> },
  { id: 'baskin', title: '베스킨 31', component: <Baskin31 /> },
  { id: 'updown', title: '업앤다운', component: <UpDownGame /> },
  { id: 'dart', title: '다트 복불복', component: <DartGame /> },
  { id: 'jokes', title: '아재개그', component: <DadJokes /> },
  { id: 'sobriety', title: '취함 테스트', component: <SobrietyTest /> },
  { id: 'rules', title: '규칙 카드', component: <GameRules /> },
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
    enter: (dir) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const gameBackgrounds = {
    bottle: {
      backgroundImage: 'radial-gradient(circle at center, rgba(234,179,8,0.15) 0%, transparent 60%)',
    },
    baskin: {
      backgroundImage: 'radial-gradient(rgba(236, 72, 153, 0.15) 20%, transparent 20%), radial-gradient(rgba(59, 130, 246, 0.15) 20%, transparent 20%)',
      backgroundSize: '40px 40px',
      backgroundPosition: '0 0, 20px 20px',
    },
    updown: {
      backgroundImage: 'linear-gradient(45deg, rgba(74, 222, 128, 0.08) 25%, transparent 25%, transparent 75%, rgba(74, 222, 128, 0.08) 75%, rgba(74, 222, 128, 0.08)), linear-gradient(45deg, rgba(74, 222, 128, 0.08) 25%, transparent 25%, transparent 75%, rgba(74, 222, 128, 0.08) 75%, rgba(74, 222, 128, 0.08))',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 10px 10px',
    },
    dart: {
      backgroundImage: 'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 20px, rgba(239, 68, 68, 0.1) 20px, rgba(239, 68, 68, 0.1) 22px)',
    },
    jokes: {
      backgroundImage: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 2px, transparent 2px)',
      backgroundSize: '20px 20px',
    },
    sobriety: {
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
    rules: {
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
      backgroundSize: '15px 15px',
    }
  };

  return (
    <div 
      className="animate-fade-in" 
      style={{ 
        padding: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        flex: 1, 
        overflowX: 'hidden',
        transition: 'background 0.3s ease',
        ...gameBackgrounds[games[currentIndex].id]
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1.5rem', marginTop: '1rem', zIndex: 10 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => paginate(-1)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <ChevronLeft size={24} />
        </motion.button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.45rem' }}>{games[currentIndex].title}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {games.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                style={{
                  width: idx === currentIndex ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  padding: 0,
                  background: idx === currentIndex ? '#a78bfa' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                aria-label={g.title}
              />
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => paginate(1)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <ChevronRight size={24} />
        </motion.button>
      </div>

      <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', justifyContent: 'center', minHeight: '70vh' }}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            style={{ position: 'absolute', width: '100%', maxWidth: '560px', height: '100%', overflowY: 'auto' }}
          >
            {games[currentIndex].component}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
