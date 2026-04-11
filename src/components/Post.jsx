import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

export default function Post({ post, onUpdate }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(
    post.likeCount || post.likes?.length || 0,
  );
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [sending, setSending] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [voting, setVoting] = useState(false);

  const videoRef = useRef(null);

  const postContent =
    typeof post.content === "string"
      ? safeParseJson(post.content, null)
      : post.content;
  const isChainNotification =
    postContent?.type === "chain_notification" ||
    post.type === "chain_notification";

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!post.video || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.6 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [post.video]);

  useEffect(() => {
    const expiresAt = postContent?.expiresAt || post.expiresAt;
    if (isChainNotification && expiresAt) {
      const calculateTimeLeft = () => {
        const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
        const now = new Date();
        const diff = exp - now;
        if (diff > 0) {
          return {
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
            total: diff,
          };
        }
        return null;
      };
      setTimeLeft(calculateTimeLeft());
      const timer = setInterval(() => {
        const newTime = calculateTimeLeft();
        setTimeLeft(newTime);
        if (!newTime) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isChainNotification, postContent?.expiresAt, post.expiresAt]);

  useEffect(() => {
    if (currentUser && post.likedBy) {
      setLiked(post.likedBy.includes(currentUser.uid));
      setLikesCount(post.likeCount || 0);
    }
  }, [currentUser, post.likedBy, post.likeCount]);

  // 🔷 Загрузка комментариев
  useEffect(() => {
    if (!post.postId && !post.id) return;
    const postId = post.postId || post.id;
    let intervalId;
    const loadComments = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (error) {
        console.error("Error loading comments:", error);
      }
    };
    loadComments();
    intervalId = setInterval(loadComments, 5000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [post.postId, post.id]);

  // 🔷 ЛАЙК / УНЛАЙК
  const handleLike = async () => {
    if (!currentUser) return;
    try {
      const postId = post.postId || post.id;
      const action = liked ? "unlike" : "like";
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likeCount);
        onUpdate?.();
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // 🔷 ГОЛОСОВАНИЕ В ОПРОСЕ
  const handleVote = async () => {
    if (!currentUser || selectedOptions.length === 0 || !post.poll) return;
    if (post.poll.voters?.includes(currentUser.uid)) {
      alert("❌ Вы уже проголосовали в этом опросе!");
      return;
    }
    setVoting(true);
    try {
      const postId = post.postId || post.id;
      const updatedOptions = post.poll.options.map((opt, index) => ({
        ...opt,
        votes: selectedOptions.includes(index)
          ? (opt.votes || 0) + 1
          : opt.votes || 0,
      }));
      const newVoters = [...(post.poll.voters || []), currentUser.uid];
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          poll: { ...post.poll, options: updatedOptions, voters: newVoters },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка голосования");
      }
      setSelectedOptions([]);
      onUpdate?.();
    } catch (error) {
      console.error("Error voting:", error);
      alert("Ошибка голосования: " + error.message);
    } finally {
      setVoting(false);
    }
  };

  // 🔷 ДОБАВИТЬ КОММЕНТАРИЙ
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || sending) return;
    setSending(true);
    try {
      const postId = post.postId || post.id;
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ text: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewComment("");
        setComments([...comments, data.comment]);
        onUpdate?.();
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setSending(false);
    }
  };

  // 🔷 УДАЛИТЬ КОММЕНТАРИЙ
  const handleDeleteComment = async (commentId, authorId) => {
    if (authorId !== currentUser?.uid) {
      alert("❌ Можно удалять только свои комментарии!");
      return;
    }
    if (!confirm("Удалить комментарий?")) return;
    try {
      const postId = post.postId || post.id;
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });
      if (res.ok) {
        setComments(
          comments.filter((c) => (c.commentId || c.id) !== commentId),
        );
        onUpdate?.();
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Ошибка: " + error.message);
    }
  };

  // 🔷 УДАЛИТЬ ПОСТ
  const handleDelete = async () => {
    const authorId = post.userId || post.authorId;
    if (authorId && authorId !== currentUser?.uid) {
      alert("Вы можете удалять только свои посты!");
      return;
    }
    if (!confirm("Удалить этот пост? Это действие нельзя отменить.")) return;
    try {
      const postId = post.postId || post.id;
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });
      if (res.ok) {
        onUpdate?.();
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Ошибка при удалении: " + error.message);
    }
  };

  const handleNotificationClick = () => {
    const chainId = postContent?.chainId || post.chainId;
    if (chainId) navigate(`/photo-chain?highlight=${chainId}`);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  const getProgressPercentage = () => {
    const count = postContent?.participantCount || post.participantCount;
    const max = postContent?.maxParticipants || post.maxParticipants;
    if (!count || !max) return 0;
    return (count / max) * 100;
  };

  const getTotalVotes = () => {
    if (!post.poll || !post.poll.options) return 0;
    return post.poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  };

  const hasVoted = post.poll?.voters?.includes(currentUser?.uid);
  const postId = post.postId || post.id;
  const authorId = post.userId || post.authorId;

  const toggleVideoSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setVideoMuted(videoRef.current.muted);
    }
  };

  function safeParseJson(val, fallback = null) {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden mb-4 transition-all duration-500 ${isAnimating ? "opacity-0 translate-y-10" : "opacity-100 translate-y-0"}`}
    >
      {isChainNotification ? (
        <div
          onClick={handleNotificationClick}
          className="p-4 cursor-pointer hover:bg-purple-50 transition-all duration-300 group"
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <Link
                to={`/profile/${authorId}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-purple-400 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <img
                    src={post.avatar || "/fox.gif"}
                    alt={post.username}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </Link>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white text-xs">📸</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-gray-800 font-semibold text-base leading-tight group-hover:text-purple-700 transition-colors hover:underline"
              >
                @{post.username}
              </Link>
              <span className="text-gray-800 font-semibold text-base leading-tight">
                {" "}
                добавил фото в эстафету
              </span>
              {(postContent?.participantCount || post.participantCount) &&
                (postContent?.maxParticipants || post.maxParticipants) && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-purple-600 font-medium">
                        👥{" "}
                        {postContent?.participantCount || post.participantCount}
                        /{postContent?.maxParticipants || post.maxParticipants}{" "}
                        участников
                      </span>
                      {timeLeft && (
                        <span
                          className={`text-xs font-semibold ${timeLeft.hours < 2 ? "text-red-500 animate-pulse" : "text-gray-500"}`}
                        >
                          ⏰ {timeLeft.hours}ч {timeLeft.minutes}м{" "}
                          {timeLeft.seconds}с
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                    </div>
                  </div>
                )}
              <p className="text-purple-600 text-sm mt-2 font-semibold group-hover:translate-x-1 transition-transform inline-block">
                Нажмите чтобы посмотреть 👉
              </p>
            </div>
            <div className="text-purple-500 text-2xl self-center group-hover:translate-x-1 transition-transform">
              →
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full animate-pulse" />
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              to={`/profile/${authorId}`}
              className="flex items-center gap-3"
            >
              <Avatar src={post.avatar} username={post.username} size="md" />
              <div>
                <p className="font-semibold text-gray-900 hover:text-purple-600 transition-colors hover:underline">
                  @{post.username || "Аноним"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(post.createdAt)}
                </p>
              </div>
            </Link>
            {authorId === currentUser?.uid && (
              <button
                onClick={handleDelete}
                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                title="Удалить пост"
              >
                ✕
              </button>
            )}
          </div>

          {post.content && typeof post.content !== "object" && (
            <p className="text-gray-800 mb-3 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          )}
          {post.mediaType && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {post.mediaType === "video"
                  ? "🎥 Видео"
                  : post.mediaType === "image"
                    ? "📸 Фото"
                    : "📝 Текст"}
              </span>
            </div>
          )}

          {(post.imageUrl || post.photoUrl || post.image) && (
            <img
              src={post.imageUrl || post.photoUrl || post.image}
              alt="Post"
              className="w-full rounded-xl mb-3 object-cover max-h-96 cursor-pointer hover:opacity-95 transition-opacity"
              loading="lazy"
              onClick={() =>
                window.open(
                  post.imageUrl || post.photoUrl || post.image,
                  "_blank",
                )
              }
            />
          )}

          {post.video && (
            <div className="relative mb-3 group">
              <video
                ref={videoRef}
                src={post.video}
                controls
                muted={videoMuted}
                loop
                playsInline
                preload="metadata"
                className="w-full rounded-xl object-cover max-h-96 bg-black cursor-pointer"
                onClick={(e) => {
                  const video = e.currentTarget;
                  video.muted = !video.muted;
                  setVideoMuted(video.muted);
                }}
              />
              <button
                className="absolute bottom-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                onClick={toggleVideoSound}
                title={videoMuted ? "Включить звук" : "Выключить звук"}
              >
                {videoMuted ? "🔇" : "🔊"}
              </button>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white/80 text-4xl drop-shadow-lg">
                  ▶️
                </span>
              </div>
            </div>
          )}

          {post.isPoll &&
            post.poll &&
            post.poll.options &&
            post.poll.options.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-purple-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    <span>Опрос</span>
                  </h3>
                  <div className="space-y-2">
                    {post.poll.options.map((option, index) => {
                      const totalVotes = getTotalVotes();
                      const percentage =
                        totalVotes > 0
                          ? Math.round(((option.votes || 0) / totalVotes) * 100)
                          : 0;
                      const isSelected = selectedOptions.includes(index);
                      return (
                        <div key={index} className="relative">
                          {hasVoted ? (
                            <div className="relative bg-white rounded-xl p-3 border border-purple-200 overflow-hidden">
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-20"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="relative flex justify-between items-center">
                                <span className="text-gray-800 font-medium">
                                  {option.text}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-purple-600 font-bold text-sm">
                                    {percentage}%
                                  </span>
                                  <span className="text-gray-500 text-xs">
                                    ({option.votes || 0})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label
                              className={`flex items-center gap-3 bg-white rounded-xl p-3 border-2 cursor-pointer transition-all ${isSelected ? "border-purple-500 bg-purple-50" : "border-purple-200 hover:border-purple-400"}`}
                            >
                              <input
                                type={
                                  post.poll.allowMultiple ? "checkbox" : "radio"
                                }
                                name={`poll-${postId}`}
                                checked={isSelected}
                                onChange={() => {
                                  if (post.poll.allowMultiple) {
                                    setSelectedOptions(
                                      isSelected
                                        ? selectedOptions.filter(
                                            (i) => i !== index,
                                          )
                                        : [...selectedOptions, index],
                                    );
                                  } else {
                                    setSelectedOptions([index]);
                                  }
                                }}
                                className="w-5 h-5 text-purple-600 rounded"
                              />
                              <span className="text-gray-800 font-medium flex-1">
                                {option.text}
                              </span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!hasVoted && (
                    <button
                      onClick={handleVote}
                      disabled={selectedOptions.length === 0 || voting}
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {voting
                        ? "⏳ Голосование..."
                        : `🗳️ Голосовать (${getTotalVotes()} голосов)`}
                    </button>
                  )}
                  {hasVoted && (
                    <p className="text-center text-green-600 font-semibold mt-3">
                      ✅ Вы проголосовали!
                    </p>
                  )}
                </div>
              </div>
            )}

          <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-all ${liked ? "text-pink-500 scale-110" : "text-gray-600 hover:text-pink-500"}`}
            >
              <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
              <span className="font-medium">{likesCount}</span>
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-all"
            >
              <span className="text-xl">💬</span>
              <span className="font-medium">{comments.length}</span>
            </button>
          </div>

          {showComments && (
            <div className="mt-4 space-y-3">
              {comments.map((comment) => {
                // 🔧 ИСПРАВЛЕНО: получаем ID автора из comment.author.uid
                const commentAuthorId =
                  comment.author?.uid || comment.userId || comment.authorId;
                const isOwnComment = commentAuthorId === currentUser?.uid;
                const commentUsername =
                  comment.author?.username || comment.username || "anon";
                const commentAvatar =
                  comment.author?.avatar || comment.avatar || "/fox.gif";

                return (
                  <div
                    key={comment.commentId || comment.id}
                    className="flex gap-2"
                  >
                    <Link
                      to={`/profile/${commentAuthorId}`}
                      className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-300 flex-shrink-0"
                    >
                      <img
                        src={commentAvatar}
                        alt={commentUsername}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </Link>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 relative">
                      <div className="flex items-center gap-2 mb-1">
                        {/* 🔗 КЛИКАБЕЛЬНЫЙ ЮЗЕРНЕЙМ */}
                        <Link
                          to={`/profile/${commentAuthorId}`}
                          className="font-semibold text-sm text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          @{commentUsername}
                        </Link>
                        <span className="text-gray-400 text-xs">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {comment.text}
                      </p>
                      {isOwnComment && (
                        <button
                          onClick={() =>
                            handleDeleteComment(
                              comment.commentId || comment.id,
                              commentAuthorId,
                            )
                          }
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  style={{ color: "#000" }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || sending}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {sending ? "⏳" : "➕"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
