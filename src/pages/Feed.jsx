import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  postService,
  storyService,
  timerService,
  premiumService,
} from "../services";
import { PhotoIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
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

// ─── Premium Modal ────────────────────────────────────────────────────────────
const PremiumModal = ({ onClose, onActivated }) => {
  const [phone, setPhone] = useState(PAYMENT_PHONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      await premiumService.activate(phone);
      onActivated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-3">💎</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Lis Премиум</h2>
        <p className="text-gray-600 text-sm mb-4">
          Отключи таймер ленты на 30 дней.
        </p>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 mb-4 text-left">
          <p className="text-xs text-gray-500 mb-1">Стоимость</p>
          <p className="text-3xl font-bold text-purple-700 mb-3">299 ₽</p>
          <p className="text-xs text-gray-500 mb-1">Перевод по СБП на номер:</p>
          <p className="text-lg font-bold text-gray-800 select-all">
            {PAYMENT_PHONE}
          </p>
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Подтвердите номер перевода"
          className="w-full mb-3 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
        />
        {error && (
          <p className="text-red-500 text-xs mb-3 bg-red-50 p-2 rounded-lg">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200"
          >
            Отмена
          </button>
          <button
            onClick={handlePay}
            disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50"
          >
            {loading ? "..." : "Я оплатил ✓"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stories Bar ──────────────────────────────────────────────────────────────
const StoriesBar = ({ currentUser }) => {
  const [stories, setStories] = useState([]);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    storyService
      .getStories()
      .then(setStories)
      .catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await storyService.createStory(file);
      const updated = await storyService.getStories();
      setStories(updated);
    } catch (err) {
      console.error("Story upload error:", err);
    }
  };

  // group by user
  const grouped = {};
  stories.forEach((s) => {
    if (!grouped[s.user_id]) grouped[s.user_id] = { ...s, items: [] };
    grouped[s.user_id].items.push(s);
  });
  const groups = Object.values(grouped);

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow mb-4 p-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {/* Add story button */}
        <button
          onClick={() => fileRef.current.click()}
          className="flex-shrink-0 flex flex-col items-center gap-1"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl border-2 border-white shadow">
            +
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
            onClick={() => setViewing(group)}
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

      {/* Story viewer modal */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setViewing(null)}
        >
          <div
            className="relative max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewing(null)}
              className="absolute top-2 right-2 text-white text-2xl z-10"
            >
              ✕
            </button>
            <div className="text-white text-sm mb-2 flex items-center gap-2">
              <img
                src={viewing.avatar || "/fox.gif"}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="font-semibold">@{viewing.username}</span>
            </div>
            {viewing.items[0]?.media_type === "video" ? (
              <video autoPlay controls className="w-full rounded-xl">
                <source src={viewing.items[0].media_url} />
              </video>
            ) : (
              <img
                src={viewing.items[0]?.media_url}
                alt="Story"
                className="w-full rounded-xl"
                loading="lazy"
              />
            )}
          </div>
        </div>
      )}
    </div>
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
  const exercises = [
    { emoji: "🏃", name: "10 прыжков на месте" },
    { emoji: "💪", name: "10 отжиманий" },
    { emoji: "🧘", name: "Глубокое дыхание — 5 вдохов" },
    { emoji: "🚶", name: "Встань и пройдись 2 минуты" },
    { emoji: "🤸", name: "10 приседаний" },
  ];
  const exRef = useRef(exercises[Math.floor(Math.random() * exercises.length)]);
  const ex = exRef.current;

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
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
      setPhase("recording");
    } catch (err) {
      console.error(err);
      setError("Не удалось получить доступ к камере: " + (err.message || ""));
      setPhase("error");
    }
  };

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
        <p className="text-lg text-purple-600 font-semibold mb-4">{ex.name}</p>

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
  const liked = post.likes?.includes(currentUser?.uid);

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

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md mb-4 overflow-hidden">
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
        {post.author_id === currentUser?.uid && (
          <button
            onClick={() => {
              if (confirm("Удалить эту публикацию?")) onDelete(post.id);
            }}
            className="ml-auto text-gray-300 hover:text-red-500 text-xl px-2"
            title="Удалить пост"
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
  );
};

// ─── Create Post ───────────────────────────────────────────────────────────────
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

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-3 items-center">
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
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full font-semibold text-sm hover:shadow-lg disabled:opacity-50 transition-all"
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

  // Premium state
  const [premium, setPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    premiumService
      .getStatus()
      .then((d) => {
        setPremium(!!d.premium);
        setPremiumUntil(d.premiumUntil || null);
      })
      .catch(() => {});
  }, []);

  const handlePremiumActivated = () => {
    setShowPremiumModal(false);
    setLocked(false);
    setLockUntil(null);
    setElapsed(0);
    premiumService.getStatus().then((d) => {
      setPremium(!!d.premium);
      setPremiumUntil(d.premiumUntil || null);
    });
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
          <span>Без таймера</span>
        </div>
      ) : (
        !locked && (
          <div className="mb-3">
            <div className="flex justify-between items-center text-xs text-white/70 mb-1">
              <span>
                ⏱ {timerMins}:{timerSecs.toString().padStart(2, "0")}
              </span>
              <button
                onClick={() => setShowPremiumModal(true)}
                className="text-yellow-200 font-semibold hover:text-yellow-100"
              >
                💎 Премиум
              </button>
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

      {locked ? (
        <FeedLocked lockUntil={lockUntil} onUnlock={handleUnlock} />
      ) : (
        <>
          <StoriesBar currentUser={user} />
          <CreatePost currentUser={user} onCreated={loadFeed} />

          {posts.length === 0 ? (
            <div className="text-center py-16 text-white">
              <div className="text-5xl mb-3">🦊</div>
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
