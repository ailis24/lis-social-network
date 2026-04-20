import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postService, storyService, timerService } from "../services";
import { PhotoIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

const TIMER_LIMIT = 10 * 60; // 10 minutes in seconds

// ─── Stories Bar ──────────────────────────────────────────────────────────────
const StoriesBar = ({ currentUser }) => {
  const [stories, setStories] = useState([]);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    storyService.getStories().then(setStories).catch(() => {});
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
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />

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
          <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewing(null)}
              className="absolute top-2 right-2 text-white text-2xl z-10"
            >✕</button>
            <div className="text-white text-sm mb-2 flex items-center gap-2">
              <img src={viewing.avatar || "/fox.gif"} alt="" className="w-8 h-8 rounded-full object-cover" />
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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Время отдохнуть!</h2>
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
  const ex = exercises[Math.floor(Math.random() * exercises.length)];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">{ex.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Твоё упражнение:</h2>
        <p className="text-xl text-purple-600 font-semibold mb-6">{ex.name}</p>
        <button
          onClick={onDone}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl hover:shadow-lg transition-all"
        >
          ✅ Готово! Продолжить
        </button>
      </div>
    </div>
  );
};

// ─── Feed Locked Screen ────────────────────────────────────────────────────────
const FeedLocked = ({ lockUntil, onUnlock }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(lockUntil) - Date.now()) / 1000));
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
const Post = ({ post, currentUser, onLike, onAddComment }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const liked = post.likes?.includes(currentUser?.uid);

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
    if (!newComment.trim()) return;
    await onAddComment(post.id, newComment);
    setNewComment("");
    loadComments();
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
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-gray-800 whitespace-pre-wrap">{post.content}</p>
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
        <video controls className="w-full max-h-96">
          <source src={post.video} />
        </video>
      )}

      {/* Poll */}
      {post.poll_data && (
        <div className="px-4 pb-3">
          <p className="font-semibold text-gray-700 mb-2">{post.poll_data.question}</p>
          {post.poll_data.options?.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-purple-100 rounded-full h-8 flex items-center px-3 text-sm text-gray-700">
                {opt}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 font-medium transition-all ${
            liked ? "text-red-500 scale-110" : "text-gray-400 hover:text-red-400"
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
          <div className="flex gap-2 mt-3">
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

          {loadingComments && <p className="text-center text-gray-400 text-sm mt-3">Загрузка...</p>}

          <div className="mt-3 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2 items-start">
                {c.avatar ? (
                  <img src={c.avatar} alt="" loading="lazy" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
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
                  <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
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
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image && !video) return;
    setLoading(true);
    try {
      await postService.createPost(content, image, video);
      setContent("");
      setImage(null);
      setVideo(null);
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
          <img src={currentUser.avatar} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
            {currentUser?.username?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <form onSubmit={submit} className="flex-1">
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
            rows={3}
            placeholder="Что у тебя нового?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {(image || video) && (
            <div className="mt-2 flex items-center gap-2 text-sm text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
              <span>{image ? `📷 ${image.name}` : `🎥 ${video.name}`}</span>
              <button
                type="button"
                onClick={() => { setImage(null); setVideo(null); }}
                className="ml-auto text-red-400 hover:text-red-600"
              >✕</button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-3">
              <label className="cursor-pointer text-gray-400 hover:text-purple-500">
                <PhotoIcon className="w-6 h-6" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { setImage(e.target.files[0]); setVideo(null); }} />
              </label>
              <label className="cursor-pointer text-gray-400 hover:text-purple-500">
                <VideoCameraIcon className="w-6 h-6" />
                <input type="file" accept="video/*" className="hidden"
                  onChange={(e) => { setVideo(e.target.files[0]); setImage(null); }} />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading || (!content.trim() && !image && !video)}
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
    timerService.getStatus().then((data) => {
      if (data.isLocked && data.lockUntil) {
        setLocked(true);
        setLockUntil(data.lockUntil);
      } else {
        setElapsed(data.sessionTime || 0);
      }
    }).catch(() => {});
  }, []);

  // Client-side timer tick
  useEffect(() => {
    if (locked || showTimerModal || showExercise) return;
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
    try { await timerService.updateTime(0); } catch {}
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
        prev.map((p) => (p.id === postId ? { ...p, likes: result.likes } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      await postService.addComment(postId, text);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
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
      {/* Timer progress bar */}
      {!locked && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>⏱ {timerMins}:{timerSecs.toString().padStart(2, "0")}</span>
            <span>10:00</span>
          </div>
          <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-300 to-pink-400 transition-all duration-1000"
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {showTimerModal && (
        <FeedTimerModal onExercise={handleExercise} onBreak={handleBreak} />
      )}
      {showExercise && (
        <ExerciseModal onDone={handleExerciseDone} />
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
              <p className="text-white/70 mt-1">Будь первым, кто что-то опубликует!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onAddComment={handleAddComment}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
