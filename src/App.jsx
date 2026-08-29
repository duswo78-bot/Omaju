import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
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
  const [exitToast, setExitToast] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAiChatOpenRef = useRef(isAiChatOpen);
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    isAiChatOpenRef.current = isAiChatOpen;
  }, [isAiChatOpen]);

  useEffect(() => {
    const openAi = () => setIsAiChatOpen(true);
    window.addEventListener('omaju:open-ai-chat', openAi);
    return () => window.removeEventListener('omaju:open-ai-chat', openAi);
  }, []);

  // Android 하드웨어 뒤로가기 버튼 & 내비게이션 히스토리 연계
  useEffect(() => {
    let backListener = null;

    const handleBackAction = () => {
      // 1순위: AI 챗봇 팝업이 열려있으면 챗봇 모달부터 닫기
      if (isAiChatOpenRef.current) {
        setIsAiChatOpen(false);
        return;
      }

      // 2순위: 활성화된 모달/바텀시트가 있으면 닫기 이벤트 발행
      const activeSheet = document.querySelector('.place-finder-sheet.open, .modal-backdrop, .dialog-overlay');
      if (activeSheet) {
        window.dispatchEvent(new CustomEvent('omaju:close-modal'));
        return;
      }

      // 3순위: 서브 페이지/다른 메뉴에 있는 경우 -> 이전 화면 또는 홈으로 이동
      const currentPath = location.pathname;
      if (currentPath !== '/home' && currentPath !== '/') {
        navigate(-1);
        return;
      }

      // 4순위: 메인 홈 화면(/home)인 경우 -> 2초 내에 2번 누르면 앱 종료
      if (currentPath === '/home') {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          setExitToast(true);
          setTimeout(() => setExitToast(false), 2000);
        }
        return;
      }

      // 5순위: 온보딩 화면(/)인 경우 앱 종료
      if (currentPath === '/') {
        CapacitorApp.exitApp();
      }
    };

    try {
      CapacitorApp.addListener('backButton', () => {
        handleBackAction();
      }).then((listener) => {
        backListener = listener;
      });
    } catch (e) {
      console.warn('Capacitor backButton not available in web mode', e);
    }

    return () => {
      if (backListener?.remove) {
        backListener.remove();
      }
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        document.body.classList.add('keyboard-open');
      }
    };
    const handleFocusOut = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        document.body.classList.remove('keyboard-open');
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="status-bar-bg" />
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

      {/* Double Tap Exit Toast Notification */}
      {exitToast && (
        <div style={{
          position: 'fixed',
          bottom: '92px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(18, 18, 24, 0.94)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 99999,
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          뒤로 가기를 한 번 더 누르면 앱이 종료됩니다.
        </div>
      )}
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
