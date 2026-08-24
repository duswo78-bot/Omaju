let audioCtx = null;

function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playClick() {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

export function playPop() {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
  
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

export function playUp() {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playDown() {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function playSuccess() {
  const ctx = initAudio();
  if (!ctx) return;
  
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const startTime = ctx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
    
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

export function playFail() {
  const ctx = initAudio();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.5);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

let spinInterval = null;

export function startSpinSound() {
  const ctx = initAudio();
  if (!ctx) return;
  
  stopSpinSound();
  
  let delay = 30;
  
  const tick = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.02);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
    
    delay = delay * 1.05;
    
    if (delay < 400) {
      spinInterval = setTimeout(tick, delay);
    }
  };
  
  tick();
}

export function stopSpinSound() {
  if (spinInterval) {
    clearTimeout(spinInterval);
    spinInterval = null;
  }
}

export function playFanfare() {
  const ctx = initAudio();
  if (!ctx) return;
  
  // 빠른 아르페지오 이후 빰! 하는 소리
  const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
  
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // 마지막 음은 더 길고 다르게
    const isLast = i === freqs.length - 1;
    osc.type = isLast ? 'square' : 'triangle';
    osc.frequency.value = freq;
    
    // 조금씩 빠르게 올라감
    const startTime = ctx.currentTime + (i * 0.08);
    const duration = isLast ? 1.0 : 0.15;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(isLast ? 0.4 : 0.2, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

export function playApplause() {
  const ctx = initAudio();
  if (!ctx) return;
  
  // 박수소리: 백색소음(White Noise)을 여러 번 짧게 끊어서 재생
  const bufferSize = ctx.sampleRate * 2; // 2초 분량
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // -1 ~ 1
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  // 소리 모양(Envelope) 깎기
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  // 박수소리처럼 대역폭 제한
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  // 여러 명이 치는 것처럼 페이드인/아웃
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
  
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 1.5);
}

export function playLaugh() {
  const ctx = initAudio();
  if (!ctx) return;
  
  // 하하하 웃는 소리 (간단한 신디사이징 패턴)
  // 3~4번 연속으로 짧고 높은 주파수음을 냄
  const count = 4;
  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // 약간 떨리는 사람 목소리 느낌의 파형 (triangle)
    osc.type = 'triangle';
    
    const startTime = ctx.currentTime + (i * 0.15);
    const duration = 0.1;
    
    // 음높이를 점점 낮춤 (하! 하! 하!)
    osc.frequency.setValueAtTime(600 - (i * 30), startTime);
    osc.frequency.linearRampToValueAtTime(400, startTime + duration);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
