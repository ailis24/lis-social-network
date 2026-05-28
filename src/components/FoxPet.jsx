import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePremium } from "../context/PremiumContext";

/* ─── Fox images ─────────────────────────────────────────────────────────── */
const IMG = {
  happy:     "/fox/happy.webp",
  excited:   "/fox/excited.webp",
  sad:       "/fox/sad.webp",
  angry:     "/fox/angry.webp",
  angry_bat: "/fox/angry_bat.webp",
  sleeping:  "/fox/sleeping.webp",
};

/* ─── Phrase banks ───────────────────────────────────────────────────────── */
const PH = {
  feed:    ["НЯМ-НЯМ-НЯМ!","ВКУСНЯТИНА!","ЕЩЁЁЁ!","ХОЧУ ПИЦЦУ!","РЫБУ ДАВАЙ!","Я ГОЛОДНЫЙ КАК ВОЛК!","БРРР, ВКУСНО!","ОБОЖРАЛСЯ!","СПАСИБО ЧЕЛОВЕК!","ЧИТАЮ МЕНЮ...","ГДЕ МОЙ УЖИН?!","Я БУДУ ВСЁ ЖРРАТЬ!","АМ-АМ-АМ!","СЫТЫЙ ЛИС = СЧАСТЛИВЫЙ!","УУУ, ВКУСНЯШКА!","ПОДКИНЬ ЕЩЁ!","ЖРУ НЕ ОСТАНОВЛЮСЬ!"],
  play:    ["УУУУ, ИГРАЕМ!","КИДАЙ МЯЧИК!","БЕГУ-БЕГУ-БЕГУ!","ЛОВИ МЕНЯ!","Я БЫСТРЕЕ ВСЕХ!","УСТАЛ... НО СЧАСТЛИВ!","ЕЩЁ РАЗ!","ВЕСЕЛООО!","ГДЕ МЯЧ?!","АПЧИХ! ПОЙМАЛ!","БЕГИ ЗА МНОЙ!","ИГРА ИГРА ИГРА!","СКУКОТИЩА БЕЗ ИГР!","ДАВАЙ ДОГОНЯЛКИ!","ПРЫГ-СКОК!","Я УСТАЛ... НО ХОЧУ ЕЩЁ!","ЛУЧШАЯ ИГРА!"],
  sleep:   ["СПАТЬ ХОЧУ...","БАЮ-БАЮ...","ZZZZZ","УСТАЛ БЕГАТЬ...","ДОБРОЙ НОЧИ!","БУДУ СНЯТСЯ КОЛБАСЫ...","ХРАП-ХРАП...","НЕ БУДИТЬ!","ЕЩЁ 5 МИНУТ...","СЛАДКИХ СНОВ!","Я СПЛЮ... ТИШИНА...","КОТО-РЫХРАПУ...","УУУ, КАКОЙ СОН!","ПРОСЫПАЮСЬ...","ВЫСПАЛСЯ!","НОВАЯ ЭНЕРГИЯ!","ПОРА БЕГАТЬ!"],
  clean:   ["ОЙ, ИЗВИНИ...","Я НЕЧАЯННО!","УБЕРИ ПЛИЗ!","ФУ, КАКОЙ УЖАС!","ЭТО НЕ Я!","СЛУЧАЙНОСТЬ!","ВСЁ В ПОРЯДКЕ!","ЧИСТОТА - ЭТО ВАЖНО!","СПАСИБО ЧТО УБРАЛ!","БОЛЬШЕ НЕ БУДУ!","ОПЯТЬ?!","НУ ИЗВИНИ...","Я МАЛЕНЬКИЙ!","НЕ РУГАЙСЯ!","ВСЁ ЧИСТО ТЕПЕРЬ!","УРА, ЧИСТО!","Я АККУРАТНЫЙ!"],
  pet:     ["МММ, ПРИЯТНО!","ЕЩЁ ЧУТЬ-ЧУТЬ!","ЛЮБЛЮ ТЕБЯ!","ТЫ ЛУЧШИЙ!","МУР-МУР-МУР!","ГЛАДЬ ЕЩЁ!","КАК ПРИЯТНО!","ОБОЖАЮ!","ТЫ МОЙ ЧЕЛОВЕК!","ЛУЧШИЕ ОБНЯШКИ!","ХОЧУ ЕЩЁ!","НЕ ОСТАНАВЛИВАЙСЯ!","КАЙФ!","СПАСИБО!","Я СЧАСТЛИВ!","ТЫ САМЫЙ ЛУЧШИЙ!","ЛЮБЛЮ-ЛЮБЛЮ!"],
  idle:    ["Вот и я!","Не скучали?","👀 Привет!","МНЕ СКУЧНО","СКУУУЧНО...","НЕ ТРОНЬ ЭТУ КНОПКУ","ЭТО МОЁ!","БИТОЙ ПОЛУЧИШЬ","Я НЕ ВИНОВАТ","ЭТО НЕ Я","ХОЧУ ЕСТЬ!","ГДЕ ЕДА?!"],
  hungry:  ["ХОЧУ ЕСТЬ!","ГДЕ ЕДА?!","ДАЙ ПОЕСТЬ!","УМРУ С ГОЛОДУ...","ПОКОРМИ МЕНЯ!"],
  ignore:  ["ЭЙ! ПОСМОТРИ НА МЕНЯ!","ВЕРНИСЬ!","СКУЧААЮ...","ТЫ МЕНЯ БРОСИЛ?!","Я ОДИН...","НУ ПОЖАЛУЙСТА!","Я ХОРОШИЙ ЛИС!"],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

/* ─── LocalStorage helpers ───────────────────────────────────────────────── */
const LS_KEY = "lis_fox_tamagotchi_v2";

const defaultStats = () => ({
  hunger:      80,
  happiness:   80,
  energy:      80,
  cleanliness: 80,
  lastFeed:    0,
  lastPlay:    0,
  lastSleep:   0,
  lastClean:   0,
  lastPet:     0,
  isSleeping:  false,
  sleepUntil:  0,
  ignoredSince: Date.now(),
  totalPoops:  0,
  cleanedPoops: 0,
});

const loadStats = () => {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    return s ? { ...defaultStats(), ...s } : defaultStats();
  } catch { return defaultStats(); }
};

