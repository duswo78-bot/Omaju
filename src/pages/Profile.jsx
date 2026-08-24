import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playClick, playSuccess } from '../utils/audio';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    gender: '',
    mbti: '',
    favoriteDrink: '',
    favoriteSnack: '',
    tolerance: '',
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem('omaju_user_profile');
    if (savedProfile) {
      try {
        setProfile({ ...profile, ...JSON.parse(savedProfile) });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleGenderSelect = (gender) => {
    playClick();
    setProfile(prev => ({ ...prev, gender }));
    setSaved(false);
  };

  const saveProfile = () => {
    playClick();
    localStorage.setItem('omaju_user_profile', JSON.stringify(profile));
    setSaved(true);
    playSuccess();
    
    // 폭죽 효과
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4ade80', '#3b82f6', '#ec4899', '#facc15']
    });

    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1.2rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '1rem',
    transition: 'border-color 0.3s, background 0.3s',
    outline: 'none',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#9ca3af',
    marginBottom: '0.5rem',
    fontWeight: '600'
  };

  const sectionStyle = {
    marginBottom: '1.8rem',
  };

  const genderBtnStyle = (isSelected) => ({
    flex: 1,
    padding: '0.8rem',
    borderRadius: '12px',
    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
    background: isSelected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
    color: isSelected ? 'var(--primary)' : '#fff',
    fontWeight: isSelected ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', paddingBottom: '120px', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>MY 오마주</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
          나만의 취향을 알려주세요.<br/>AI가 찰떡같이 맞춰서 추천해 드립니다! ✨
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem 1.5rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        {/* 기본 정보 섹션 */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>👤</span> 기본 정보
          </h2>
          
          <div style={sectionStyle}>
            <label style={labelStyle}>이름 / 닉네임</label>
            <input 
              name="name" 
              value={profile.name} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="불리고 싶은 이름을 적어주세요" 
            />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>성별</label>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <motion.button whileTap={{ scale: 0.95 }} style={genderBtnStyle(profile.gender === 'male')} onClick={() => handleGenderSelect('male')}>남성 👨</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} style={genderBtnStyle(profile.gender === 'female')} onClick={() => handleGenderSelect('female')}>여성 👩</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} style={genderBtnStyle(profile.gender === 'secret')} onClick={() => handleGenderSelect('secret')}>비공개 👻</motion.button>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>MBTI</label>
            <input 
              name="mbti" 
              value={profile.mbti} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase().slice(0,4).replace(/[^A-Z]/g, '');
                handleChange({ target: { name: 'mbti', value: val } });
              }} 
              style={{...inputStyle, textTransform: 'uppercase', letterSpacing: '2px'}} 
              placeholder="예: ENFP"
              maxLength={4}
            />
          </div>
        </div>

        {/* 음주 취향 섹션 */}
        <div>
          <h2 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🍸</span> 음주 취향
          </h2>

          <div style={sectionStyle}>
            <label style={labelStyle}>가장 좋아하는 주종</label>
            <input 
              name="favoriteDrink" 
              value={profile.favoriteDrink} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="예: 소주, 달달한 하이볼" 
            />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>선호하는 안주 취향</label>
            <input 
              name="favoriteSnack" 
              value={profile.favoriteSnack} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="예: 매콤한 국물, 가벼운 과일" 
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>나의 주량</label>
            <input 
              name="tolerance" 
              value={profile.tolerance} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="예: 소주 1병, 맥주 2캔" 
            />
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={saveProfile}
          style={{
            width: '100%',
            padding: '1.2rem',
            background: saved ? 'var(--primary)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: saved ? '#000' : '#fff',
            border: 'none',
            borderRadius: '16px',
            fontSize: '1.1rem',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: saved ? '0 0 20px rgba(74,222,128,0.5)' : '0 10px 20px rgba(139,92,246,0.3)',
            transition: 'all 0.3s'
          }}
        >
          {saved ? '✨ 내 취향 저장 완료! ✨' : '저장하기'}
        </motion.button>
      </div>
    </div>
  );
}
