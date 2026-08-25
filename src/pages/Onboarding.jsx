import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wine, UtensilsCrossed } from 'lucide-react';
import { assetUrl } from '../utils/assets';

const onboardingData = [
  {
    id: 0,
    bg: assetUrl('assets/onboarding_1.webp'),
    title: '오마주',
    subtitle: 'OMAJU',
    desc: '오늘의 술, 완벽한 안주를 만나다',
    hasIcon: true
  },
  {
    id: 1,
    bg: assetUrl('assets/onboarding_2.webp'),
    title: '완벽한 페어링',
    subtitle: 'PERFECT PAIRING',
    desc: '당신의 취향에 맞는 최고의 안주 조합을\n오마주가 추천해 드립니다.',
    hasIcon: false
  },
  {
    id: 2,
    bg: assetUrl('assets/onboarding_3.webp'),
    title: '지나친 음주는',
    subtitle: 'WARNING',
    desc: '뇌졸중, 기억력 손상이나 치매를 유발합니다.\n임신 중 음주는 기형아 출생 위험을 높입니다.',
    hasIcon: false
  }
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleDragEnd = (e, { offset }) => {
    const swipe = offset.x;
    if (swipe < -50) {
      if (step < 2) setStep(step + 1);
    } else if (swipe > 50) {
      if (step > 0) setStep(step - 1);
    }
  };

  return (
    <div className="onboarding-container">
      <div 
        className="onboarding-bg" 
        style={{ 
          backgroundImage: `url(${onboardingData[step].bg})`, 
          transition: 'background-image 0.5s ease-in-out' 
        }} 
      />
      <div className="onboarding-overlay"></div>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          className="onboarding-content"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          style={{ width: '100%' }}
        >
          <div className="onboarding-header">
            {onboardingData[step].hasIcon && (
              <div className="logo-icon-container">
                <Wine size={40} className="logo-icon" />
                <UtensilsCrossed size={32} className="logo-icon secondary" />
              </div>
            )}
            <h1 className="logo-title" style={{ fontSize: step === 0 ? '3.5rem' : '2.2rem', color: step === 2 ? '#fca5a5' : '#ffffff' }}>
              {onboardingData[step].title}
            </h1>
            <h2 className="logo-subtitle">{onboardingData[step].subtitle}</h2>
            <p className="logo-tagline" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {onboardingData[step].desc}
            </p>
          </div>

          <div className="onboarding-footer">
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '1rem' }}>
              {step === 2 ? (
                <button 
                  className="btn-primary glass-panel"
                  onClick={() => navigate('/home')}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold' }}
                >
                  시작하기
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  다음으로
                </button>
              )}
              
              <button 
                onClick={() => navigate('/home')}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  background: 'transparent', 
                  color: '#9ca3af', 
                  border: 'none', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer',
                  visibility: step === 0 ? 'visible' : 'hidden'
                }}
              >
                건너뛰기
              </button>
            </div>
            
            <div className="pagination-dots" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[0, 1, 2].map((i) => (
                <span 
                  key={i} 
                  className={`dot ${step === i ? 'active' : ''}`}
                  onClick={() => setStep(i)}
                  style={{ 
                    cursor: 'pointer', 
                    width: step === i ? '20px' : '8px', 
                    height: '8px', 
                    borderRadius: '4px', 
                    background: step === i ? '#facc15' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                ></span>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