const saveStats = (s) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  @keyframes foxBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  @keyframes foxWalk    { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-7px) rotate(2deg)} }
  @keyframes foxSleep   { 0%,100%{transform:rotate(-8deg) scale(1)} 50%{transform:rotate(-8deg) scale(1.04)} }
  @keyframes foxWave    { 0%,100%{transform:scale(1) rotate(-5deg)} 30%{transform:scale(1.1) rotate(5deg)} 60%{transform:scale(1.05) rotate(-3deg)} }
  @keyframes foxBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px) scale(1.08)} }
  @keyframes foxPopIn   { 0%{transform:scale(0) rotate(-20deg);opacity:0} 70%{transform:scale(1.15) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
  @keyframes foxShake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes poopIn     { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.3);opacity:1} 100%{transform:scale(1);opacity:1} }
  @keyframes heartPop   { 0%{transform:scale(0) translateY(0);opacity:1} 100%{transform:scale(1.5) translateY(-40px);opacity:0} }
  @keyframes pulse      { 0%,100%{box-shadow:0 4px 15px rgba(255,107,53,0.4)} 50%{box-shadow:0 4px 30px rgba(255,107,53,0.8)} }
  @keyframes zzzFloat   { 0%{transform:translateY(0) scale(0.8);opacity:1} 100%{transform:translateY(-40px) scale(1.2);opacity:0} }

  .fox-bubble {
    position: absolute; bottom: calc(100% + 8px); left: 50%;
    transform: translateX(-50%);
    background: #fff; color: #333; font-size: 11px; font-weight: 800;
    border-radius: 12px; padding: 5px 11px; white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0,0,0,0.22); pointer-events: none; z-index: 10001;
  }
  .fox-bubble::after {
    content:""; position:absolute; top:100%; left:50%; transform:translateX(-50%);
    border:6px solid transparent; border-top-color:#fff;
  }
  .tama-btn-pulse { animation: pulse 1.5s ease-in-out infinite; }
  .zzz-float { animation: zzzFloat 2s ease-out infinite; }
