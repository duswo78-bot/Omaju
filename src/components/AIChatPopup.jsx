import { TextToSpeech } from '@capacitor-community/text-to-speech';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Send, Loader2, Star, Volume2, Wine, UtensilsCrossed, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { aiState, subscribeToAI, runTurn } from '../services/aiService';
import { getSystemLlmProvider, probeSystemLlm, resetLlmProviderCache } from '../services/llm/getProvider';
import { LLM_MODES } from '../services/llm/types';
import { startListening, stopListening } from '../services/speechService';

/** 생각 중… 회전 멘트 (3초마다) — 진짜 고심하는 느낌 */
const THINKING_LINES = [
  '오늘의 한 잔, 머릿속에서 시음 중…',
  '기분 온도계 확인하는 중…',
  '술장고 문 열고 슬쩍 보는 중…',
  '안주랑 케미 계산기 돌리는 중…',
  '“이건 좀 과한가?” 고민 중…',
  '취향 레이더 미세 조정 중…',
  '짠— 하기 좋은 조합 고르는 중…',
  '가볍게? 진하게? 저울질 중…',
  '혀가 기억할 페어링 찾는 중…',
  '오마주 감 작동 중… 거의 다 왔어요',
];

const POLISHING_LINES = [
  '문장에 여운 살짝 입히는 중…',
  '말투만 한 스푼 더 부드럽게…',
  '온디바이스가 문장 다듬는 중…',
  '추천은 확정, 표현만 폴리싱…',
];

function pickThinkingLine(prev) {
  if (THINKING_LINES.length <= 1) return THINKING_LINES[0];
  let next = THINKING_LINES[Math.floor(Math.random() * THINKING_LINES.length)];
  // 바로 이전과 겹치면 한 번 더
  if (next === prev) {
    next = THINKING_LINES[(THINKING_LINES.indexOf(prev) + 1) % THINKING_LINES.length];
  }
  return next;
}

