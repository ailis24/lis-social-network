import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";
import PremiumLockModal from "../components/PremiumLockModal";
import {
  postService,
  storyService,
  timerService,
  challengeService,
} from "../services";
import { Image as PhotoIcon, Video as VideoCameraIcon } from "lucide-react";
import StickerPicker from "../components/StickerPicker";

const TIMER_LIMIT = 10 * 60; // 10 minutes in seconds
const PAYMENT_PHONE = "+79999099549";

// ─── Auto-playing video (IntersectionObserver) ─────────────────────────────────
const AutoVideo = ({ src, className = "" }) => {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.5 },
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      controls
      className={className}
    />
  );
};

// ─── Premium Modal (timer unlock) ────────────────────────────────────────────
const PremiumModal = ({ onClose }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-3">👑</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Lis Premium</h2>
        <p className="text-gray-500 text-sm mb-4">
          С Premium таймер ленты отключается и открываются все возможности
        </p>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 mb-5 text-left">
          <p className="text-xs text-gray-500 mb-1">Стоимость</p>
          <p className="text-3xl font-bold text-purple-700 mb-2">299 ₽/мес</p>
          <p className="text-xs text-gray-500">Перевод по СБП на:</p>
          <p className="text-base font-bold text-gray-800 select-all">
            {PAYMENT_PHONE}
          </p>
        </div>
        <div className="space-y-1.5 text-left mb-5">
          {[
            "📸 Сторис",
            "📞 Звонки",
            "🦊 Авто-лисёнок",
            "👁 Кто смотрел",
            "📊 Статистика",
            "📎 Файлы 500МБ",
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <span className="text-green-500 font-bold text-xs">✓</span>
              {f}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200"
          >
            Позже
          </button>
          <button
            onClick={() => {
              onClose();
              navigate("/premium");
            }}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg"
          >
            👑 Оформить
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Story Recorder (15-second video) ─────────────────────────────────────────
const STORY_MAX_SECONDS = 15;

const StoryRecorder = ({ onClose, onUploaded }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const stopTimerRef = useRef(null);

  const [phase, setPhase] = useState("preview"); // preview | recording | uploading | error
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError("Нет доступа к камере: " + (err.message || ""));
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Tick during recording
  useEffect(() => {
    if (phase !== "recording") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const startRecording = () => {
    setError("");
    const stream = streamRef.current;
    if (!stream) return;
    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    const mime =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => doUpload(recorder.mimeType || "video/webm");
    recorder.start();
    recorderRef.current = recorder;
    setSeconds(0);
    setPhase("recording");
    // Hard stop at 15 seconds
    stopTimerRef.current = setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, STORY_MAX_SECONDS * 1000);
  };

  const stopRecording = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const doUpload = async (mimeType) => {
    setPhase("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `story-${Date.now()}.${ext}`, {
        type: mimeType,
      });
      await storyService.createStory(file);
      onUploaded && onUploaded();
      onClose();
    } catch (err) {
      setError("Ошибка загрузки: " + (err.message || ""));
      setPhase("error");
    }
  };

  const remaining = STORY_MAX_SECONDS - seconds;
  const progress = (seconds / STORY_MAX_SECONDS) * 100;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="font-semibold">Сторис · до 15 сек</h2>
        <button onClick={onClose} className="text-2xl px-2">
          ✕
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center bg-black relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="max-h-full max-w-full"
        />
        {phase === "recording" && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {remaining}s
          </div>
        )}
      </div>

      {/* Progress bar */}
      {phase === "recording" && (
        <div className="h-1 bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-pink-400 to-red-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4 flex justify-center bg-black">
        {phase === "preview" && (
          <button
            onClick={startRecording}
            className="w-16 h-16 rounded-full bg-red-500 border-4 border-white shadow-xl active:scale-95 transition"
            aria-label="Начать запись"
          />
        )}
        {phase === "recording" && (
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-2xl bg-red-500 border-4 border-white shadow-xl active:scale-95 transition"
            aria-label="Остановить запись"
          />
        )}
        {phase === "uploading" && <p className="text-white">Загружаем...</p>}
        {phase === "error" && (
          <div className="text-center">
            <p className="text-red-300 mb-2">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 rounded-xl text-white"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Stories Bar ──────────────────────────────────────────────────────────────
const StoriesBar = ({ currentUser, isPremium }) => {
  const [stories, setStories] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [showStoryLock, setShowStoryLock] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [storyProgress, setStoryProgress] = useState(0);
  const fileRef = useRef();
  const progressRef = useRef(null);
  const STORY_DURATION = 5000; // 5 seconds per image

  const loadStories = () => {
    storyService
      .getStories()
      .then(setStories)
      .catch(() => {});
  };

  useEffect(() => {
    loadStories();
  }, []);

  // Tick every minute so the "expires in" labels and auto-removal stay current
  useEffect(() => {
    const iv = setInterval(() => {
      setNow(Date.now());
      // Drop locally any story already expired (server also auto-cleans)
      setStories((arr) =>
        arr.filter((s) => new Date(s.expires_at).getTime() > Date.now()),
      );
    }, 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    // Client-side checks before sending — server enforces them too
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      alert("Только фото или видео");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("Файл слишком большой (макс 50 МБ)");
      return;
    }
    try {
      await storyService.createStory(file);
      loadStories();
    } catch (err) {
      alert("Ошибка загрузки сторис");
    }
  };

  const handleStoryDelete = async (id) => {
    if (!confirm("Удалить сторис?")) return;
    try {
      await storyService.deleteStory(id);
      setStories((arr) => arr.filter((s) => s.id !== id));
      // Refresh viewing group
      if (viewing) {
        const remaining = viewing.items.filter((i) => i.id !== id);
        if (remaining.length === 0) setViewing(null);
        else {
          setViewing({ ...viewing, items: remaining });
          setActiveIdx(0);
        }
      }
    } catch {
      alert("Не удалось удалить");
    }
  };

  // group by user
  const grouped = {};
  stories.forEach((s) => {
    if (!grouped[s.user_id]) grouped[s.user_id] = { ...s, items: [] };
    grouped[s.user_id].items.push(s);
  });
  const groups = Object.values(grouped);

  const formatRemaining = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return "истекает";
    const h = Math.floor(diff / (60 * 60 * 1000));
    const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  };

  const openViewer = (group) => {
    setViewing(group);
    setActiveIdx(0);
    setStoryProgress(0);
    // Record story view for first item (anonymous if viewer is premium)
    if (group.items?.[0]?.id) {
      storyService.viewStory(group.items[0].id);
    }
  };

  const currentItem = viewing?.items?.[activeIdx];

  // Auto-advance timer for image stories
  useEffect(() => {
    if (!viewing || !currentItem) return;
    if (currentItem.media_type === "video") return; // video advances on onEnded
    clearInterval(progressRef.current);
    setStoryProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setStoryProgress(pct);
      if (elapsed >= STORY_DURATION) {
        clearInterval(progressRef.current);
        setActiveIdx((i) => {
          if (i + 1 < viewing.items.length) return i + 1;
          setViewing(null);
          return i;
        });
      }
    }, 50);
    return () => clearInterval(progressRef.current);
  }, [viewing, activeIdx]);

  return (
    <>
      <div className="bg-white/95 rounded-2xl shadow mb-4 p-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {/* Add story button */}
          <button
            onClick={() => {
              if (!isPremium) {
                setShowStoryLock(true);
                return;
              }
              setShowChooser(true);
            }}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl border-2 border-white shadow relative">
              {isPremium ? "+" : "🔒"}
            </div>
            <span className="text-xs text-gray-500">Сторис</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUpload}
          />

          {/* Stories */}
          {groups.map((group) => (
            <button
              key={group.user_id}
              onClick={() => openViewer(group)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400">
                <img
                  src={group.avatar || "/fox.gif"}
                  alt={group.username}
                  loading="lazy"
                  className="w-full h-full rounded-full object-cover border-2 border-white"
                />
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[56px]">
                {group.username}
              </span>
            </button>
          ))}
        </div>

        {/* Source chooser */}
        {showChooser && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowChooser(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg text-gray-800 mb-4 text-center">
                Новая сторис
              </h3>
              <button
                onClick={() => {
                  setShowChooser(false);
                  setShowRecorder(true);
                }}
                className="w-full py-3 mb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl"
              >
                📷 Снять видео (15 сек)
              </button>
              <button
                onClick={() => {
                  setShowChooser(false);
                  fileRef.current?.click();
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl"
              >
                🖼 Загрузить файл
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Сторис исчезнет через 24 часа
              </p>
            </div>
          </div>
        )}

        {/* Recorder */}
        {showRecorder && (
          <StoryRecorder
            onClose={() => setShowRecorder(false)}
            onUploaded={loadStories}
          />
        )}

        {/* Premium lock for stories */}
        {showStoryLock && (
          <PremiumLockModal
            feature="Загрузка сторис"
            featureList={[
              "📸 Загрузка сторис (фото и видео)",
              "📞 Аудио и видео звонки",
              "🦊 Авто-уход за лисёнком",
              "👁 Кто смотрел профиль",
              "⭐ Приоритет в ленте",
            ]}
            onClose={() => setShowStoryLock(false)}
          />
        )}

        {/* Story viewer — FULLSCREEN */}
        {viewing && currentItem && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
            {/* Progress bars */}
            <div className="flex gap-1 px-3 pt-10 pb-1 safe-area-top">
              {viewing.items.map((_, i) => (
                <div
                  key={i}
                  className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white rounded-full"
                    style={{
                      width:
                        i < activeIdx
                          ? "100%"
                          : i === activeIdx
                            ? `${storyProgress}%`
                            : "0%",
                      transition: i === activeIdx ? "none" : "none",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <img
                  src={viewing.avatar || "/fox.gif"}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
                />
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">
                    @{viewing.username}
                  </p>
                  <p className="text-white/60 text-xs">
                    ⏳ {formatRemaining(currentItem.expires_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  clearInterval(progressRef.current);
                  setViewing(null);
                }}
                className="w-9 h-9 flex items-center justify-center text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content — tap left/right to navigate */}
            <div
              className="flex-1 relative overflow-hidden"
              onClick={(e) => {
                const x = e.clientX;
                const w = window.innerWidth;
                if (x < w * 0.35) {
                  setActiveIdx((i) => Math.max(0, i - 1));
                } else {
                  if (activeIdx + 1 < viewing.items.length)
                    setActiveIdx((i) => i + 1);
                  else {
                    clearInterval(progressRef.current);
                    setViewing(null);
                  }
                }
              }}
            >
              {currentItem.media_type === "video" ? (
                <video
                  key={currentItem.id}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onEnded={() => {
                    if (activeIdx + 1 < viewing.items.length)
                      setActiveIdx((i) => i + 1);
                    else {
                      clearInterval(progressRef.current);
                      setViewing(null);
                    }
                  }}
                >
                  <source src={currentItem.media_url} />
                </video>
              ) : (
                <img
                  src={currentItem.media_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              )}

              {/* Tap zones hint (invisible) */}
              <div className="absolute inset-y-0 left-0 w-1/3" />
              <div className="absolute inset-y-0 right-0 w-1/3" />
            </div>

            {/* Bottom: delete button */}
            <div className="flex justify-center pb-8 pt-3">
              {(viewing.user_id === currentUser?.uid ||
                currentUser?.is_admin) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStoryDelete(currentItem.id);
                  }}
                  className="text-red-300 hover:text-red-400 text-sm bg-black/30 px-4 py-2 rounded-full"
                >
                  🗑 Удалить сторис
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Feed Timer Modal ──────────────────────────────────────────────────────────
const FeedTimerModal = ({ onExercise, onBreak }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
      <div className="text-5xl mb-4">⏰</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Время отдохнуть!
      </h2>
      <p className="text-gray-500 mb-6">
        Ты провёл в ленте 10 минут. Выбери, что делать дальше:
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={onExercise}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl hover:shadow-lg transition-all"
        >
          💪 Выполнить упражнение
        </button>
        <button
          onClick={onBreak}
          className="w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all"
        >
          ☕ Перерыв 30 минут
        </button>
      </div>
    </div>
  </div>
);

// ─── Exercise Modal ────────────────────────────────────────────────────────────
const ExerciseModal = ({ onDone }) => {
  const builtInExercises = [
    { emoji: "🏃", name: "10 прыжков на месте", author_name: null },
    { emoji: "💪", name: "10 отжиманий", author_name: null },
    { emoji: "🧘", name: "Глубокое дыхание — 5 вдохов", author_name: null },
    { emoji: "🚶", name: "Встань и пройдись 2 минуты", author_name: null },
    { emoji: "🤸", name: "10 приседаний", author_name: null },
  ];

  const [ex, setEx] = useState(
    () => builtInExercises[Math.floor(Math.random() * builtInExercises.length)],
  );

  // Try fetch a user-created challenge; mix it into rotation (~50% chance)
  useEffect(() => {
    let alive = true;
    challengeService
      .getRandom()
      .then((data) => {
        if (!alive || !data?.challenge) return;
        if (Math.random() < 0.5) {
          setEx({
            emoji: data.challenge.emoji || "💪",
            name: data.challenge.text,
            author_name: data.challenge.author_name,
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [phase, setPhase] = useState("idle"); // idle | recording | uploading | error
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  // Tick seconds while recording
  useEffect(() => {
    if (phase !== "recording") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : {},
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleStop(recorder.mimeType || "video/webm");
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      // Switch to recording phase first — the <video> element is rendered there
      setPhase("recording");
    } catch (err) {
      console.error(err);
      setError("Не удалось получить доступ к камере: " + (err.message || ""));
      setPhase("error");
    }
  };

  // Attach the stream to the video element once it appears in the DOM
  useEffect(() => {
    if (phase !== "recording") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    const tryPlay = () => {
      video.play().catch(() => {});
    };
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
    };
  }, [phase]);

  const handleStop = async (mimeType) => {
    setPhase("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `workout-${Date.now()}.${ext}`, {
        type: mimeType,
      });
      await postService.createPost(
        `${ex.emoji} Тренировка: ${ex.name}`,
        null,
        null,
        null,
        file,
      );
      // Stop the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      onDone();
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить видео");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center shadow-2xl">
        <div className="text-5xl mb-2">{ex.emoji}</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          Твоё упражнение:
        </h2>
        <p className="text-lg text-purple-600 font-semibold mb-1">{ex.name}</p>
        {ex.author_name && (
          <p className="text-xs text-gray-400 mb-3">
            Задание от @{ex.author_name}
          </p>
        )}
        {!ex.author_name && <div className="mb-3" />}

        {phase === "idle" && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Нажми кнопку — мы запишем видео твоей тренировки и опубликуем его
              в ленту, чтобы разблокировать её.
            </p>
            <button
              onClick={startRecording}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl hover:shadow-lg transition-all"
            >
              📷 Выполнить упражнение
            </button>
          </>
        )}

        {(phase === "recording" || phase === "uploading") && (
          <>
            <div className="relative mb-4 rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full max-h-72 object-cover"
              />
              {phase === "recording" && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  REC {Math.floor(seconds / 60)}:
                  {(seconds % 60).toString().padStart(2, "0")}
                </div>
              )}
            </div>
            {phase === "recording" ? (
              <button
                onClick={stopRecording}
                className="w-full py-3 px-6 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-2xl hover:shadow-lg transition-all"
              >
                ✅ Готово
              </button>
            ) : (
              <p className="text-sm text-purple-600 font-semibold py-3">
                Загружаем видео в ленту...
              </p>
            )}
          </>
        )}

        {phase === "error" && (
          <>
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4">
              {error}
            </p>
            <div className="flex gap-2">
              <button
                onClick={startRecording}
                className="flex-1 py-2.5 bg-purple-500 text-white font-semibold rounded-xl"
              >
                Повторить
              </button>
              <button
                onClick={onDone}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl"
              >
                Пропустить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Create Challenge Modal ────────────────────────────────────────────────────
const CreateChallengeModal = ({ onClose }) => {
  const EMOJIS = ["💪", "🏃", "🤸", "🧘", "🚶", "🕺", "💃", "🤾", "🦵", "🙌"];
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("💪");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState([]);
  const [success, setSuccess] = useState(false);

  const loadMine = () => {
    challengeService
      .getMine()
      .then(setMine)
      .catch(() => {});
  };

  useEffect(() => {
    loadMine();
  }, []);

  const submit = async () => {
    setError("");
    if (text.trim().length < 3) {
      setError("Минимум 3 символа");
      return;
    }
    setBusy(true);
    try {
      await challengeService.create(text.trim(), emoji);
      setText("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      loadMine();
    } catch (e) {
      setError(e.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const removeOne = async (id) => {
    try {
      await challengeService.delete(id);
      setMine((arr) => arr.filter((c) => c.id !== id));
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            ✏ Задание для других
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Придумай задание — оно случайно выпадет другим пользователям, когда у
          них закончится таймер ленты.
        </p>

        <div className="flex gap-2 mb-2">
          <select
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="px-2 py-2 rounded-xl border border-gray-200 text-xl"
          >
            {EMOJIS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="Например: 15 приседаний"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-purple-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg mb-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-600 text-sm bg-green-50 p-2 rounded-lg mb-2">
            ✅ Задание добавлено
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50"
        >
          {busy ? "..." : "Добавить"}
        </button>

        {mine.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Мои задания ({mine.length})
            </h3>
            <ul className="space-y-1.5">
              {mine.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-gray-700 truncate pr-2">
                    {c.emoji} {c.text}
                  </span>
                  <button
                    onClick={() => removeOne(c.id)}
                    className="text-gray-400 hover:text-red-500 text-lg shrink-0"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Feed Locked Screen ────────────────────────────────────────────────────────
const FeedLocked = ({ lockUntil, onUnlock }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(lockUntil) - Date.now()) / 1000),
      );
      setRemaining(diff);
      if (diff === 0) onUnlock();
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [lockUntil, onUnlock]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-white text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold mb-2">Лента заблокирована</h2>
      <p className="text-white/80 mb-6">Перерыв закончится через:</p>
      <div className="text-5xl font-mono font-bold bg-white/20 rounded-2xl px-8 py-4">
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <p className="text-sm text-white/60 mt-4">Профиль и сообщения доступны</p>
    </div>
  );
};

// ─── Post Component ────────────────────────────────────────────────────────────

// Jagged tear line at ~50% — mimics torn paper edge
const TEAR_TOP_CLIP = `polygon(
  0% 0%, 100% 0%, 100% 44%,
  97% 47%, 93% 43%, 89% 48%, 85% 44%, 81% 49%,
  77% 45%, 73% 50%, 69% 46%, 65% 51%, 61% 47%,
  57% 52%, 53% 48%, 49% 53%, 45% 49%, 41% 54%,
  37% 50%, 33% 46%, 29% 51%, 25% 47%, 21% 52%,
  17% 48%, 13% 44%, 9% 49%, 5% 45%, 2% 48%, 0% 46%
)`;
const TEAR_BOT_CLIP = `polygon(
  0% 46%, 2% 48%, 5% 45%, 9% 49%, 13% 44%, 17% 48%,
  21% 52%, 25% 47%, 29% 51%, 33% 46%, 37% 50%,
  41% 54%, 45% 49%, 49% 53%, 53% 48%, 57% 52%,
  61% 47%, 65% 51%, 69% 46%, 73% 50%, 77% 45%,
  81% 49%, 85% 44%, 89% 48%, 93% 43%, 97% 47%,
  100% 44%, 100% 100%, 0% 100%
)`;

const TEAR_CSS = `
  @keyframes postShake {
    0%,100% { transform: translateX(0) rotate(0deg); }
    15%     { transform: translateX(-6px) rotate(-1.5deg); }
    30%     { transform: translateX(6px) rotate(1.5deg); }
    45%     { transform: translateX(-5px) rotate(-1deg); }
    60%     { transform: translateX(5px) rotate(1deg); }
    75%     { transform: translateX(-3px) rotate(-0.5deg); }
    90%     { transform: translateX(3px) rotate(0.5deg); }
  }
  @keyframes tearFlyTop {
    0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 1; }
    20%  { transform: translateY(-20px) translateX(-10px) rotate(-4deg) scale(1.02); opacity: 1; }
    100% { transform: translateY(-160px) translateX(-60px) rotate(-22deg) scale(0.7); opacity: 0; }
  }
  @keyframes tearFlyBottom {
    0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 1; }
    20%  { transform: translateY(15px) translateX(8px) rotate(3deg) scale(1.02); opacity: 1; }
    100% { transform: translateY(130px) translateX(50px) rotate(18deg) scale(0.7); opacity: 0; }
  }
  .post-shaking   { animation: postShake 0.35s ease-in-out; }
  .post-tear-top  {
    clip-path: ${TEAR_TOP_CLIP};
    animation: tearFlyTop 0.7s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
    pointer-events: none;
    filter: drop-shadow(0 -4px 12px rgba(0,0,0,0.25));
  }
  .post-tear-bottom {
    clip-path: ${TEAR_BOT_CLIP};
    animation: tearFlyBottom 0.7s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
    pointer-events: none;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
  }
`;

const Post = ({
  post,
  currentUser,
  onLike,
  onAddComment,
  onVote,
  onDelete,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentFile, setCommentFile] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [tearPhase, setTearPhase] = useState("idle"); // idle | shaking | tearing
  const [postHeight, setPostHeight] = useState(0);
  const postRef = useRef(null);
  const liked = post.likes?.includes(currentUser?.uid);

  const handleDelete = () => {
    const isMine = post.author_id === currentUser?.uid;
    const msg = isMine
      ? "Удалить эту публикацию?"
      : "🛡 Удалить как администратор? (нарушения 18+, оскорбление религии, терроризм)";
    if (!confirm(msg)) return;
    // Capture height before animating
    if (postRef.current) setPostHeight(postRef.current.offsetHeight);
    setTearPhase("shaking");
    setTimeout(() => setTearPhase("tearing"), 360);
    setTimeout(() => onDelete(post.id), 1050);
  };

  // Normalize poll options (string or {text, votes})
  const pollOptions = post.poll_data?.options?.map((o) =>
    typeof o === "string" ? { text: o, votes: 0 } : o,
  );
  const totalVotes =
    pollOptions?.reduce((sum, o) => sum + (o.votes || 0), 0) || 0;
  const userVoted = post.poll_data?.voters?.[currentUser?.uid] !== undefined;
  const myVote = post.poll_data?.voters?.[currentUser?.uid];

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await postService.getComments(post.id);
      setComments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

  const submitComment = async () => {
    if (!newComment.trim() && !commentFile) return;
    await onAddComment(post.id, newComment, commentFile);
    setNewComment("");
    setCommentFile(null);
    setShowStickers(false);
    loadComments();
  };

  const insertSticker = (s) => {
    setNewComment((prev) => prev + s);
    setShowStickers(false);
  };

  // ── Tear phases ──────────────────────────────────────────────────────────────
  if (tearPhase === "tearing") {
    const h = postHeight || 160;
    const cardJSX = (
      <div style={{ width: "100%", height: h }}>
        <div
          className="bg-white/95 backdrop-blur rounded-2xl shadow-lg overflow-hidden"
          style={{ height: h }}
        >
          <div className="flex items-center gap-3 p-4">
            {post.avatar ? (
              <img
                src={post.avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                {post.username?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-800">@{post.username}</p>
              <p className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleString("ru-RU")}
              </p>
            </div>
          </div>
          {post.content && (
            <p className="px-4 pb-2 text-gray-800 text-sm whitespace-pre-wrap">
              {post.content}
            </p>
          )}
          {post.image && (
            <img
              src={post.image}
              alt=""
              className="w-full max-h-40 object-cover"
            />
          )}
        </div>
      </div>
    );
    return (
      <>
        <style>{TEAR_CSS}</style>
        <div
          style={{
            position: "relative",
            height: h,
            marginBottom: 16,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <div
            className="post-tear-top"
            style={{ position: "absolute", inset: 0 }}
          >
            {cardJSX}
          </div>
          <div
            className="post-tear-bottom"
            style={{ position: "absolute", inset: 0 }}
          >
            {cardJSX}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{TEAR_CSS}</style>
      <div
        ref={postRef}
        className={`bg-white/95 backdrop-blur rounded-2xl shadow-md mb-4 overflow-hidden${tearPhase === "shaking" ? " post-shaking" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <Link to={`/profile/${post.author_id}`}>
            {post.avatar ? (
              <img
                src={post.avatar}
                alt={post.username}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                {post.username?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </Link>
          <div>
            <Link
              to={`/profile/${post.author_id}`}
              className="font-semibold text-gray-800 hover:text-purple-600"
            >
              @{post.username}
            </Link>
            <p className="text-xs text-gray-400">
              {new Date(post.created_at).toLocaleString("ru-RU")}
            </p>
          </div>
          {(post.author_id === currentUser?.uid || currentUser?.is_admin) && (
            <button
              onClick={handleDelete}
              className={`ml-auto text-xl px-2 ${
                post.author_id === currentUser?.uid
                  ? "text-gray-300 hover:text-red-500"
                  : "text-red-400 hover:text-red-600"
              }`}
              title={
                post.author_id === currentUser?.uid
                  ? "Удалить пост"
                  : "Удалить как администратор"
              }
            >
              🗑
            </button>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="px-4 pb-3 text-gray-800 whitespace-pre-wrap">
            {post.content}
          </p>
        )}

        {/* Media */}
        {post.image && (
          <img
            src={post.image}
            alt="Post"
            loading="lazy"
            className="w-full max-h-96 object-cover"
          />
        )}
        {post.video && (
          <AutoVideo src={post.video} className="w-full max-h-96 bg-black" />
        )}

        {/* Poll */}
        {post.poll_data && pollOptions && (
          <div className="px-4 pb-3">
            <p className="font-semibold text-gray-700 mb-2">
              📊 {post.poll_data.question}
            </p>
            {pollOptions.map((opt, i) => {
              const pct = totalVotes
                ? Math.round((opt.votes / totalVotes) * 100)
                : 0;
              const isMy = userVoted && myVote === i;
              return (
                <button
                  key={i}
                  disabled={userVoted}
                  onClick={() => onVote(post.id, i)}
                  className={`w-full mb-2 relative overflow-hidden rounded-full border text-left transition-all ${
                    userVoted
                      ? "border-purple-200 cursor-default"
                      : "border-purple-300 hover:bg-purple-50"
                  } ${isMy ? "ring-2 ring-purple-500" : ""}`}
                >
                  {userVoted && (
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-200 to-pink-200"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between px-4 py-2 text-sm text-gray-700">
                    <span>
                      {isMy && "✓ "}
                      {opt.text}
                    </span>
                    {userVoted && (
                      <span className="text-xs font-semibold text-purple-700">
                        {pct}% ({opt.votes})
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {userVoted && (
              <p className="text-xs text-gray-400 mt-1">
                Всего голосов: {totalVotes}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 font-medium transition-all ${
              liked
                ? "text-red-500 scale-110"
                : "text-gray-400 hover:text-red-400"
            }`}
          >
            {liked ? "❤️" : "🤍"}
            <span>{post.likes?.length || 0}</span>
          </button>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-gray-400 hover:text-purple-500 font-medium"
          >
            💬 <span>{post.comments_count}</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="relative flex gap-2 mt-3 items-center">
              {showStickers && (
                <StickerPicker
                  onPick={insertSticker}
                  onClose={() => setShowStickers(false)}
                />
              )}
              <button
                type="button"
                onClick={() => setShowStickers((s) => !s)}
                className="text-2xl text-gray-400 hover:text-purple-500"
                title="Стикеры"
              >
                😊
              </button>
              <label
                className="cursor-pointer text-gray-400 hover:text-purple-500"
                title="Прикрепить файл"
              >
                📎
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setCommentFile(e.target.files[0])}
                />
              </label>
              <input
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Написать комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />
              <button
                onClick={submitComment}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:shadow"
              >
                OK
              </button>
            </div>
            {commentFile && (
              <div className="mt-2 flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded-lg px-2 py-1">
                <span>📎 {commentFile.name}</span>
                <button
                  onClick={() => setCommentFile(null)}
                  className="ml-auto text-red-400"
                >
                  ✕
                </button>
              </div>
            )}

            {loadingComments && (
              <p className="text-center text-gray-400 text-sm mt-3">
                Загрузка...
              </p>
            )}

            <div className="mt-3 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt=""
                      loading="lazy"
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 flex-shrink-0">
                      {c.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                    <Link
                      to={`/profile/${c.author_id}`}
                      className="text-xs font-semibold text-purple-600 hover:underline"
                    >
                      @{c.username}
                    </Link>
                    {c.text && (
                      <p className="text-sm text-gray-700 mt-0.5 break-words">
                        {c.text}
                      </p>
                    )}
                    {c.file_url && c.file_type === "image" && (
                      <img
                        src={c.file_url}
                        alt=""
                        className="mt-2 rounded-lg max-h-48"
                      />
                    )}
                    {c.file_url && c.file_type === "video" && (
                      <video
                        src={c.file_url}
                        controls
                        className="mt-2 rounded-lg max-h-48"
                      />
                    )}
                    {c.file_url &&
                      c.file_type !== "image" &&
                      c.file_type !== "video" && (
                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-purple-600 hover:underline"
                        >
                          📎 Скачать файл
                        </a>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Create Post ───────────────────────────────────────────────────────────────
const GraffitiModal = ({ onClose, onPost }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#7c3aed");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState("pen"); // pen | eraser
  const lastPos = useRef(null);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    // Scale from CSS pixels to canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? size * 4 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const submit = () => {
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], `graffiti-${Date.now()}.png`, {
        type: "image/png",
      });
      onPost(file);
    }, "image/png");
  };

  const COLORS = [
    "#7c3aed",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#000000",
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">🎨 Граффити-стена</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Color palette */}
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c && tool === "pen" ? "border-gray-700 scale-125" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
          <button
            onClick={() => setTool("eraser")}
            className={`px-2 h-7 rounded-full text-xs font-bold border-2 transition-colors ${tool === "eraser" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"}`}
          >
            ◻ Стёрка
          </button>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Размер:</span>
          {[2, 4, 8, 14].map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`rounded-full flex items-center justify-center border-2 transition ${size === s ? "border-purple-500" : "border-gray-200"}`}
              style={{ width: s * 3 + 12, height: s * 3 + 12 }}
            >
              <div
                className="rounded-full bg-gray-700"
                style={{ width: s, height: s }}
              />
            </button>
          ))}
          <button
            onClick={clearCanvas}
            className="ml-auto text-xs text-red-400 hover:text-red-600 font-semibold"
          >
            🗑 Очистить
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={380}
          height={240}
          className="rounded-xl border border-gray-200 touch-none w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />

        <div className="flex gap-2 mt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
          >
            🚀 Опубликовать
          </button>
        </div>
      </div>
    </div>
  );
};

const CreatePost = ({ currentUser, onCreated }) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => textareaRef.current?.focus(), 300);
    };
    window.addEventListener("lis:create-post", handler);
    return () => window.removeEventListener("lis:create-post", handler);
  }, []);

  const fileKind = file
    ? file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : "file"
    : null;

  const submit = async (e) => {
    e.preventDefault();
    const validPoll =
      showPoll && pollQ.trim() && pollOpts.filter((o) => o.trim()).length >= 2;
    if (!content.trim() && !file && !validPoll) return;
    setLoading(true);
    try {
      let pollData = null;
      if (validPoll) {
        pollData = {
          question: pollQ.trim(),
          options: pollOpts
            .filter((o) => o.trim())
            .map((o) => ({ text: o.trim(), votes: 0 })),
          voters: {},
        };
      }
      await postService.createPost(content, null, null, pollData, file);
      setContent("");
      setFile(null);
      setShowPoll(false);
      setPollQ("");
      setPollOpts(["", ""]);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/95 rounded-2xl shadow-md p-4 mb-4">
      <div className="flex gap-3 items-start">
        {currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            alt=""
            loading="lazy"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
            {currentUser?.username?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <form onSubmit={submit} className="flex-1">
          <textarea
            ref={textareaRef}
            className="w-full border border-gray-200 rounded-xl p-3 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
            rows={3}
            placeholder="Что у тебя нового?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {file && (
            <div className="mt-2 flex items-center gap-2 text-sm text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
              <span>
                {fileKind === "image"
                  ? "📷"
                  : fileKind === "video"
                    ? "🎥"
                    : "📎"}{" "}
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {showPoll && (
            <div className="mt-3 bg-purple-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700">
                  📊 Опрос
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPoll(false);
                    setPollQ("");
                    setPollOpts(["", ""]);
                  }}
                  className="text-xs text-red-400"
                >
                  Удалить опрос
                </button>
              </div>
              <input
                value={pollQ}
                onChange={(e) => setPollQ(e.target.value)}
                placeholder="Вопрос опроса"
                className="w-full px-3 py-2 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              />
              {pollOpts.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={o}
                    onChange={(e) => {
                      const next = [...pollOpts];
                      next[i] = e.target.value;
                      setPollOpts(next);
                    }}
                    placeholder={`Вариант ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  />
                  {pollOpts.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOpts(pollOpts.filter((_, j) => j !== i))
                      }
                      className="text-red-400 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {pollOpts.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOpts([...pollOpts, ""])}
                  className="text-xs text-purple-600 font-semibold"
                >
                  + Добавить вариант
                </button>
              )}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <label
                className="cursor-pointer text-gray-400 hover:text-purple-500"
                title="Фото"
              >
                <PhotoIcon className="w-6 h-6" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
              <label
                className="cursor-pointer text-gray-400 hover:text-purple-500"
                title="Видео"
              >
                <VideoCameraIcon className="w-6 h-6" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
              <label
                className="cursor-pointer text-gray-400 hover:text-purple-500 text-xl"
                title="Любой файл"
              >
                📎
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowPoll((s) => !s)}
                className={`text-xl ${showPoll ? "text-purple-600" : "text-gray-400 hover:text-purple-500"}`}
                title="Опрос"
              >
                📊
              </button>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("lis:open-graffiti"))
                }
                className="text-xl text-gray-400 hover:text-purple-500 transition-colors"
                title="Граффити"
              >
                🎨
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-full font-semibold text-sm hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? "Публикую..." : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Feed ─────────────────────────────────────────────────────────────────
export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [elapsed, setElapsed] = useState(0);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showExercise, setShowExercise] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(null);

  // Premium state — from context (single source of truth)
  const {
    isPremium: premium,
    premiumExpires: premiumUntil,
    refresh: refreshPremium,
  } = usePremium();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Challenge creation modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Graffiti
  const [showGraffiti, setShowGraffiti] = useState(false);

  useEffect(() => {
    const handler = () => setShowGraffiti(true);
    window.addEventListener("lis:open-graffiti", handler);
    return () => window.removeEventListener("lis:open-graffiti", handler);
  }, []);

  const handlePremiumActivated = () => {
    setShowPremiumModal(false);
    setLocked(false);
    setLockUntil(null);
    setElapsed(0);
    refreshPremium();
  };

  const loadFeed = useCallback(async () => {
    try {
      const data = await postService.getFeed();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Check server timer status on mount
  useEffect(() => {
    timerService
      .getStatus()
      .then((data) => {
        if (data.isLocked && data.lockUntil) {
          setLocked(true);
          setLockUntil(data.lockUntil);
        } else {
          setElapsed(data.sessionTime || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Client-side timer tick (premium users skip)
  useEffect(() => {
    if (premium || locked || showTimerModal || showExercise) return;
    const iv = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= TIMER_LIMIT) {
          clearInterval(iv);
          setShowTimerModal(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [locked, showTimerModal, showExercise]);

  const handleExercise = () => {
    setShowTimerModal(false);
    setShowExercise(true);
  };

  const handleBreak = async () => {
    try {
      const data = await timerService.lock();
      setLockUntil(data.lockUntil);
    } catch {
      const until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      setLockUntil(until);
    }
    setShowTimerModal(false);
    setLocked(true);
  };

  const handleExerciseDone = async () => {
    setShowExercise(false);
    setElapsed(0);
    try {
      await timerService.updateTime(0);
    } catch {}
    // Reload feed so the freshly published workout video appears at the top
    loadFeed();
  };

  const handleUnlock = () => {
    setLocked(false);
    setLockUntil(null);
    setElapsed(0);
  };

  const handleLike = async (postId) => {
    try {
      const result = await postService.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: result.likes } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId, text, file) => {
    try {
      await postService.addComment(postId, text, file);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await postService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить пост");
    }
  };

  const handleVote = async (postId, optionIndex) => {
    try {
      const data = await postService.votePoll(postId, optionIndex);
      const newPoll = data.poll || data.poll_data;
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, poll_data: newPoll } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Timer bar display
  const timerPercent = Math.min((elapsed / TIMER_LIMIT) * 100, 100);
  const timerMins = Math.floor(elapsed / 60);
  const timerSecs = elapsed % 60;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      {/* Premium banner / Timer progress bar */}
      {premium ? (
        <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur rounded-xl px-3 py-2 text-white text-xs">
          <span>
            💎 Премиум активен
            {premiumUntil
              ? ` до ${new Date(premiumUntil).toLocaleDateString("ru-RU")}`
              : ""}
          </span>
          <button
            onClick={() => setShowChallengeModal(true)}
            className="text-pink-200 font-semibold hover:text-pink-100"
          >
            ✏ Задание
          </button>
        </div>
      ) : (
        !locked && (
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs text-white/70 mb-1 gap-2">
              <span>
                ⏱ {timerMins}:{timerSecs.toString().padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChallengeModal(true)}
                  className="text-pink-200 font-semibold hover:text-pink-100"
                  title="Придумать задание для других"
                >
                  ✏ Задание
                </button>
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="text-yellow-200 font-semibold hover:text-yellow-100"
                >
                  💎 Премиум
                </button>
              </div>
              <span>10:00</span>
            </div>
            <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-300 to-pink-400 transition-all duration-1000"
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>
        )
      )}

      {/* Modals */}
      {showTimerModal && (
        <FeedTimerModal onExercise={handleExercise} onBreak={handleBreak} />
      )}
      {showExercise && <ExerciseModal onDone={handleExerciseDone} />}
      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onActivated={handlePremiumActivated}
        />
      )}
      {showChallengeModal && (
        <CreateChallengeModal onClose={() => setShowChallengeModal(false)} />
      )}
      {showGraffiti && (
        <GraffitiModal
          onClose={() => setShowGraffiti(false)}
          onPost={async (file) => {
            setShowGraffiti(false);
            try {
              await postService.createPost("", null, null, null, file);
              loadFeed();
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}

      {locked ? (
        <FeedLocked lockUntil={lockUntil} onUnlock={handleUnlock} />
      ) : (
        <>
          <StoriesBar currentUser={user} isPremium={premium} />
          <CreatePost currentUser={user} onCreated={loadFeed} />

          {posts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-white">
              <p className="text-xl font-semibold">Лента пуста</p>
              <p className="text-white/70 mt-1">
                Будь первым, кто что-то опубликует!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onAddComment={handleAddComment}
                onVote={handleVote}
                onDelete={handleDeletePost}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
