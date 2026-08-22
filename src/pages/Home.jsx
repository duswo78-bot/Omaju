import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CupSoda, Heart, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls, useMotionValue, useSpring } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import confetti from 'canvas-confetti';
import { useDrinkContext, mixCombinations, nonAlcoholicItems } from '../context/DrinkContext';
import { buildPendingContext } from '../data/drinkIdMap';
import { assetUrl } from '../utils/assets';

function DrinkCard({ drink, handleDragStart, handleDrag, handleDragEnd, handleSelect, isDefaultDrink, isFavorite, toggleFavorite }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 500, damping: 30 });
  const springY = useSpring(y, { stiffness: 500, damping: 30 });
  
  const cardRef = useRef(null);
  const isDragging = useRef(false);
  const isPressing = useRef(false);
  const pressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0, scrollY: 0 });
  const startRect = useRef(null);
  const currentTouchY = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const startAutoScroll = () => {
      const scrollStep = () => {
        if (!isDragging.current || currentTouchY.current === null) {
          scrollRef.current = null;
          return;
        }
        
        const touchY = currentTouchY.current;
        const edgeSize = 120; // 상하단 120px 이내면 스크롤
        const speed = 15;
        
        if (touchY < edgeSize) {
          window.scrollBy(0, -speed);
        } else if (touchY > window.innerHeight - edgeSize) {
          window.scrollBy(0, speed);
        }
        
        scrollRef.current = requestAnimationFrame(scrollStep);
      };
      if (!scrollRef.current) {
        scrollRef.current = requestAnimationFrame(scrollStep);
      }
    };

    const stopAutoScroll = () => {
      if (scrollRef.current) {
        cancelAnimationFrame(scrollRef.current);
        scrollRef.current = null;
      }
    };

    const handleTouchStart = (e) => {
      if (e.target.closest('.favorite-btn')) return;

      isPressing.current = true;
      isDragging.current = false;
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY, scrollY: window.scrollY };
      startRect.current = el.getBoundingClientRect(); // 초기 박스 캡처
      currentTouchY.current = touch.clientY;

      pressTimer.current = setTimeout(() => {
        if (isPressing.current) {
          isDragging.current = true;
          handleDragStart(e);
          if (navigator.vibrate) navigator.vibrate(50);
          el.style.transform = "scale(1.05)";
          el.style.zIndex = "100"; // 드래그 시 맨 위로
          // document.body.style.overflow = "hidden"; // 자동 스크롤을 위해 제거
          startAutoScroll();
        }
      }, 500); 
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      currentTouchY.current = touch.clientY;

      if (isDragging.current) {
        if (e.cancelable) e.preventDefault();
        const scrollDiff = window.scrollY - startPos.current.scrollY;
        x.set(touch.clientX - startPos.current.x);
        y.set(touch.clientY - startPos.current.y + scrollDiff);
        handleDrag(e, { point: { x: touch.clientX, y: touch.clientY } }, drink);
      } else if (isPressing.current) {
        const dx = Math.abs(touch.clientX - startPos.current.x);
        const dy = Math.abs(touch.clientY - startPos.current.y);
        // 미세한 떨림 임계치를 25px로 완화 (손가락 면적 대응)
        if (dx > 25 || dy > 25) {
          clearTimeout(pressTimer.current);
          isPressing.current = false;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (e.target.closest('.favorite-btn')) return;

      clearTimeout(pressTimer.current);
      isPressing.current = false;
      el.style.transform = ""; 
      el.style.zIndex = "50"; // z-index 원상복구
      stopAutoScroll();

      if (isDragging.current) {
        isDragging.current = false;
        
        const touch = e.changedTouches ? e.changedTouches[0] : null;
        if (touch && startRect.current) {
          // DOM의 getBoundingClientRect에 의존하지 않고 시작점 + 이동거리를 통해 "수학적으로 완벽한" 드래그 위치 계산
          const dx = touch.clientX - startPos.current.x;
          const dy = touch.clientY - startPos.current.y;
          const rect = {
            left: startRect.current.left + dx,
            top: startRect.current.top + dy,
            width: startRect.current.width,
            height: startRect.current.height
          };

          x.set(0);
          y.set(0);
          handleDragEnd(e, { point: { x: touch.clientX, y: touch.clientY }, rect }, drink);
        } else {
          x.set(0);
          y.set(0);
        }
      } else {
        const touch = e.changedTouches ? e.changedTouches[0] : null;
        if (touch) {
           const dx = Math.abs(touch.clientX - startPos.current.x);
           const dy = Math.abs(touch.clientY - startPos.current.y);
           if (dx < 10 && dy < 10) {
             handleSelect(drink);
           }
        }
      }
    };

    const handleMouseDown = (e) => {
      if (e.target.closest('.favorite-btn')) return;

      isDragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY, scrollY: window.scrollY };
      startRect.current = el.getBoundingClientRect(); // 초기 박스 캡처
      currentTouchY.current = e.clientY;
      handleDragStart(e);
      el.style.transform = "scale(1.05)";
      el.style.zIndex = "100";
      startAutoScroll();
      
      const onMouseMove = (moveEvent) => {
        currentTouchY.current = moveEvent.clientY;
        if (isDragging.current) {
          const scrollDiff = window.scrollY - startPos.current.scrollY;
          x.set(moveEvent.clientX - startPos.current.x);
          y.set(moveEvent.clientY - startPos.current.y + scrollDiff);
          handleDrag(moveEvent, { point: { x: moveEvent.clientX, y: moveEvent.clientY } }, drink);
        }
      };
      
      const onMouseUp = (upEvent) => {
        isDragging.current = false;
        stopAutoScroll();
        
        // 수학적으로 정확한 위치 계산
        const dx = upEvent.clientX - startPos.current.x;
        const dy = upEvent.clientY - startPos.current.y;
        const rect = startRect.current ? {
          left: startRect.current.left + dx,
          top: startRect.current.top + dy,
          width: startRect.current.width,
          height: startRect.current.height
        } : el.getBoundingClientRect();
        
        x.set(0);
        y.set(0);
        el.style.transform = "";
        el.style.zIndex = "50";
        
        handleDragEnd(upEvent, { point: { x: upEvent.clientX, y: upEvent.clientY }, rect }, drink);
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        const dist = Math.abs(upEvent.clientX - startPos.current.x) + Math.abs(upEvent.clientY - startPos.current.y);
        if (dist < 10) {
          handleSelect(drink);
        }
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
    el.addEventListener('mousedown', handleMouseDown);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('mousedown', handleMouseDown);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      id={`drink-${drink.id}`}
      style={{
        x: springX, 
        y: springY,
        position: 'relative',
        height: '160px',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 50,
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
      className="glass-panel"
    >
      {/* 꽉 차는 배경 이미지 */}
      <img src={drink.imagePath} alt={drink.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }} draggable={false} />
      
      {/* 하단 그라데이션 */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.8) 100%)', zIndex: 1, pointerEvents: 'none' }} />

      {/* 하트 아이콘 (조합 주종만) */}
      {!isDefaultDrink(drink.id) && (
        <div 
          className="favorite-btn"
          style={{ position: 'absolute', top: '12px', right: '12px', cursor: 'pointer', zIndex: 80, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '50%' }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(drink.id);
          }}
        >
          <Heart 
            size={18} 
            color={isFavorite(drink.id) ? '#ef4444' : '#fff'}
            fill={isFavorite(drink.id) ? '#ef4444' : 'transparent'}
          />
        </div>
      )}

      {/* 글래스모피즘 텍스트 태그 */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, left: 0, right: 0, 
        padding: '0.8rem 0',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none'
      }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
          {drink.name}
        </span>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { drinks, addDrink, removeDrink, toggleFavorite, isFavorite, isDefaultDrink } = useDrinkContext();
  
  const [mixAnim, setMixAnim] = useState(null); // { color, imagePath, name, isValid }
  const [nonAlcPos, setNonAlcPos] = useState({ x: 0, y: 0 });
  const [catchCount, setCatchCount] = useState(0);
  const [showNonAlcModal, setShowNonAlcModal] = useState(false);
  const [trashHover, setTrashHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [debugMsg, setDebugMsg] = useState("Debug: Ready"); // 디버그 상태 추가
  const trashRef = useRef(null);
  
  // 드래그와 단순 클릭을 구분하기 위한 레퍼런스
  const isDragAction = useRef(false);

  const handleSelect = (drink) => {
    // 드래그가 발생했다면 클릭(안주 추천 페이지 이동)을 무시함
    if (isDragAction.current) return;
    localStorage.setItem('omaju_pending_context', buildPendingContext(drink));
    navigate('/recommendation', { state: { selectedDrink: drink } });
  };

  const handleDragStart = () => {
    isDragAction.current = true;
    setIsDragging(true);
    setDebugMsg("Drag started");
  };

  const handleDragEnd = (event, info, dragDrink) => {
    setIsDragging(false);
    setTrashHover(false);

    // 드래그 종료 후 약간의 딜레이를 두어 클릭 이벤트가 발생하는 것을 방지
    setTimeout(() => {
      isDragAction.current = false;
    }, 100);

    const { point, rect } = info;
    
    // 드래그 중인 카드의 정확한 중심점 (손가락 위치가 아니라 카드 자체의 중심!)
    const dragCX = rect.left + rect.width / 2;
    const dragCY = rect.top + rect.height / 2;

    // 휴지통 충돌 체크 (카드의 중심이 휴지통 영역에 들어갔는지)
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      if (
        dragCX >= trashRect.left && dragCX <= trashRect.right &&
        dragCY >= trashRect.top && dragCY <= trashRect.bottom
      ) {
        removeDrink(dragDrink.id);
        return;
      }
    }

    let closestDrink = null;
    let closestRect = null;
    let minDistance = Infinity;
    let debugTargets = ""; // 각 타겟과의 거리 로그용

    drinks.forEach(targetDrink => {
      if (targetDrink.id === dragDrink.id) return;

      const targetElement = document.getElementById(`drink-${targetDrink.id}`);
      if (!targetElement) {
        debugTargets += `${targetDrink.id}:null `;
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      // 두 카드의 "중심점" 간의 거리 계산
      const distance = Math.sqrt(
        Math.pow(dragCX - targetCenterX, 2) + 
        Math.pow(dragCY - targetCenterY, 2)
      );

      debugTargets += `${targetDrink.id}:${Math.round(distance)}px `;

      // 카드의 중심이 타겟 카드 내부에 있는지 체크 (완전 겹침)
      const isInside = dragCX >= targetRect.left && dragCX <= targetRect.right &&
                       dragCY >= targetRect.top && dragCY <= targetRect.bottom;

      // 중심점 거리가 150px 이내면 카드가 상당히 겹쳤다고 판정
      if (isInside || distance <= 150) {
        if (distance < minDistance) {
          minDistance = distance;
          closestDrink = targetDrink;
          closestRect = targetRect;
        }
      }
    });

    if (closestDrink) {
      // id를 사전순으로 정렬하여 앞뒤 순서 상관없이 조합되도록 처리
      const sortedKey = [dragDrink.id, closestDrink.id].sort().join('_');
      const mixResult = mixCombinations[sortedKey];

      const originX = dragCX / window.innerWidth;
      const originY = dragCY / window.innerHeight;

      if (mixResult) {
        setMixAnim({ color: mixResult.color, imagePath: mixResult.imagePath, name: mixResult.name, isValid: true });
        
        // 두 카드가 만난 지점에서 팡! 터지는 파티클 애니메이션
        confetti({
          particleCount: 100,
          spread: 80,
          startVelocity: 40,
          origin: { x: originX, y: originY },
          colors: [mixResult.color || '#facc15', '#ffffff', '#fbbf24', '#f43f5e'],
          zIndex: 9999
        });

        setTimeout(() => {
          setMixAnim(null);
          if (!drinks.find(d => d.id === mixResult.id)) {
            addDrink(mixResult);
          }
        }, 1800);
      } else {
        const messages = [
          '엥? 가능해? ❓', 
          '진심이세요...? 🤢', 
          '내일이 없는 조합이네요 💀', 
          '헐~ 😵‍💫',
          '이건 좀 선 넘었네요 🛑',
          '위장이 파업을 선언합니다 🏳️',
          '미각 포기 각서 쓰셨나요? 📝',
          '혼종의 탄생인가요... 🦄',
          '이 조합은 법으로 금지해야 🚓'
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        
        setMixAnim({ color: '#ef4444', imagePath: assetUrl('assets/drinks/question.png'), name: randomMsg, isValid: false });

        // 폭죽 효과 제거, 대신 화면 렌더링 시 Framer Motion으로 큰 물음표 애니메이션 처리
        setTimeout(() => setMixAnim(null), 2300);
      }
    }
    
    // 디버그 결과 상세화 (모바일에서 보일 수 있도록 축약)
    setDebugMsg(`Drag(${Math.round(dragCX)},${Math.round(dragCY)}) | Targets: ${debugTargets} | Min:${closestDrink ? closestDrink.id : 'none'}(${Math.round(minDistance)})`);
  };

  const handleDrag = (event, info, dragDrink) => {
    // 드래그 중 휴지통 위에 올리면 하이라이트
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const dragEl = document.getElementById(`drink-${dragDrink.id}`);
      if (dragEl) {
        const dragRect = dragEl.getBoundingClientRect();
        const dragCX = dragRect.left + dragRect.width / 2;
        const dragCY = dragRect.top + dragRect.height / 2;
        const isOver = dragCX >= trashRect.left && dragCX <= trashRect.right &&
                       dragCY >= trashRect.top && dragCY <= trashRect.bottom;
        setTrashHover(isOver);
      }
    }
  };

  const handleNonAlcHover = () => {
    if (catchCount < 2) {
      const moveX = (Math.random() * -200) - 50;
      const moveY = (Math.random() * -250) - 50;
      setNonAlcPos({ x: moveX, y: moveY });
      setCatchCount(c => c + 1);
    }
  };

  const handleNonAlcClick = () => {
    if (catchCount >= 2) {
      setShowNonAlcModal(true);
    } else {
      handleNonAlcHover();
    }
  };

  const handleSelectNonAlcItem = (item) => {
    addDrink(item);
    setShowNonAlcModal(false);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center', position: 'relative' }}>
      
      {/* ===== 믹스 애니메이션 오버레이 (포탈 방식으로 overflow 문제 해결) ===== */}
      {createPortal(
        <AnimatePresence>
          {mixAnim && (
            <motion.div
              key="mix-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
            >
              <motion.div 
                key="mix-card"
                initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: -80 }}
                transition={{ type: 'spring', damping: 12, stiffness: 80 }}
                style={{
                  width: '240px',
                  height: '340px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: `2px solid ${mixAnim.color}90`,
                  boxShadow: `0 0 80px ${mixAnim.color}50, 0 0 30px ${mixAnim.color}30, inset 0 0 30px rgba(255,255,255,0.1)`
                }}
              >
                {/* 실사 배경 이미지 */}
                <img src={mixAnim.imagePath} alt={mixAnim.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* 글래스모피즘 하단 네임태그 */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '1.5rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderTop: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {mixAnim.name}
                  </span>
                </div>
              </motion.div>

              {/* 실패 시 나타나는 물음표/어지러움 이모지 파티클 애니메이션 */}
              {!mixAnim.isValid && (
                <>
                  <motion.div
                    initial={{ scale: 0, opacity: 0, x: -50, y: 150, zIndex: 10000 }}
                    animate={{ scale: [0, 4, 6], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ position: 'absolute', top: '30%', left: '30%', fontSize: '4rem', pointerEvents: 'none' }}
                  >
                    ❓
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0, opacity: 0, x: -100, y: -50, zIndex: 10000 }}
                    animate={{ scale: [0, 3, 5], opacity: [0, 1, 0] }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    style={{ position: 'absolute', top: '20%', left: '20%', fontSize: '5rem', pointerEvents: 'none' }}
                  >
                    😵‍💫
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0, opacity: 0, x: 100, y: 100, zIndex: 10000 }}
                    animate={{ scale: [0, 4, 7], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
                    style={{ position: 'absolute', top: '60%', right: '20%', fontSize: '6rem', pointerEvents: 'none' }}
                  >
                    ❓
                  </motion.div>
                </>
              )}

            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}



      {/* ===== 비주류 모달 ===== */}
      <AnimatePresence>
        {showNonAlcModal && (
          <motion.div 
            key="nonalc-modal"
            initial={{ opacity: 0, x: "-50%", y: 50 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 50 }}
            className="glass-panel"
            style={{
              position: 'fixed',
              bottom: '90px',
              left: '50%',
              width: '90%',
              maxWidth: '400px',
              padding: '1.5rem',
              zIndex: 999,
              background: 'rgba(20, 21, 28, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a78bfa' }}>비주류 보물상자 ✨</h3>
              <button onClick={() => setShowNonAlcModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {nonAlcoholicItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectNonAlcItem(item)}
                  style={{
                    position: 'relative',
                    height: '80px',
                    background: 'var(--surface-highlight)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                >
                  <img src={item.imagePath} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{item.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drinks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: 'absolute', top: '100px', left: 0, right: 0, textAlign: 'center', zIndex: 10 }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '30px', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#d8b4fe' }}>
              <Plus size={18} />
              <span>우측 상단 + 버튼을 눌러보세요</span>
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              원하는 음료를 홈 화면에 꺼내보세요!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
        오늘 무슨 술 마시나요?
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', textAlign: 'center', fontSize: '0.9rem' }}>
        마시는 술에 딱 맞는 최고의 안주를 추천해 드립니다.
      </p>

      {/* ===== 드링크 카드 그리드 ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%', padding: '0 0.5rem', position: 'relative', zIndex: 10 }}>
        {drinks.map((drink) => (
          <DrinkCard
            key={drink.id}
            drink={drink}
            isDefaultDrink={isDefaultDrink}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
            handleSelect={handleSelect}
            handleDragStart={handleDragStart}
            handleDrag={handleDrag}
            handleDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* ===== 휴지통 (드래그 중에만 표시, 좌측 하단) ===== */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            ref={trashRef}
            key="trash"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: trashHover ? 1.3 : 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{
              position: 'fixed',
              bottom: '100px',
              left: '20px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: trashHover ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.3)',
              border: `2px solid ${trashHover ? '#ef4444' : '#ef444460'}`,
              boxShadow: trashHover ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 4px 12px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              zIndex: 999,
              transition: 'background 0.2s, border 0.2s, box-shadow 0.2s'
            }}
          >
            <Trash2 size={24} color="#fff" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 비주류 도망가는 버튼 ===== */}
      {!showNonAlcModal && (
        <motion.button
          className="glass-panel"
          animate={{ x: nonAlcPos.x, y: nonAlcPos.y }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          onMouseEnter={handleNonAlcHover}
          onClick={handleNonAlcClick}
          onTouchStart={handleNonAlcHover}
          style={{
            position: 'absolute',
            bottom: '120px',
            right: '20px',
            padding: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.3rem',
            border: '1px solid #a78bfa50',
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#a78bfa',
            borderRadius: '12px',
            zIndex: 20,
            cursor: catchCount >= 2 ? 'pointer' : 'default'
          }}
        >
          <CupSoda size={20} />
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>비주류</span>
        </motion.button>
      )}

      {/* 디버그 오버레이 배너 (모바일 실시간 확인용) */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        background: 'rgba(0,0,0,0.85)',
        color: '#4ade80',
        padding: '6px 12px',
        borderRadius: '10px',
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        zIndex: 99999,
        pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.1)',
        wordWrap: 'break-word',
        textAlign: 'center'
      }}>
        {debugMsg}
      </div>
    </div>
  );
}
