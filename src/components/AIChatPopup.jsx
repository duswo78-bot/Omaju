import { TextToSpeech } from '@capacitor-community/text-to-speech';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Send, Loader2, Star, Volume2, Wine, UtensilsCrossed, Gamepad2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import confetti from 'canvas-confetti';
import { aiState, subscribeToAI, runTurn } from '../services/aiService';
import { getSystemLlmProvider, probeSystemLlm, resetLlmProviderCache } from '../services/llm/getProvider';
import { LLM_MODES } from '../services/llm/types';
import { startListening, stopListening } from '../services/speechService';
import { playFanfare } from '../utils/audio';
import { assetUrl } from '../utils/assets';

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

function normalizeProbeReason(reason) {
  const value = String(reason || '').trim();
  if (!value) return 'unavailable';
  if (value.startsWith('ok:')) return value;
  if (value === 'downloadable' || value === 'downloading') return value;
  if (value.startsWith('failed') || value === 'unavailable' || value === 'unsupported' || value === 'probe_error') {
    return 'unavailable';
  }
  return value;
}

function ledStyle(mode, reason) {
  const safeReason = normalizeProbeReason(reason);
  if (mode === LLM_MODES.FULL || String(safeReason).startsWith('ok:')) {
    return {
      background: '#22c55e',
      boxShadow: '0 0 6px 2px rgba(34, 197, 94, 0.85)',
      title: safeReason === 'ok:rewriting'
        ? '온디바이스 Rewriting 활성 (S25+)'
        : '온디바이스 GenAI 활성',
    };
  }
  if (safeReason === 'downloadable' || safeReason === 'downloading') {
    return {
      background: '#f59e0b',
      boxShadow: '0 0 6px 2px rgba(245, 158, 11, 0.75)',
      title: 'AICore 모델 다운로드 중…',
    };
  }
  return {
    background: 'rgba(255,255,255,0.18)',
    boxShadow: 'none',
    title: `NLU+템플릿 (${safeReason || 'lite'})`,
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
  const [unlockedEasterEgg, setUnlockedEasterEgg] = useState(null);

  const shootCelebrationFirework = () => {
    try {
      if (navigator?.vibrate) {
        navigator.vibrate([80, 40, 100, 50, 180]);
      }
    } catch {}

    const colors = ['#e11d48', '#f59e0b', '#fbbf24', '#ffffff', '#ef4444', '#ffd700'];

    // 1. Center Big Bang
    confetti({
      particleCount: 140,
      spread: 100,
      startVelocity: 48,
      origin: { y: 0.48 },
      colors,
    });

    // 2. Left Cannon shot
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 80,
        startVelocity: 55,
        origin: { x: 0.05, y: 0.8 },
        colors,
      });
    }, 200);

    // 3. Right Cannon shot
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 80,
        startVelocity: 55,
        origin: { x: 0.95, y: 0.8 },
        colors,
      });
    }, 400);

    // 4. Golden Star & Glitter Shower from top
    setTimeout(() => {
      confetti({
        particleCount: 110,
        spread: 140,
        startVelocity: 35,
        origin: { y: 0.25 },
        gravity: 0.75,
        ticks: 300,
        shapes: ['star', 'circle'],
        colors: ['#ffd700', '#fbbf24', '#f59e0b', '#ffffff'],
      });
    }, 650);

    // 5. Final grand fountain finale
    setTimeout(() => {
      confetti({
        particleCount: 90,
        angle: 60,
        spread: 65,
        origin: { x: 0.12, y: 0.75 },
        colors,
      });
      confetti({
        particleCount: 90,
        angle: 120,
        spread: 65,
        origin: { x: 0.88, y: 0.75 },
        colors,
      });
    }, 950);
  };

  const triggerEasterEggModal = () => {
    setUnlockedEasterEgg({
      title: '🇨🇳 히든 주류 [중국 백주] 해금!',
      subtitle: '마오타이 · 연태고량주 · 양하대곡 & 10종 중화 안주',
      description: '숨겨진 미식의 세계를 발견하셨습니다! 이제 홈 화면에서 [🇨🇳 백주] 카테고리와 꿔바로우, 마라샹궈, 동파육 등 정통 페어링 안주를 만나보실 수 있습니다.',
      image: assetUrl('assets/drinks/baijiu.webp'),
    });
    try {
      shootCelebrationFirework();
      playFanfare();
    } catch {}
  };

  useEffect(() => {
    const handleUnlockEvent = () => triggerEasterEggModal();
    window.addEventListener('omaju:unlock-baijiu', handleUnlockEvent);
    return () => window.removeEventListener('omaju:unlock-baijiu', handleUnlockEvent);
  }, []);

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
      const rawReason = p.reason || (on ? 'ok' : 'unavailable');
      const reason = normalizeProbeReason(rawReason);
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
        } else if (state === 'failed' || String(state).startsWith('failed')) {
          setProbeReason('unavailable');
          aiState.probeReason = 'unavailable';
          setLlmMode(LLM_MODES.LITE);
        } else if (state === 'started' || state === 'progress') {
          setProbeReason('downloading');
          aiState.probeReason = 'downloading';
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

    if (/(?:백주|바이주|빠이주|중국)/i.test(userMessage)) {
      if (localStorage.getItem('omaju_unlocked_baijiu') !== 'true') {
        localStorage.setItem('omaju_unlocked_baijiu', 'true');
        window.dispatchEvent(new CustomEvent('omaju:unlock-baijiu'));
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          playFanfare();
        } catch {}
      }
    }

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

      <div className="chat-input-area" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={toggleMic}
          disabled={isThinking}
          aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
          style={{
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            flexShrink: 0,
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            border: 'none',
            background: isListening ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: isThinking ? 'not-allowed' : 'pointer',
            opacity: isThinking ? 0.5 : 1,
            transition: 'all 0.3s',
            padding: 0,
            boxSizing: 'border-box',
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
            minWidth: 0,
            height: '44px',
            borderRadius: '22px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            padding: '0 1rem',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim()}
          aria-label="메시지 전송"
          style={{
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            flexShrink: 0,
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            border: 'none',
            background: input.trim() ? '#4ade80' : 'rgba(255,255,255,0.1)',
            color: input.trim() ? '#14532d' : 'rgba(255,255,255,0.3)',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s',
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          <Send size={18} style={{ transform: 'translateX(1px)' }} />
        </button>
      </div>

      <PlaceFinderSheet
        open={placeFinder.open}
        onClose={() => setPlaceFinder((p) => ({ ...p, open: false }))}
        venueQuery={placeFinder.venueQuery}
      />

      {/* ===== 히든 주류 해금 화려한 팝업 오버레이 ===== */}
      <AnimatePresence>
        {unlockedEasterEgg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 200,
              background: 'rgba(10, 10, 20, 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.3, y: 70, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 260 }}
              style={{
                width: '100%',
                maxWidth: '350px',
                background: 'linear-gradient(145deg, rgba(40, 15, 30, 0.98), rgba(20, 10, 32, 0.99))',
                border: '2px solid rgba(251, 191, 36, 0.85)',
                boxShadow: '0 0 60px rgba(225, 29, 72, 0.65), 0 0 100px rgba(245, 158, 11, 0.45), 0 30px 60px rgba(0, 0, 0, 0.9)',
                borderRadius: '26px',
                padding: '2.2rem 1.6rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* 반짝이는 배경 빔 */}
              <div
                style={{
                  position: 'absolute',
                  top: '-60px',
                  left: '-60px',
                  right: '-60px',
                  height: '180px',
                  background: 'radial-gradient(circle, rgba(225, 29, 72, 0.6) 0%, rgba(245, 158, 11, 0.25) 40%, transparent 75%)',
                  pointerEvents: 'none',
                }}
              />

              {/* 뱃지 */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                style={{
                  background: 'linear-gradient(90deg, #f59e0b, #e11d48, #ffd700)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: '900',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  letterSpacing: '1.2px',
                  marginBottom: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 18px rgba(225, 29, 72, 0.65), 0 0 10px rgba(251, 191, 36, 0.6)',
                  zIndex: 2,
                }}
              >
                <Sparkles size={14} /> 🎆 SECRET UNLOCKED 🎆
              </motion.div>

              {/* 회전하는 황금/진홍빛 후광 (Sunburst Aura) & 이미지 */}
              <div style={{ position: 'relative', marginBottom: '1.3rem', zIndex: 2 }}>
                <motion.div
                  animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                  transition={{
                    rotate: { repeat: Infinity, duration: 10, ease: 'linear' },
                    scale: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
                  }}
                  style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '-25px',
                    right: '-25px',
                    bottom: '-25px',
                    borderRadius: '50%',
                    background: 'conic-gradient(from 0deg, rgba(245, 158, 11, 0.6), rgba(225, 29, 72, 0.7), rgba(255, 215, 0, 0.5), rgba(245, 158, 11, 0.6))',
                    filter: 'blur(16px)',
                    zIndex: 0,
                  }}
                />

                {/* 바이주 전용 생성 이미지 카드 */}
                <motion.div
                  animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  style={{
                    width: '145px',
                    height: '145px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '3px solid rgba(251, 191, 36, 0.95)',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.7), 0 0 15px rgba(225, 29, 72, 0.8)',
                    background: '#1e1b4b',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <img
                    src={unlockedEasterEgg.image}
                    alt="중국 백주"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </motion.div>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', margin: '0 0 0.4rem 0', zIndex: 2, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                {unlockedEasterEgg.title}
              </h2>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#fbbf24', marginBottom: '0.9rem', zIndex: 2 }}>
                {unlockedEasterEgg.subtitle}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.55', margin: '0 0 1.6rem 0', wordBreak: 'keep-all', zIndex: 2 }}>
                {unlockedEasterEgg.description}
              </p>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', width: '100%', zIndex: 2 }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    try {
                      confetti({ particleCount: 80, spread: 90, origin: { y: 0.65 } });
                    } catch {}
                    setUnlockedEasterEgg(null);
                    onClose?.();
                    navigate('/home');
                  }}
                  style={{
                    background: 'linear-gradient(90deg, #e11d48, #f59e0b, #ffd700)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '0.9rem 1rem',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(225, 29, 72, 0.55)',
                  }}
                >
                  🏠 홈 화면에서 확인하기
                </motion.button>
                <button
                  onClick={() => setUnlockedEasterEgg(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '14px',
                    padding: '0.7rem 1rem',
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontWeight: '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  계속 대화하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