function ledStyle(mode, reason) {
  if (mode === LLM_MODES.FULL || String(reason).startsWith('ok:')) {
    return {
      background: '#22c55e',
      boxShadow: '0 0 6px 2px rgba(34, 197, 94, 0.85)',
      title: reason === 'ok:rewriting'
        ? '온디바이스 Rewriting 활성 (S25+)'
        : '온디바이스 GenAI 활성',
    };
  }
  if (reason === 'downloadable' || reason === 'downloading' || String(reason).startsWith('download')) {
    return {
      background: '#f59e0b',
      boxShadow: '0 0 6px 2px rgba(245, 158, 11, 0.75)',
      title: 'AICore 모델 다운로드 중…',
    };
  }
  return {
    background: 'rgba(255,255,255,0.18)',
    boxShadow: 'none',
    title: `NLU+템플릿 (${reason || 'lite'})`,
  };
}
import snacksData from '../data/snacks.json';
import PlaceSearchButtons from './PlaceSearchButtons';
import PlaceFinderSheet from './PlaceFinderSheet';

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
    {
      id: 1,
      text: "안녕하세요! 오마주 AI 바텐더입니다 🍷\n\n술 추천, 안주 추천, 술게임은 물론\n그냥 가볍게 대화도 가능합니다.\n\n예시:\n• 혼술 추천\n• 비 오는 날 어울리는 술\n• 회식 안주 추천\n• 기분 좋은 날 마실 와인\n• 오늘 뭐 마시지?\n\n편하게 말씀해주세요 😊",
      isAi: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState(() => THINKING_LINES[0]);
  const [polishLabel, setPolishLabel] = useState(() => POLISHING_LINES[0]);
  const [hasPartialAnswer, setHasPartialAnswer] = useState(false);
  const pendingAiMsgIdRef = useRef(null);
  const [pendingContext, setPendingContext] = useState(() => localStorage.getItem('omaju_pending_context') || '');
  const messagesEndRef = useRef(null);
  const turnInFlightRef = useRef(false);

  const [modelStatus, setModelStatus] = useState(aiState.statusMessage);
  const [isReady, setIsReady] = useState(aiState.isReady);
  const [llmMode, setLlmMode] = useState(aiState.mode);
  const [probeReason, setProbeReason] = useState(aiState.probeReason || 'init');
  const [speechHint, setSpeechHint] = useState('');
  const speechHintTimerRef = useRef(null);
  const [placeFinder, setPlaceFinder] = useState({ open: false, venueQuery: '', label: '' });

  const flashSpeechHint = (msg, ms = 2200) => {
    if (speechHintTimerRef.current) clearTimeout(speechHintTimerRef.current);
    setSpeechHint(msg || '');
    if (!msg) return;
    speechHintTimerRef.current = setTimeout(() => setSpeechHint(''), ms);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // 생각 중: 3초마다 센스 있는 멘트 교체
  useEffect(() => {
    if (!isThinking || hasPartialAnswer) return undefined;
    setThinkingLabel(pickThinkingLine(''));
    const timer = setInterval(() => {
      setThinkingLabel((prev) => pickThinkingLine(prev));
    }, 3000);
    return () => clearInterval(timer);
  }, [isThinking, hasPartialAnswer]);

  // 초안 후 다듬기: 3초마다 폴리싱 멘트
  useEffect(() => {
    if (!isThinking || !hasPartialAnswer) return undefined;
    setPolishLabel(POLISHING_LINES[0]);
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % POLISHING_LINES.length;
      setPolishLabel(POLISHING_LINES[i]);
    }, 3000);
    return () => clearInterval(timer);
  }, [isThinking, hasPartialAnswer]);

  useEffect(() => {
    if (aiState.isReady) {
      setIsReady(true);
      setModelStatus('');
    }
    setLlmMode(aiState.mode);
    setProbeReason(aiState.probeReason || 'init');

    let cancelled = false;
    let pollTimer = null;
    let downloadHandle = null;

    const applyProbe = (p) => {
      if (cancelled || !p) return;
      const caps = p.capabilities || {};
      const on =
        p.available || caps.prompt === 'available' || caps.rewriting === 'available';
      const mode = on ? LLM_MODES.FULL : LLM_MODES.LITE;
      const reason = p.reason || (on ? 'ok' : 'unavailable');
      aiState.mode = mode;
      aiState.lastProvider = p.provider || 'stub';
      aiState.probeReason = reason;
      aiState.capabilities = caps;
      setLlmMode(mode);
      setProbeReason(reason);
      return reason;
    };

    const refreshProbe = () =>
      probeSystemLlm({ force: true })
        .then(applyProbe)
        .catch(() => applyProbe({ available: false, reason: Capacitor.isNativePlatform() ? 'probe_error' : 'web' }));

    resetLlmProviderCache();
    refreshProbe().then((reason) => {
      if (cancelled) return;
      // 다운로드 대기 중이면 주기적 재probe
      if (reason === 'downloadable' || reason === 'downloading') {
        pollTimer = setInterval(() => {
          refreshProbe().then((r) => {
            if (r === 'ok' && pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          });
        }, 4000);
      }
    });

    getSystemLlmProvider().then((provider) => {
      if (cancelled || !provider?.addDownloadListener) return;
      provider.addDownloadListener((ev) => {
        const state = ev?.state || '';
        if (state === 'completed') {
          resetLlmProviderCache();
          refreshProbe();
        } else if (state.startsWith('failed')) {
          setProbeReason(state);
        } else if (state === 'started' || state === 'progress') {
          setProbeReason('downloading');
        }
      }).then((h) => { downloadHandle = h; }).catch(() => {});
    }).catch(() => {});

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
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (speechHintTimerRef.current) clearTimeout(speechHintTimerRef.current);
      downloadHandle?.remove?.();
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
      flashSpeechHint('');
      return;
    }

    setIsListening(true);
    // await 전에 잠깐 표시 → 인식 종료 시 즉시 제거 (이전엔 await 뒤에 세팅돼 계속 남았음)
    flashSpeechHint('시스템 음성 인식 창에서 말씀해 주세요', 4000);
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
          setIsListening(false);
          flashSpeechHint(
            typeof message === 'string' ? message : '음성 인식에 실패했습니다.',
            2500
          );
        },
        onEnd: () => {
          setIsListening(false);
          flashSpeechHint('');
        },
      });
      setIsListening(false);
      flashSpeechHint('');
    } catch (err) {
      console.warn(err);
      setIsListening(false);
      flashSpeechHint(err?.message || '마이크를 사용할 수 없습니다. 앱 권한을 확인해 주세요.', 2500);
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
    setThinkingLabel(pickThinkingLine(''));
    setPolishLabel(POLISHING_LINES[0]);
    setHasPartialAnswer(false);
    pendingAiMsgIdRef.current = null;

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
      const result = await runTurn(userMessage, {
        opening,
        skipPrompt,
        profile,
        onPartial: ({ answer, recommendation, nlgSource, pendingPolish }) => {
          const id = pendingAiMsgIdRef.current || Date.now();
          pendingAiMsgIdRef.current = id;
          setHasPartialAnswer(true);
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === id);
            const msg = {
              id,
              text: answer,
              isAi: true,
              recommendation: recommendation || null,
              nlgSource,
              polishing: Boolean(pendingPolish),
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...msg };
              return next;
            }
            return [...prev, msg];
          });
        },
      });
      setLlmMode(result.mode || aiState.mode);
      if (result.probeReason) setProbeReason(result.probeReason);

      const finalId = pendingAiMsgIdRef.current || Date.now();
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === finalId);
        const msg = {
          id: finalId,
          text: result.answer,
          isAi: true,
          recommendation: result.recommendation || null,
          placeSearch: result.placeSearch || null,
          nlgSource: result.nlgSource,
          polishing: false,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...msg };
          return next;
        }
        return [...prev, msg];
      });

      if (result.placeSearch?.venueQuery) {
        setPlaceFinder({
          open: true,
          venueQuery: result.placeSearch.venueQuery,
          label: result.placeSearch.label || `근처 ${result.placeSearch.venueQuery}`,
        });
      }
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
      setHasPartialAnswer(false);
      pendingAiMsgIdRef.current = null;
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
            </div>
            {(() => {
              const led = ledStyle(llmMode, probeReason);
              return (
                <div
                  title={led.title}
                  aria-label={led.title}
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    left: -1,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: led.background,
                    boxShadow: led.boxShadow,
                    border: '1.5px solid rgba(17,17,17,0.95)',
                    zIndex: 3,
                  }}
                />
              );
            })()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>오마주 AI</h2>
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

      {speechHint && (
        <div style={{ padding: '0.45rem 0.75rem', background: isListening ? 'rgba(239, 68, 68, 0.18)' : 'rgba(251, 191, 36, 0.15)', color: isListening ? '#fecaca' : '#fde68a', fontSize: '0.78rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 20 }}>
          {speechHint}
        </div>
      )}

      {pendingContext && (() => {
        const match = pendingContext.match(/지금 테이블에\s+(.+?)(?:이|가)\s+있어요/);
        const drinkName = match ? match[1].trim() : '';
        return (
          <div className="chat-context-banner">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🍷</span>
                <span style={{ fontWeight: 600, color: '#fbcfe8' }}>선택한 술</span>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {drinkName ? `${drinkName}에 어울리는 안주 찾기` : pendingContext}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSend(drinkName ? `${drinkName}에 어울리는 안주 추천해줘` : '이거에 어울리는 안주 추천해줘')}
              className="chat-context-action"
            >
              안주 추천받기
            </button>
            <button type="button" onClick={clearPendingContext} className="chat-context-clear" aria-label="선택 취소">
              <X size={14} />
            </button>
          </div>
        );
      })()}

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
              {msg.isAi && msg.polishing && isThinking && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Loader2 size={12} className="spin" />
                  {polishLabel}
                </div>
              )}
              {msg.isAi && msg.recommendation && (
                <RecommendationCards recommendation={msg.recommendation} onOpenSnack={openSnackRecipe} />
              )}
              {msg.isAi && msg.placeSearch?.venueQuery && (
                <PlaceSearchButtons
                  compact
                  venueQuery={msg.placeSearch.venueQuery}
                  label={msg.placeSearch.label || `근처 ${msg.placeSearch.venueQuery} 찾기`}
                />
              )}
            </motion.div>
          ))}

          {isThinking && !hasPartialAnswer && (
            <motion.div
              key={thinkingLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="chat-bubble-ai"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af' }}
            >
              <Loader2 size={16} className="spin" />
              {thinkingLabel}
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

      <PlaceFinderSheet
        open={placeFinder.open}
        onClose={() => setPlaceFinder((p) => ({ ...p, open: false }))}
        venueQuery={placeFinder.venueQuery}
      />
    </motion.div>
  );
}
