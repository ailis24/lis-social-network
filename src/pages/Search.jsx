import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Search() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Поиск в реальном времени через API
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        await handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      let q = searchQuery.trim();
      if (q.startsWith("@")) q = q.slice(1);

      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const users = await res.json();
        // Исключаем себя из результатов
        const filtered = users.filter((u) => u.uid !== currentUser?.uid);
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }

  function goToProfile(userId) {
    navigate(`/profile/${userId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 pb-20">
      <Header />
      <div className="max-w-2xl mx-auto pt-8 px-4">
        {/* Поиск */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🔍 Поиск пользователей
          </h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Введите @ник или username..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
            style={{ color: "#000000" }}
          />
        </div>

        {/* Результаты */}
        {loading && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Поиск...</p>
          </div>
        )}

        {searchResults.length === 0 &&
          searchQuery.trim().length >= 2 &&
          !loading && (
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">😕</div>
              <p className="text-gray-500 text-lg">Никто не найден</p>
              <p className="text-gray-400 text-sm mt-2">
                Попробуйте другой логин
              </p>
            </div>
          )}

        {searchResults.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Найдено: {searchResults.length}
            </h2>
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => goToProfile(user.uid)}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.avatar || "/fox.gif"}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-purple-300"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        @{user.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.followers?.length || 0} подписчиков
                      </div>
                    </div>
                  </div>
                  <button className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
                    Перейти →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!searchQuery && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">Введите логин для поиска</p>
            <p className="text-gray-400 text-sm mt-2">
              Результаты появятся автоматически
            </p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
