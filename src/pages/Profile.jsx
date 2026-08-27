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
    // AI 학습 필드(favoriteAlcohols 등)는 UI에 없으므로 기존 값 보존
    let prev = {};
    try {
      prev = JSON.parse(localStorage.getItem('omaju_user_profile') || '{}');
    } catch {
      prev = {};
    }
    localStorage.setItem(
      'omaju_user_profile',
      JSON.stringify({
        ...prev,
        ...profile,
        favoriteAlcohols: prev.favoriteAlcohols || [],
        favoriteFoods: prev.favoriteFoods || [],
        favoriteGames: prev.favoriteGames || [],
        dislikedAlcohols: prev.dislikedAlcohols || [],
        acceptCount: prev.acceptCount || 0,
        rejectCount: prev.rejectCount || 0,
      })
    );
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
    border: isSelected ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
    background: isSelected ? 'rgba(229, 90, 78, 0.1)' : 'rgba(255,255,255,0.05)',
    color: isSelected ? 'var(--primary-color)' : '#fff',
    fontWeight: isSelected ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', flex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>MY 오마주</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
          나만의 취향을 알려주세요.<br/>AI가 찰떡같이 맞춰서 추천해 드립니다! ✨
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem 1.5rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        {/* 기본 정보 섹션 */}
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>주종</label>
              <select name="favoriteDrink" value={profile.favoriteDrink} onChange={handleChange} style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}>
                <option value="">선택</option>
                <option value="소주">소주</option>
                <option value="맥주">맥주</option>
                <option value="막걸리">막걸리/전통주</option>
                <option value="와인">와인</option>
                <option value="위스키">위스키/보드카</option>
                <option value="하이볼">달달한 하이볼</option>
                <option value="논알콜">논알콜</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>주량</label>
              <select name="tolerance" value={profile.tolerance} onChange={handleChange} style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}>
                <option value="">선택</option>
                <option value="알쓰">알쓰 (반 잔)</option>
                <option value="가볍게">가볍게 (1~2잔)</option>
                <option value="보통">보통 (반 병)</option>
                <option value="잘마심">잘 마심 (1병 이상)</option>
                <option value="술고래">술고래 (무한)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>선호하는 안주 취향</label>
            <select name="favoriteSnack" value={profile.favoriteSnack} onChange={handleChange} style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}>
              <option value="">선택</option>
              <option value="국물류">뜨끈하고 얼큰한 국물류</option>
              <option value="볶음/구이">든든한 볶음/구이류</option>
              <option value="튀김/전">바삭한 튀김/전</option>
              <option value="해산물">깔끔한 해산물/회</option>
              <option value="마른안주">가벼운 마른안주/견과류</option>
              <option value="과일/디저트">상큼한 과일/디저트</option>
            </select>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={saveProfile}
          style={{
            width: '100%',
            padding: '1.2rem',
            background: saved ? '#4ade80' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
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
