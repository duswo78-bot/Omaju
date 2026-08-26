import { TextToSpeech } from '@capacitor-community/text-to-speech';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Send, Loader2, Star, Volume2, Wine, UtensilsCrossed, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiState, subscribeToAI, runTurn } from '../services/aiService';
import { probeSystemLlm } from '../services/llm/getProvider';
import { LLM_MODES } from '../services/llm/types';
import { startListening, stopListening } from '../services/speechService';
import snacksData from '../data/snacks.json';
import PlaceSearchButtons from './PlaceSearchButtons';

function RecommendationCards({ recommendation, onOpenSnack }) {
  if (!recommendation) return null;
  const { alcohol, snack, game, reason } = recommendation;
  if (!alcohol && !snack && !game) return null;

  return (
    <div className="rec-card-stack">
      {reason && <div className="rec-card-reason">{reason}</div>}
      <div className="rec-card-row">
        {alcohol && (
          <div className="rec-card">
            <div className="rec-card-label"><Wine size={12} /> 술</div>
            <div className="rec-card-title">{alcohol.name_ko}</div>
            <div className="rec-card-meta">
              {alcohol.category}
              {typeof alcohol.abv === 'number' ? ` · ${alcohol.abv}%` : ''}
            </div>
            {alcohol.tags?.length > 0 && (
              <div className="rec-card-tags">{alcohol.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}</div>
            )}
          </div>
        )}
        {snack && (
          <button type="button" className="rec-card rec-card-button" onClick={() => onOpenSnack?.(snack)}>
            <div className="rec-card-label"><UtensilsCrossed size={12} /> 안주</div>
            <div className="rec-card-title">{snack.name_ko}</div>
            <div className="rec-card-meta">{snack.category || '안주'}</div>
            {snack.tags?.length > 0 && (
              <div className="rec-card-tags">{snack.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}</div>
            )}
            <div className="rec-card-cta">레시피 보기 →</div>
          </button>
        )}
      </div>
      {game && (
        <div className="rec-card rec-card-game">
          <div className="rec-card-label"><Gamepad2 size={12} /> 게임</div>
          <div className="rec-card-title">{game.name}</div>
          {game.description && <div className="rec-card-meta">{game.description}</div>}
        </div>
      )}
      {(snack || alcohol) && (
        <PlaceSearchButtons
          compact
          snackName={snack?.name_ko}
          drinkName={alcohol?.name_ko}
          snackCategory={snack?.category}
        />
      )}
    </div>
  );
}

