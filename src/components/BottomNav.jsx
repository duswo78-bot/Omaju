import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, User, Dices, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav({ toggleAiChat }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', path: '/home', icon: <Home size={24} />, label: '홈' },
    { id: 'game', path: '/game', icon: <Dices size={24} />, label: '술게임' },
    { id: 'favorites', path: '/favorites', icon: <Heart size={24} />, label: '찜' },
    { id: 'profile', path: '/profile', icon: <User size={24} />, label: 'MY' }
  ];

  return (
    <div className="bottom-nav-container glass-panel">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
            {isActive && <div className="active-indicator" />}
          </button>
        );
      })}

      {/* Floating AI Button at Far Right */}
      <motion.button 
        className="nav-ai-button" 
        onClick={toggleAiChat}
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <div className="nav-ai-button-inner">
          <div style={{ position: 'absolute', top: '7px', right: '16px' }}>
            <Star size={10} fill="#f472b6" color="#f472b6" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1', marginTop: '5px' }}>
            <span className="ai-text-omaju">OMAJU</span>
            <span className="ai-text-ai">AI</span>
          </div>
          <div style={{ position: 'absolute', bottom: '9px', left: '12px' }}>
            <Star size={7} fill="#a855f7" color="#a855f7" />
          </div>
        </div>
      </motion.button>
    </div>
  );
}
