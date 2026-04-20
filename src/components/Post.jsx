import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Post({ post, onUpdate }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (currentUser && post.likes) {
      setLiked(post.likes.includes(currentUser.uid));
      setLikesCount(post.likes.length);
    }
  }, [currentUser, post.likes]);

  // Загрузка комментариев
  useEffect(() => {
    if (!showComments || !post.id) return;

    const loadComments = async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`, {
          headers: { "X-User-Id": currentUser?.uid || "" },
        });
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (error) {
        console.error("Load comments error:", error);
      }
    };

    loadComments();
  }, [showComments, post.id, currentUser]);

  // Лайк
  const handleLike = async () => {
    if (!currentUser) return;

    try {
      const action = liked ? "unlike" : "like";
      const res = await fetch(`/api/posts/${post.id}/like`, {
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
        setLikesCount(data.count);
        onUpdate?.();
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  // Голосование в опросе
  const handleVote = async () => {
    if (!currentUser || selectedOptions.length === 0 || !post.poll) return;

    if (post.poll.voters?.includes(currentUser.uid)) {
      alert("❌ Вы уже проголосовали!");
      return;
    }

    setVoting(true);
    try {
      const updatedOptions = post.poll.options.map((opt, index) => ({
        ...opt,
        votes: selectedOptions.includes(index)
          ? (opt.votes || 0) + 1
          : opt.votes || 0,
      }));

      const newVoters = [...(post.poll.voters || []), currentUser.uid];

      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          poll: { ...post.poll, options: updatedOptions, voters: newVoters },
        }),
      });

      if (res.ok) {
        setSelectedOptions([]);
        onUpdate?.();
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setVoting(false);
    }
  };

  // Добавление комментария
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ text: newComment }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Comment error:", error);
    } finally {
      setSending(false);
    }
  };

  // Удаление комментария
  const handleDeleteComment = async (commentId, authorId) => {
    if (authorId !== currentUser?.uid) {
      alert("❌ Можно удалять только свои комментарии!");
      return;
    }

    if (!confirm("Удалить комментарий?")) return;

    try {
      const res = await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });

      if (res.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error("Delete comment error:", error);
    }
  };

  // Удаление поста
  const handleDelete = async () => {
    const authorId = post.author_id || post.author?.uid;

    if (authorId !== currentUser?.uid) {
      alert("❌ Можно удалять только свои посты!");
      return;
    }

    if (!confirm("Удалить пост?")) return;

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });

      if (res.ok) {
        onUpdate?.();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  const getTotalVotes = () => {
    if (!post.poll || !post.poll.options) return 0;
    return post.poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  };

  const authorId = post.author_id;
  const authorUsername = post.author?.username || post.username || "anon";
  const authorAvatar = post.author?.avatar || post.avatar || "/fox.gif";

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden mb-4">
      {/* Шапка поста */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${authorId}`}>
            <img
              src={authorAvatar}
              alt={authorUsername}
              className="w-10 h-10 rounded-full object-cover border-2 border-purple-300"
            />
          </Link>
          <div>
            <Link
              to={`/profile/${authorId}`}
              className="font-bold text-gray-800 hover:text-purple-600 hover:underline"
            >
              @{authorUsername}
            </Link>
            <p className="text-xs text-gray-500">
              {formatTime(post.created_at)}
            </p>
          </div>
        </div>

        {authorId === currentUser?.uid && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 p-2"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Текст */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap">{post.text}</p>
        </div>
      )}

      {/* Фото */}
      {post.image && (
        <img src={post.image} alt="" className="w-full object-cover max-h-96" />
      )}

      {/* Видео */}
      {post.video && (
        <div className="relative">
          <video
            src={post.video}
            controls
            muted={videoMuted}
            loop
            className="w-full max-h-96 bg-black"
          />
          <button
            onClick={() => setVideoMuted(!videoMuted)}
            className="absolute bottom-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full"
          >
            {videoMuted ? "🔇" : "🔊"}
          </button>
        </div>
      )}

      {/* Опрос */}
      {post.isPoll && post.poll && post.poll.options && (
        <div className="px-4 py-3 bg-purple-50">
          <h3 className="font-bold text-gray-800 mb-3">📊 Опрос</h3>
          <div className="space-y-2">
            {post.poll.options.map((option, index) => {
              const totalVotes = getTotalVotes();
              const percentage =
                totalVotes > 0
                  ? Math.round(((option.votes || 0) / totalVotes) * 100)
                  : 0;
              const isSelected = selectedOptions.includes(index);
              const hasVoted = post.poll.voters?.includes(currentUser?.uid);

              return (
                <div key={index}>
                  {hasVoted ? (
                    <div className="relative bg-white rounded-xl p-3 border border-purple-200 overflow-hidden">
                      <div
                        className="absolute inset-0 bg-purple-400 opacity-20"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex justify-between">
                        <span className="text-gray-800 font-medium">
                          {option.text}
                        </span>
                        <span className="text-purple-600 font-bold">
                          {percentage}% ({option.votes || 0})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={`flex items-center gap-3 bg-white rounded-xl p-3 border-2 cursor-pointer ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-purple-200"
                      }`}
                    >
                      <input
                        type={post.poll.allowMultiple ? "checkbox" : "radio"}
                        checked={isSelected}
                        onChange={() => {
                          if (post.poll.allowMultiple) {
                            setSelectedOptions(
                              isSelected
                                ? selectedOptions.filter((i) => i !== index)
                                : [...selectedOptions, index],
                            );
                          } else {
                            setSelectedOptions([index]);
                          }
                        }}
                        className="w-5 h-5 text-purple-600"
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
              className="w-full mt-4 bg-purple-500 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
            >
              {voting
                ? "⏳ Голосование..."
                : `🗳️ Голосовать (${getTotalVotes()})`}
            </button>
          )}
        </div>
      )}

      {/* Действия */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 ${
            liked ? "text-pink-500" : "text-gray-600"
          }`}
        >
          <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
          <span className="font-medium">{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-600"
        >
          <span className="text-xl">💬</span>
          <span className="font-medium">{comments.length}</span>
        </button>
      </div>

      {/* Комментарии */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3 mt-3 max-h-60 overflow-y-auto">
            {comments.map((comment) => {
              const commentAuthorId = comment.author_id || comment.author?.uid;
              const commentAuthorName =
                comment.author?.username || comment.username || "anon";
              const isOwnComment = commentAuthorId === currentUser?.uid;

              return (
                <div key={comment.id} className="flex gap-2">
                  <Link to={`/profile/${commentAuthorId}`}>
                    <img
                      src={comment.author?.avatar || "/fox.gif"}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  </Link>
                  <div className="flex-1 bg-white rounded-xl p-3 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/profile/${commentAuthorId}`}
                        className="font-semibold text-sm text-purple-600 hover:underline"
                      >
                        @{commentAuthorName}
                      </Link>
                      <span className="text-gray-400 text-xs">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.text}</p>
                    {isOwnComment && (
                      <button
                        onClick={() =>
                          handleDeleteComment(comment.id, commentAuthorId)
                        }
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Написать комментарий..."
              className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500"
              style={{ color: "#000" }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || sending}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl disabled:opacity-50"
            >
              {sending ? "⏳" : "➤"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
