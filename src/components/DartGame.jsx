import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playPop, playFanfare, playApplause, playFail } from '../utils/audio';
import { assetUrl } from '../utils/assets';
import { Users, Trophy, RotateCcw, Play } from 'lucide-react';

const DartPin = ({ size = 60 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ filter: 'drop-shadow(5px 15px 10px rgba(0,0,0,0.6))', display: 'block' }}>
    <polygon points="50,5 47,35 53,35" fill="#e5e7eb" />
    <polygon points="50,5 50,35 53,35" fill="#9ca3af" /> 
    <rect x="44" y="35" width="12" height="20" fill="#fbbf24" rx="2" />
    <rect x="43" y="40" width="14" height="2" fill="#d97706" />
    <rect x="43" y="45" width="14" height="2" fill="#d97706" />
    <rect x="43" y="50" width="14" height="2" fill="#d97706" />
    <rect x="46" y="55" width="8" height="20" fill="#f3f4f6" />
    <rect x="50" y="55" width="4" height="20" fill="#d1d5db" />
    <path d="M50,75 L20,95 L45,95 L50,85 L55,95 L80,95 Z" fill="#3b82f6" />
    <path d="M50,75 L35,95 L50,85 L65,95 Z" fill="#ef4444" />
    <path d="M50,75 L48,95 L52,95 Z" fill="#1e3a8a" />
  </svg>
);

export default function DartGame() {
  const [gameState, setGameState] = useState('setup'); // setup, playing, finished
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [throwCount, setThrowCount] = useState(0);
  
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

  const handleStartGame = () => {
    playClick();
    const initialPlayers = Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `플레이어 ${i + 1}`,
      scores: [],
      total: 0
    }));
    setPlayers(initialPlayers);
    setCurrentPlayerIndex(0);
    setThrowCount(0);
    setGameState('playing');
    setResult(null);
    setPosition(50);
  };

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
      return;
    }

    playClick();
    setIsPlaying(false);
    cancelAnimationFrame(requestRef.current);

    const distance = Math.abs(50 - position);
    const baseRadius = (distance / 50) * 125; 
    const randomScatter = Math.random() * 15 - 7.5; 
    const finalRadius = Math.max(0, Math.min(135, baseRadius + randomScatter));
    
    const angle = Math.random() * 2 * Math.PI;
    const dartX = Math.cos(angle) * finalRadius;
    const dartY = Math.sin(angle) * finalRadius; 

    let scoreNum = 0;
    if (distance <= 2) scoreNum = 100;
    else if (distance <= 6) scoreNum = 90;
    else if (distance <= 10) scoreNum = 80;
    else if (distance <= 20) scoreNum = 50;
    else if (distance <= 30) scoreNum = 30;
    else if (distance <= 40) scoreNum = 10;
    else scoreNum = 0;
    
    const startX = 200;
    const startY = 170;
    const flightAngleRad = Math.atan2(dartY - startY, dartX - startX);
    const flightAngleDeg = (flightAngleRad * 180) / Math.PI;
    const dartRotation = flightAngleDeg + 90;

    setResult({ distance, score: scoreNum, dartX, dartY, dartRotation, startX, startY, isFlying: true });

    setTimeout(() => {
      if (scoreNum === 100) { playFanfare(); playApplause(); }
      else if (scoreNum >= 50) { playPop(); }
      else { playFail(); }
      
      setResult(prev => ({ ...prev, isFlying: false }));
      
      setPlayers(prev => {
        const newPlayers = [...prev];
        const p = newPlayers[currentPlayerIndex];
        p.scores.push(scoreNum);
        p.total += scoreNum;
        return newPlayers;
      });

      setTimeout(() => {
        setResult(null);
        if (throwCount < 2) {
          setThrowCount(tc => tc + 1);
        } else {
          if (currentPlayerIndex < numPlayers - 1) {
            setCurrentPlayerIndex(idx => idx + 1);
            setThrowCount(0);
          } else {
            setGameState('finished');
          }
        }
      }, 1500);

    }, 1000); 
  };

  const getEmojiForScore = (score) => {
    if (score === 100) return '🎉';
    if (score >= 80) return '🔥';
    if (score >= 50) return '👍';
    if (score > 0) return '😅';
    return '🍻';
  };

  if (gameState === 'setup') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '2rem 1rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
          <span className="emoji-icon">🎯</span> 다트 복불복
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', textAlign: 'center', fontSize: '1rem' }}>
          참여할 인원을 선택해주세요. (1인당 3번 투척)
        </p>

        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Users size={32} color="var(--primary-color)" />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>참여 인원</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { playClick(); setNumPlayers(Math.max(1, numPlayers - 1)); }}
              style={{ width: '50px', height: '50px', borderRadius: '25px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
            >-</motion.button>
            
            <div style={{ fontSize: '3rem', fontWeight: '900', color: '#fff', width: '60px', textAlign: 'center' }}>
              {numPlayers}
            </div>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { playClick(); setNumPlayers(Math.min(8, numPlayers + 1)); }}
              style={{ width: '50px', height: '50px', borderRadius: '25px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
            >+</motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartGame}
            style={{ marginTop: '1rem', background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '1rem 3rem', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(229, 90, 78, 0.3)' }}
          >
            <Play fill="currentColor" size={20} /> 게임 시작
          </motion.button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const sortedPlayers = [...players].sort((a, b) => b.total - a.total);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
          <Trophy size={32} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          최종 순위
        </h1>
        
        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
          {sortedPlayers.map((p, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={p.id}
              style={{
                background: index === 0 ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(217, 119, 6, 0.2))' : 'rgba(255,255,255,0.05)',
                border: index === 0 ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: index === 0 ? '#fbbf24' : '#9ca3af' }}>
                  {index + 1}등
                </span>
                <div>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{p.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {p.scores.join(' + ')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: index === 0 ? '#fbbf24' : '#fff' }}>
                {p.total}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { playClick(); setGameState('setup'); }}
          style={{ marginTop: '3rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '1rem 2rem', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <RotateCcw size={20} /> 처음으로
        </motion.button>
      </div>
    );
  }

  // playing state
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0.5rem 0' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '0.2rem', textAlign: 'center' }}>
        {currentPlayer?.name} 차례
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
        투척 {throwCount + 1} / 3
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

          <AnimatePresence>
            {result && (
              <motion.div
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
                  marginTop: '-5px',
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

        {/* 오른쪽: 버튼 */}
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
              WebkitTapHighlightColor: 'transparent',
              opacity: result ? 0.5 : 1,
              pointerEvents: result ? 'none' : 'auto'
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

      {/* 결과 메시지 */}
      <div style={{ position: 'absolute', bottom: '-20px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 30, pointerEvents: 'none' }}>
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
              {result.score}점! {getEmojiForScore(result.score)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 미니 스코어보드 */}
      <div style={{ marginTop: '5rem', width: '100%', maxWidth: '350px', display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
        {players.map((p, idx) => (
          <div key={p.id} style={{ 
            minWidth: '90px',
            background: idx === currentPlayerIndex ? 'rgba(229, 90, 78, 0.15)' : 'rgba(255,255,255,0.05)',
            border: idx === currentPlayerIndex ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'all 0.3s'
          }}>
            <div style={{ fontSize: '0.8rem', color: idx === currentPlayerIndex ? '#fff' : '#9ca3af', fontWeight: 'bold' }}>{p.name}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: idx === currentPlayerIndex ? 'var(--primary-color)' : '#fff', margin: '0.2rem 0' }}>{p.total}</div>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.scores[i] !== undefined ? '#4ade80' : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