export default function AIChatPopup({ onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, text: "안녕하세요! 오마주 AI입니다. 🍷\n오늘 기분이나 상황을 말씀해주시면 딱 맞는 안주와 술을 추천해드릴게요 ✨", isAi: true }
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingContext, setPendingContext] = useState(() => localStorage.getItem('omaju_pending_context') || '');
  const messagesEndRef = useRef(null);
  const turnInFlightRef = useRef(false);

  const [modelStatus, setModelStatus] = useState(aiState.statusMessage);
  const [isReady, setIsReady] = useState(aiState.isReady);
  const [llmMode, setLlmMode] = useState(aiState.mode);
  const [speechHint, setSpeechHint] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (aiState.isReady) {
      setIsReady(true);
      setModelStatus('');
    }
    setLlmMode(aiState.mode);

    // 챗 열릴 때 시스템 LLM(AICore) 가용 여부 재확인 → LED 반영
    probeSystemLlm({ force: true }).then((p) => {
      const mode = p.available ? LLM_MODES.FULL : LLM_MODES.LITE;
      aiState.mode = mode;
      aiState.lastProvider = p.provider || 'stub';
      setLlmMode(mode);
    }).catch(() => setLlmMode(LLM_MODES.LITE));

    const unsubscribe = subscribeToAI((data) => {
      const { type } = data;
      if (type === 'progress') {
        setModelStatus(aiState.statusMessage);
      } else if (type === 'ready') {
        setIsReady(true);
        setModelStatus('');
      } else if (type === 'error') {
        setModelStatus('AI 로드 실패. 기본 모드로 전환합니다.');
        setIsReady(true);
        setIsThinking(false);
      }
    });

    return () => {
      unsubscribe();
      window.speechSynthesis?.cancel();
      stopListening().catch(() => {});
    };
  }, []);

  const toggleMic = async () => {
    if (isThinking || turnInFlightRef.current) return;

    if (isListening) {
      const last = await stopListening();
      if (last) setInput((prev) => (prev?.trim() ? prev : last));
      setIsListening(false);
      return;
    }

    setIsListening(true);
    try {
      await startListening({
        language: 'ko-KR',
        onPartial: (text) => {
          if (text) setInput(text);
        },
        onFinal: (text) => {
          if (text) setInput(text);
        },
        onError: (message) => {
          console.warn('STT error:', message);
          setSpeechHint(typeof message === 'string' ? message : '음성 인식에 실패했습니다.');
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
      setSpeechHint('시스템 음성 인식 창에서 말씀해 주세요');
    } catch (err) {
      console.warn(err);
      setSpeechHint(err?.message || '마이크를 사용할 수 없습니다. 앱 권한을 확인해 주세요.');
      setIsListening(false);
    }
  };

  const stripForTts = (text) =>
    String(text || '')
      .replace(/\*\*/g, '')
      // 이모지·픽토그래프는 읽지 않음 (ZWJ 시퀀스 포함)
      .replace(/\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu, '')
      .replace(/[\uFE0F\u200D]/g, '')
      .replace(/[^\S\n]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const speak = async (text) => {
    const clean = stripForTts(text);
    if (!clean) return;
    await TextToSpeech.stop();
    await TextToSpeech.speak({
      text: clean,
      lang: 'ko-KR',
      rate: 1.0,
      volume: 1.0,
      pitch: 1.0,
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const clearPendingContext = () => {
    localStorage.removeItem('omaju_pending_context');
    setPendingContext('');
  };

  const handleSend = async (presetText) => {
    const userMessage = (presetText ?? input).trim();
    if (!userMessage || turnInFlightRef.current) return;
    turnInFlightRef.current = true;

    const newMsg = { id: Date.now(), text: userMessage, isAi: false };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsThinking(true);

    const opening = pendingContext || localStorage.getItem('omaju_pending_context') || '';
    const skipPrompt = Boolean(opening);

    let profile = null;
    try {
      const p = localStorage.getItem('omaju_user_profile');
      if (p) profile = JSON.parse(p);
    } catch {
      /* ignore */
    }

    if (opening) clearPendingContext();

    try {
      const result = await runTurn(userMessage, { opening, skipPrompt, profile });
      setLlmMode(result.mode || aiState.mode);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: result.answer,
          isAi: true,
          recommendation: result.recommendation || null,
          nlgSource: result.nlgSource,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: '잠시 문제가 생겼어요. 다시 한번 말씀해 주시겠어요?',
          isAi: true,
        },
      ]);
    } finally {
      turnInFlightRef.current = false;
      setIsThinking(false);
    }
  };

  const openSnackRecipe = (snack) => {
    const fullSnack = snacksData.find((s) => s.id === snack.id) || snack;
    onClose?.();
    navigate('/recipe', { state: { recipe: fullSnack } });
  };

  return (
    <motion.div
      className="ai-chat-popup-full"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      <div className="aurora-bg"></div>

      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div className="chat-header-ai-icon">
            <div className="chat-header-ai-icon-inner">
              <div style={{ position: 'absolute', top: '5px', right: '10px' }}>
                <Star size={6} fill="#f472b6" color="#f472b6" />
              </div>
              <span style={{
                fontWeight: 900,
                fontSize: '0.5rem',
                background: 'linear-gradient(135deg, #d8b4fe, #fbcfe8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px',
                marginTop: '4px'
              }}>OMAJU</span>
              <span style={{
                fontWeight: 800,
                fontSize: '0.55rem',
                background: 'linear-gradient(135deg, #e879f9, #f472b6, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '1px',
                marginTop: '2px'
              }}>AI</span>
              {/* FULL=LLM front/back 활성(녹색), LITE=NLU 파이프라인(소등) */}
              <div
                title={llmMode === 'FULL' ? '온디바이스 LLM Front/Back 활성' : 'NLU 규칙 파이프라인'}
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '7px',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: llmMode === 'FULL' ? '#22c55e' : 'rgba(255,255,255,0.18)',
                  boxShadow: llmMode === 'FULL'
                    ? '0 0 6px 2px rgba(34, 197, 94, 0.85)'
                    : 'none',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>오마주 AI</h2>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {llmMode === 'FULL' ? '온디바이스 LLM' : 'NLU 추천 파이프라인'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '0.5rem', color: '#fff', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {!isReady && (
        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontSize: '0.8rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 20 }}>
          <Loader2 size={12} className="spin" style={{ display: 'inline-block', marginRight: '5px' }} />
          {modelStatus}
        </div>
      )}

      {(isListening || speechHint) && (
        <div style={{ padding: '0.45rem 0.75rem', background: isListening ? 'rgba(239, 68, 68, 0.18)' : 'rgba(251, 191, 36, 0.15)', color: isListening ? '#fecaca' : '#fde68a', fontSize: '0.78rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 20 }}>
          {isListening ? (speechHint || '듣고 있어요… 다시 누르면 종료') : speechHint}
        </div>
      )}

      {pendingContext && (
        <div className="chat-context-banner">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: '0.15rem' }}>홈에서 고른 술 맥락</div>
            <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pendingContext}</div>
          </div>
          <button type="button" onClick={() => handleSend('이거에 어울리는 안주 추천해줘')} className="chat-context-action">
            바로 추천
          </button>
          <button type="button" onClick={clearPendingContext} className="chat-context-clear" aria-label="맥락 지우기">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="chat-messages">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={msg.isAi ? "chat-bubble-ai" : "chat-bubble-user"}
              style={msg.isAi && msg.recommendation ? { maxWidth: '95%' } : undefined}
            >
              {msg.text}
              {msg.isAi && (
                <button
                  onClick={() => speak(msg.text)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '8px', verticalAlign: 'middle', padding: 0 }}
                  title="읽어주기"
                >
                  <Volume2 size={16} color="rgba(255,255,255,0.7)" />
                </button>
              )}
              {msg.isAi && msg.recommendation && (
                <RecommendationCards recommendation={msg.recommendation} onOpenSnack={openSnackRecipe} />
              )}
            </motion.div>
          ))}

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="chat-bubble-ai"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af' }}
            >
              <Loader2 size={16} className="spin" />
              생각 중...
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <button
          type="button"
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={toggleMic}
          disabled={isThinking}
          aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
          style={{
            width: '44px', height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: isListening ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: isThinking ? 'not-allowed' : 'pointer',
            opacity: isThinking ? 0.5 : 1,
            transition: 'all 0.3s'
          }}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="예: 비 오는 날 어울리는 탕 메뉴"
          style={{
            flex: 1,
            height: '44px',
            borderRadius: '22px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            padding: '0 1rem',
            fontSize: '1rem',
            outline: 'none'
          }}
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          style={{
            width: '44px', height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: input.trim() ? '#4ade80' : 'rgba(255,255,255,0.1)',
            color: input.trim() ? '#14532d' : 'rgba(255,255,255,0.3)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s'
          }}
        >
          <Send size={18} style={{ marginLeft: '2px' }} />
        </button>
      </div>
    </motion.div>
  );
}
