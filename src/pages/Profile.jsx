import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    favoriteDrink: '',
    favoriteSnack: '',
    tolerance: '',
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem('omaju_user_profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
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

  const saveProfile = () => {
    localStorage.setItem('omaju_user_profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '1rem',
    marginBottom: '1rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.9rem',
    color: '#9ca3af',
    marginBottom: '0.5rem',
    fontWeight: 'bold'
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', paddingBottom: '120px', minHeight: '100vh' }}>
      <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>내 정보 (MY)</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        입력하신 정보는 오마주 AI가 맞춤형 추천을 할 때 참고합니다. 🤖
      </p>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <div>
          <label style={labelStyle}>이름 / 닉네임</label>
          <input 
            name="name" 
            value={profile.name} 
            onChange={handleChange} 
            style={inputStyle} 
            placeholder="예: 술요정, 김철수" 
          />
        </div>
        
        <div>
          <label style={labelStyle}>가장 좋아하는 주종</label>
          <input 
            name="favoriteDrink" 
            value={profile.favoriteDrink} 
            onChange={handleChange} 
            style={inputStyle} 
            placeholder="예: 소주, 화이트와인, 생맥주" 
          />
        </div>

        <div>
          <label style={labelStyle}>선호하는 안주 취향</label>
          <input 
            name="favoriteSnack" 
            value={profile.favoriteSnack} 
            onChange={handleChange} 
            style={inputStyle} 
            placeholder="예: 매콤한 탕, 가벼운 샐러드" 
          />
        </div>

        <div>
          <label style={labelStyle}>나의 주량</label>
          <input 
            name="tolerance" 
            value={profile.tolerance} 
            onChange={handleChange} 
            style={inputStyle} 
            placeholder="예: 소주 1병, 맥주 2캔" 
          />
        </div>

        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={saveProfile}
          style={{
            width: '100%',
            padding: '1rem',
            background: saved ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            color: saved ? '#000' : '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 'bold',
            marginTop: '1rem',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {saved ? '✓ 저장 완료!' : '저장하기'}
        </motion.button>
      </div>
    </div>
  );
}
