import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userService, friendService, messageService } from "../services";

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState({});
  const [startingChat, setStartingChat] = useState({});

  const search = useCallback(
    async (q) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await userService.search(q);
        setResults(data.filter((u) => u.uid !== user?.uid));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [user?.uid],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Исправление: Добавлена проверка и предотвращение лишних кликов
  const handleAddFriend = async (uid) => {
    // Если уже отправлена, ничего не делаем
    if (sentRequests[uid]) return;
    
    try {
      // Отправляем запрос
      await friendService.sendRequest(uid);
      // Обновляем состояние, чтобы кнопка стала зеленой
      setSentRequests((prev) => ({ ...prev, [uid]: true }));
    } catch (err) {
      console.error(err);
      // Если ошибка (например, уже друзья), все равно помечаем как "отправлено", чтобы кнопка не висела
      setSentRequests((prev) => ({ ...prev, [uid]: true }));
    }
  };

  const handleMessage = async (uid) => {
    setStartingChat((prev) => ({ ...prev, [uid]: true }));
    try {
      const data = await messageService.createConversation(uid);
      navigate(`/messages?conv=${data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setStartingChat((prev) => ({ ...prev, [uid]: false }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      <h1 className="text-2xl font-bold text-white mb-4 text-center drop-shadow">
        🔍 Поиск
      </h1>

      {/* Search input */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите никнейм..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/90 backdrop-blur shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((u) => (
            <div
              key={u.uid}
              className="bg-white/90 backdrop-blur rounded-2xl p-4 flex items-center gap-4 shadow-md"
            >
              {/* Avatar — clickable */}
              <button
                type="button"
                onClick={() => navigate(`/profile/${u.uid}`)}
                className="flex-shrink-0"
              >
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    alt={u.username}
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                    {u.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${u.uid}`)}
                  className="font-bold text-gray-800 hover:text-purple-600 transition-colors text-left"
                >
                  @{u.username}
                </button>
                <p className="text-sm text-gray-500 truncate">
                  {u.bio || "Нет описания"}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAddFriend(u.uid)}
                  disabled={sentRequests[u.uid]}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                    sentRequests[u.uid]
                      ? "bg-green-100 text-green-600"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow"
                  }`}
                >
                  {sentRequests[u.uid] ? "✓ Отправлено" : "👤 Добавить"}
                </button>
                <button
                  type="button"
                  onClick={() => handleMessage(u.uid)}
                  disabled={startingChat[u.uid]}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-purple-300 text-purple-600 font-semibold hover:bg-purple-50 transition-all cursor-pointer"
                >
                  {startingChat[u.uid] ? "..." : "💬 Написать"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-16 text-white">
          <div className="text-5xl mb-3">😕</div>
          <p className="text-xl font-semibold">Никого не найдено</p>
          <p className="text-white/70 mt-1">Попробуй другой никнейм</p>
        </div>
      )}

      {!query && (
        <div className="text-center py-16 text-white/70">
          <div className="text-5xl mb-3">👥</div>
          <p>Начни вводить имя пользователя</p>
        </div>
      )}
    </div>
  );
}