import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Recommendation from './pages/Recommendation';
import Recipe from './pages/Recipe';
import Favorites from './pages/Favorites';
import Game from './pages/Game';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import BottomNav from './components/BottomNav';
import AIChatPopup from './components/AIChatPopup';
import { DrinkProvider } from './context/DrinkContext';
import { AnimatePresence } from 'framer-motion';

// 백그라운드 AI 워커 초기화 (앱 실행 시 즉시 모델 다운로드 시작)
import './services/aiService';


function AppContent() {
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const openAi = () => setIsAiChatOpen(true);
    window.addEventListener('omaju:open-ai-chat', openAi);
    return () => window.removeEventListener('omaju:open-ai-chat', openAi);
  }, []);

  return (
    <div className="app-container">
      <main className="main-content" style={{ paddingBottom: location.pathname === '/' ? 0 : 80 }}>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          <Route path="/recommendation" element={<Recommendation />} />
          <Route path="/recipe" element={<Recipe />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/game" element={<Game />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <Routes>
        <Route path="/" element={null} />
        <Route path="*" element={<BottomNav toggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)} />} />
      </Routes>
      
      {/* AI Chat Popup (Global Modal) */}
      <AnimatePresence>
        {isAiChatOpen && <AIChatPopup onClose={() => setIsAiChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <DrinkProvider>
      <Router basename={(import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'}>
        <AppContent />
      </Router>
    </DrinkProvider>
  );
}

export default App;
