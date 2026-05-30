let audioCtx = null;

function getCtx() {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

export function playNotificationSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.25);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.28);
    });
  } catch {}
}

export function playMessageSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {}
}

export function startRingtone() {
  let stopped = false;
  const timers = [];

  const ring = () => {
    if (stopped) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      [
        [0, 880, 0.35],
        [0.42, 880, 0.35],
      ].forEach(([delay, freq, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.45, now + delay + 0.02);
        gain.gain.setValueAtTime(0.45, now + delay + dur - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.01);
      });
    } catch {}
    timers.push(setTimeout(ring, 1800));
  };

  ring();

  return () => {
    stopped = true;
    timers.forEach(clearTimeout);
  };
}