`;

/* ─── Stat Bar ───────────────────────────────────────────────────────────── */
const StatBar = ({ icon, label, value, gradient }) => (
  <div className="mb-3">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-bold text-gray-700">{icon} {label}</span>
      <span className="text-xs font-bold text-gray-500">{Math.round(value)}%</span>
    </div>
    <div style={{ height: 18, background: "#f0f0f0", borderRadius: 20, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 20, width: `${value}%`,
        background: gradient, transition: "width 0.5s ease"
      }} />
    </div>
  </div>
);

/* ─── Poop spot ──────────────────────────────────────────────────────────── */
const PoopSpot = ({ poop, onClean }) => {
  const [opacity, setOpacity] = useState(1);
  const cleaning = useRef(false);
  const opRef = useRef(1);

  const handleMove = useCallback((e) => {
    if (!cleaning.current) return;
    opRef.current = Math.max(0, opRef.current - 0.08);
    setOpacity(opRef.current);
    if (opRef.current <= 0) {
      cleaning.current = false;
      onClean(poop.id);
    }
  }, [poop.id, onClean]);

  return (
    <div
      onPointerDown={(e) => { cleaning.current = true; e.preventDefault(); }}
      onPointerUp={() => { cleaning.current = false; }}
      onPointerMove={handleMove}
      style={{
        position: "fixed", left: poop.x, top: poop.y,
        fontSize: poop.size, opacity, cursor: "crosshair",
        zIndex: 9990, userSelect: "none",
        animation: "poopIn 0.5s ease-out",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        touchAction: "none",
      }}
      title="Потри чтобы убрать!"
    >
      💩
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function FoxPet() {
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  /* ── UI state ── */
  const [showPanel, setShowPanel] = useState(false);
  const [stats, setStats] = useState(loadStats);
  const [poops, setPoops] = useState([]);
  const [hearts, setHearts] = useState([]);

  /* ── Fox visual state ── */
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: W() - 130, y: H() - 130 });
  const [foxState, setFS] = useState("idle");
  const [image, setImage] = useState(IMG.happy);
  const [anim, setAnim] = useState("foxBreathe 2.5s ease-in-out infinite");
  const [flipped, setFlip] = useState(false);
  const [msg, setMsg] = useState("");

  const walkRef     = useRef(null);
  const stateRef    = useRef("idle");
  const posRef      = useRef(pos);
  const msgRef      = useRef(null);
  const nextRef     = useRef(null);
  const statsRef    = useRef(stats);
  const heartCntRef = useRef(0);
  const { isPremium } = usePremium();

  posRef.current   = pos;
  stateRef.current = foxState;
  statsRef.current = stats;

  /* ── Persist stats ── */
  useEffect(() => { saveStats(stats); }, [stats]);

  /* ── Decay stats every 2 min ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setStats((s) => {
        if (s.isSleeping && Date.now() < s.sleepUntil) {
          return { ...s, energy: Math.min(100, s.energy + 2), hunger: Math.max(0, s.hunger - 0.5) };
        }
        const isSleeping = s.isSleeping && Date.now() < s.sleepUntil;
        return {
          ...s,
          isSleeping,
          hunger:      Math.max(0, s.hunger      - (isSleeping ? 0.5 : 1.5)),
          happiness:   Math.max(0, s.happiness   - 1),
          energy:      Math.max(0, s.energy      - (isSleeping ? -2 : 0.8)),
          cleanliness: Math.max(0, s.cleanliness - 0.3),
        };
      });
    }, 20000); // every 20s in dev (would be 30min in prod)
    return () => clearInterval(iv);
  }, []);

  /* ── Auto-care for premium users (placed after showMsg definition below) ── */
  const premiumRef = useRef(isPremium);
  useEffect(() => { premiumRef.current = isPremium; }, [isPremium]);

  /* ── Spawn poops when cleanliness low / ignored ── */
  useEffect(() => {
    const iv = setInterval(() => {
      const s = statsRef.current;
      const ignored = Date.now() - s.ignoredSince > 1000 * 60 * 60; // 1 hour
      const dirtChance = s.cleanliness < 40 ? 0.4 : ignored ? 0.3 : 0.05;
      if (Math.random() < dirtChance && poops.length < 10) {
        spawnPoop();
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [poops.length]);

  const spawnPoop = () => {
    const id = Date.now();
    const x = rnd(40, Math.max(50, W() - 80));
    const y = rnd(80, Math.max(100, H() - 150));
    const size = rnd(32, 52);
    setPoops((p) => [...p, { id, x, y, size }]);
    setStats((s) => ({ ...s, totalPoops: s.totalPoops + 1, cleanliness: Math.max(0, s.cleanliness - 5) }));
  };

  const cleanPoop = useCallback((id) => {
    setPoops((p) => p.filter((x) => x.id !== id));
    setStats((s) => ({
      ...s,
      cleanliness: Math.min(100, s.cleanliness + 5),
      happiness:   Math.min(100, s.happiness + 3),
      cleanedPoops: s.cleanedPoops + 1,
    }));
    showMsg(pick(PH.clean));
  }, []);

  /* ── Message ── */
  const showMsg = useCallback((text, ms = 3000) => {
    setMsg(text);
    clearTimeout(msgRef.current);
    msgRef.current = setTimeout(() => setMsg(""), ms);
  }, []);

  /* ── Auto-care (premium) ── */
  useEffect(() => {
    if (!premiumRef.current) return;
    const iv = setInterval(() => {
      if (!premiumRef.current) return;
      setStats((s) => {
        let upd = { ...s };
        if (s.hunger < 30 && !s.isSleeping) {
          upd = { ...upd, hunger: Math.min(100, s.hunger + 25), happiness: Math.min(100, s.happiness + 5) };
          showMsg("🤖✨ Авто-кормление!");
        }
        if (s.energy < 20 && !s.isSleeping) {
          upd = { ...upd, isSleeping: true, sleepUntil: Date.now() + 1000 * 60 * 3, energy: Math.min(100, s.energy + 15) };
          showMsg("🌙✨ Авто-сон!");
        }
        if (s.cleanliness < 25) {
          upd = { ...upd, cleanliness: Math.min(100, s.cleanliness + 20) };
        }
        return upd;
      });
    }, 25000);
    return () => clearInterval(iv);
  }, [showMsg]);

  /* ── Walk ── */
  const stopWalk = () => clearInterval(walkRef.current);

  const walkTo = useCallback((tx, speed, onDone) => {
    stopWalk();
    setAnim("foxWalk 0.45s ease-in-out infinite");
    walkRef.current = setInterval(() => {
      setPos((p) => {
        const dx = tx - p.x;
        if (Math.abs(dx) <= speed + 1) {
          clearInterval(walkRef.current);
          if (onDone) setTimeout(onDone, 60);
          return { ...p, x: tx };
        }
        setFlip(dx < 0);
        return { ...p, x: p.x + (dx > 0 ? speed : -speed) };
      });
    }, 16);
  }, []);

  /* ── Go state ── */
  const go = useCallback((state, img, animation, newMsg, msgDur) => {
    clearTimeout(nextRef.current);
    stopWalk();
    setFS(state);
    setImage(img);
    setAnim(animation);
    if (newMsg) showMsg(newMsg, msgDur);
  }, [showMsg]);

  /* ── Behaviors ── */
  const doIdle = useCallback(() => {
    const s = statsRef.current;
    const img = s.hunger < 30 ? IMG.sad : s.happiness < 30 ? IMG.sad : IMG.happy;
    const phrase = s.hunger < 30 ? pick(PH.hungry)
      : Math.random() < 0.4 ? pick(PH.idle) : null;
    go("idle", img, "foxBreathe 2.5s ease-in-out infinite", phrase, 3000);
    nextRef.current = setTimeout(doNext, rnd(4000, 10000));
  }, [go]);

  const doSleepAnim = useCallback(() => {
    go("sleeping", IMG.sleeping, "foxSleep 3.5s ease-in-out infinite", pick(PH.sleep), 4000);
    nextRef.current = setTimeout(doIdle, rnd(8000, 20000));
  }, [go, doIdle]);

  const doWalk = useCallback(() => {
    const tx = rnd(20, W() - 100);
    setFlip(tx < posRef.current.x);
    setFS("walking");
    setImage(IMG.happy);
    walkTo(tx, 2.5, () => nextRef.current = setTimeout(doIdle, rnd(600, 2500)));
  }, [walkTo, doIdle]);

  const doGuard = useCallback(() => {
    go("guard", IMG.angry_bat, "foxBreathe 2s ease-in-out infinite", pick(["НЕ ТРОНЬ ЭТУ КНОПКУ","ОТОЙДИ!","ЭТО МОЁ!","БИТОЙ ПОЛУЧИШЬ"]), 4000);
    nextRef.current = setTimeout(doWalk, rnd(5000, 10000));
  }, [go, doWalk]);

  const doPlay = useCallback(() => {
    go("playing", IMG.excited, "foxWave 0.6s ease-in-out infinite", pick(PH.play), 3500);
    nextRef.current = setTimeout(doIdle, rnd(8000, 14000));
  }, [go, doIdle]);

  const doHide = useCallback(() => {
    const goLeft = Math.random() < 0.5;
    setFlip(goLeft);
    setFS("hiding");
    setImage(IMG.sad);
    setAnim("foxWalk 0.45s ease-in-out infinite");
    walkTo(goLeft ? -(W() * 0.3) : W() + 20, 5, () => {
      setVisible(false);
      setFS("hidden");
      nextRef.current = setTimeout(appearFox, rnd(30000, 90000));
    });
  }, [walkTo]);

  const doOffended = useCallback(() => {
    go("offended", IMG.angry, "foxShake 0.4s ease-in-out 2", pick(["Ну и ладно...","Ухожу!","😤 Обиделся!"]), 2500);
    nextRef.current = setTimeout(doHide, 2700);
  }, [go, doHide]);

  const doNext = useCallback(() => {
    const r = Math.random();
    if (r < 0.25) doIdle();
    else if (r < 0.5) doWalk();
    else if (r < 0.62) doSleepAnim();
    else if (r < 0.74) doGuard();
    else if (r < 0.86) doPlay();
    else doHide();
  }, [doIdle, doWalk, doSleepAnim, doGuard, doPlay, doHide]);

  const appearFox = useCallback(() => {
    const sx = rnd(20, W() - 100);
    setPos({ x: sx, y: H() - 130 });
    setFlip(false);
    setVisible(true);
    setFS("appear");
    setImage(IMG.excited);
    setAnim("foxPopIn 0.5s ease-out forwards");
    showMsg(pick(PH.idle), 3000);
    nextRef.current = setTimeout(doNext, 3500);
  }, [showMsg, doNext]);

  /* ── Boot ── */
  useEffect(() => {
    const t = setTimeout(appearFox, rnd(8000, 20000));
    return () => { clearTimeout(t); clearTimeout(nextRef.current); clearTimeout(msgRef.current); stopWalk(); };
  }, []);

  /* ── Global tap → offend ── */
  useEffect(() => {
    const handler = (e) => {
      setStats((s) => ({ ...s, ignoredSince: Date.now() }));
      if (!visible) return;
      const el = document.getElementById("fox-pet-container");
      if (el && el.contains(e.target)) return;
      const panel = document.getElementById("fox-tama-panel");
      if (panel && panel.contains(e.target)) return;
      if (["hidden","offended","hiding","walking"].includes(stateRef.current)) return;
      if (Math.random() < 0.3) doOffended();
    };
    window.addEventListener("pointerdown", handler, { passive: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, [visible, doOffended]);

  /* ── Click fox ── */
  const handleFoxClick = useCallback((e) => {
    e.stopPropagation();
    const s = stateRef.current;
    clearTimeout(nextRef.current);
    stopWalk();

    if (s === "sleeping") {
      go("idle", IMG.angry, "foxShake 0.5s ease-in-out", "ТЫ РАЗБУДИЛ МЕНЯ!", 2500);
      nextRef.current = setTimeout(doWalk, 2000);
      return;
    }

    // Pet the fox
    const now = Date.now();
    setStats((prev) => {
      if (now - prev.lastPet < 300000) return prev;
      const id = ++heartCntRef.current;
      setHearts((h) => [...h, { id, x: rnd(-20, 20), y: rnd(-10, 10) }]);
      setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1200);
      return { ...prev, happiness: Math.min(100, prev.happiness + 10), lastPet: now, ignoredSince: now };
    });
    go("pet", IMG.happy, "foxBounce 0.5s ease-in-out 2", pick(PH.pet), 2500);
    nextRef.current = setTimeout(doPlay, 2000);
  }, [go, doWalk, doPlay]);

  /* ─── CARE ACTIONS ──────────────────────────────────────────────────────── */
  const FOOD_EMOJIS = ["🍕","🐟","🫐","🍪","🍗","🧀","🍖"];
  const now = Date.now();

  const canFeed  = now - stats.lastFeed  > 1000 * 60 * 60;      // 1h cd
  const canPlay  = now - stats.lastPlay  > 1000 * 60 * 120;     // 2h cd
  const canSleep = !stats.isSleeping;
  const canClean = now - stats.lastClean > 1000 * 60 * 30;      // 30m cd

  const doFeed = () => {
    if (!canFeed) return;
    const food = pick(FOOD_EMOJIS);
    setStats((s) => ({
      ...s, lastFeed: Date.now(), ignoredSince: Date.now(),
      hunger:    Math.min(100, s.hunger + 30),
      happiness: Math.min(100, s.happiness + 10),
    }));
    go("eating", IMG.excited, "foxWave 0.5s ease-in-out infinite", `${food} ${pick(PH.feed)}`, 3500);
    setTimeout(() => { go("idle", IMG.happy, "foxBreathe 2.5s ease-in-out infinite", null); }, 3500);
  };

  const doPlayBtn = () => {
    if (!canPlay) return;
    setStats((s) => ({
      ...s, lastPlay: Date.now(), ignoredSince: Date.now(),
      happiness: Math.min(100, s.happiness + 25),
      energy:    Math.max(0, s.energy - 15),
    }));
    go("playing", IMG.excited, "foxWave 0.4s ease-in-out infinite", `🎾 ${pick(PH.play)}`, 4000);
    setTimeout(() => { go("idle", IMG.happy, "foxBreathe 2.5s ease-in-out infinite", null); }, 4000);
  };

  const doSleepBtn = () => {
    if (!canSleep) {
      setStats((s) => ({ ...s, isSleeping: false, sleepUntil: 0 }));
      go("idle", IMG.happy, "foxBreathe 2.5s ease-in-out infinite", "ПРОСЫПАЮСЬ!", 2500);
      return;
    }
    const sleepUntil = Date.now() + 1000 * 60 * 120; // 2h
    setStats((s) => ({ ...s, isSleeping: true, sleepUntil, lastSleep: Date.now(), ignoredSince: Date.now() }));
    go("sleeping", IMG.sleeping, "foxSleep 3.5s ease-in-out infinite", pick(PH.sleep), 4000);
  };

  const doCleanBtn = () => {
    if (!canClean) return;
    setStats((s) => ({
      ...s, lastClean: Date.now(), ignoredSince: Date.now(),
      cleanliness: Math.min(100, s.cleanliness + 30),
      happiness:   Math.min(100, s.happiness + 15),
    }));
    setPoops([]);
    go("idle", IMG.happy, "foxBreathe 2.5s ease-in-out infinite", `🧹 ${pick(PH.clean)}`, 3000);
  };

  /* ── Determine if button needs attention ── */
  const needsAttention = stats.hunger < 30 || stats.happiness < 30 || stats.energy < 30;
  const foxSize = W() <= 480 ? 76 : 100;

  /* ─────────────────────────────── RENDER ────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>

      {/* Poop spots */}
      {poops.map((p) => (
        <PoopSpot key={p.id} poop={p} onClean={cleanPoop} />
      ))}

      {/* 🦊 ТАМАГОЧИ button — fixed top-left */}
      <button
        onClick={() => setShowPanel((v) => !v)}
        className={needsAttention ? "tama-btn-pulse" : ""}
        style={{
          position: "fixed", top: 10, left: 10, zIndex: 10000,
          width: 140, height: 45,
          background: "linear-gradient(135deg,#FF6B35 0%,#FF8C5A 100%)",
          color: "#fff", fontWeight: "bold", fontSize: 15,
          border: "none", borderRadius: 25, cursor: "pointer",
          boxShadow: "0 4px 15px rgba(255,107,53,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
      >
        <span style={{ fontSize: 22 }}>🦊</span> ТАМАГОЧИ
      </button>

      {/* ── Tamagotchi panel ── */}
      {showPanel && (
        <div
          id="fox-tama-panel"
          style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: "min(420px, 92vw)", maxHeight: "90vh",
            background: "#fff", borderRadius: 30,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            padding: "24px 24px 20px",
            zIndex: 10002, overflowY: "auto",
            animation: "foxPopIn 0.35s ease-out",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={stats.isSleeping ? IMG.sleeping
                  : stats.hunger < 30 ? IMG.sad
                  : stats.happiness > 70 ? IMG.happy
                  : IMG.excited}
                alt="лис" style={{ width: 56, height: 56, objectFit: "contain" }}
              />
              <div>
                <p style={{ fontWeight: 900, fontSize: 18, color: "#333" }}>Лисёнок</p>
                <p style={{ fontSize: 12, color: "#888" }}>
                  {stats.isSleeping ? "😴 Спит..." : stats.hunger < 30 ? "😔 Голодный..." : stats.happiness > 70 ? "😊 Счастливый!" : "🦊 Привет!"}
                </p>
              </div>
            </div>
            <button onClick={() => setShowPanel(false)}
              style={{ background: "#f0f0f0", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>

          {/* Stats */}
          <div style={{ background: "#fafafa", borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
            <StatBar icon="🍖" label="ГОЛОД"    value={stats.hunger}      gradient="linear-gradient(90deg,#FF4444,#4CAF50)" />
            <StatBar icon="😊" label="СЧАСТЬЕ"  value={stats.happiness}   gradient="linear-gradient(90deg,#FFD93D,#FF6B9D)" />
            <StatBar icon="⚡" label="ЭНЕРГИЯ"  value={stats.energy}      gradient="linear-gradient(90deg,#4D96FF,#6BCB77)" />
            <StatBar icon="🧹" label="ЧИСТОТА"  value={stats.cleanliness} gradient="linear-gradient(90deg,#8B4513,#87CEEB)" />
          </div>

          {/* Care buttons 2×2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "ПОКОРМИТЬ", icon: "🍕", fn: doFeed,     ok: canFeed,  cd: "Кулдаун 1ч" },
              { label: "ПОИГРАТЬ",  icon: "🎾", fn: doPlayBtn,  ok: canPlay,  cd: "Кулдаун 2ч" },
              { label: stats.isSleeping ? "РАЗБУДИТЬ" : "УСЫПИТЬ",
                                    icon: stats.isSleeping ? "☀️" : "😴",
                                    fn: doSleepBtn, ok: true, cd: "" },
              { label: "УБРАТЬ",    icon: "🧹", fn: doCleanBtn, ok: canClean, cd: "Кулдаун 30м" },
            ].map(({ label, icon, fn, ok, cd }) => (
              <button
                key={label}
                onClick={() => { fn(); }}
                disabled={!ok}
                title={!ok ? cd : ""}
                style={{
                  background: ok
                    ? "linear-gradient(135deg,#a855f7,#ec4899)"
                    : "#e5e7eb",
                  color: ok ? "#fff" : "#9ca3af",
                  border: "none", borderRadius: 20,
                  padding: "14px 8px",
                  cursor: ok ? "pointer" : "not-allowed",
                  opacity: ok ? 1 : 0.55,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6,
                  transition: "transform 0.15s, box-shadow 0.15s",
                  boxShadow: ok ? "0 4px 12px rgba(168,85,247,0.3)" : "none",
                  fontWeight: 900, fontSize: 12,
                }}
                onMouseEnter={(e) => { if (ok) e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: 36 }}>{icon}</span>
                {label}
                {!ok && <span style={{ fontSize: 9, opacity: 0.8 }}>{cd}</span>}
              </button>
            ))}
          </div>

          {/* Stats footer */}
          <div style={{ display: "flex", justifyContent: "space-around", fontSize: 11, color: "#888", borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
            <span>💩 наделал: {stats.totalPoops}</span>
            <span>🧹 убрал: {stats.cleanedPoops}</span>
            <span>💩 на полу: {poops.length}</span>
          </div>
        </div>
      )}

      {/* Overlay backdrop */}
      {showPanel && (
        <div
          onClick={() => setShowPanel(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10001 }}
        />
      )}

      {/* ── Fox sprite ── */}
      {visible && (
        <div
          id="fox-pet-container"
          style={{
            position: "fixed",
            left: pos.x, top: pos.y,
            width: foxSize, height: foxSize,
            zIndex: 9999, cursor: "pointer",
            userSelect: "none", pointerEvents: "auto",
          }}
          onClick={handleFoxClick}
          title="Погладь лиса 🦊"
        >
          <img
            src={image}
            alt="лис"
            style={{
              width: "100%", height: "100%", objectFit: "contain",
              transform: flipped ? "scaleX(-1)" : "scaleX(1)",
              animation: anim,
              filter: "drop-shadow(1px 4px 8px rgba(0,0,0,0.35))",
              display: "block",
            }}
            draggable={false}
          />

          {/* ZZZ when sleeping */}
          {foxState === "sleeping" && (
            <div style={{ position: "absolute", top: -10, right: -5, fontSize: 14, color: "#a855f7", fontWeight: 900 }}
              className="zzz-float">
              ZZZ
            </div>
          )}

          {/* Hearts on pet */}
          {hearts.map((h) => (
            <div key={h.id} style={{
              position: "absolute", top: -20 + h.y, left: "50%", marginLeft: h.x,
              fontSize: 20, pointerEvents: "none",
              animation: "heartPop 1.2s ease-out forwards",
            }}>❤️</div>
          ))}

          {msg && <div className="fox-bubble">{msg}</div>}
        </div>
      )}
    </>
  );
}
