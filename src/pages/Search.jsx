import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Search() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/users/search?query=${encodeURIComponent(query)}`,
        {
          headers: { "X-User-Id": currentUser.uid },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        <h1 className="text-2xl font-bold text-white mb-4 text-center">
          🔍 Поиск
        </h1>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите никнейм..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none shadow-lg focus:ring-2 focus:ring-purple-500"
            />
            <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          </div>
        </form>

        {loading && <div className="text-center text-white py-4">Поиск...</div>}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-white/80 font-medium px-2">Результаты:</p>
            {results.map((user) => (
              <div
                key={user.uid}
                onClick={() => navigate(`/profile/${user.uid}`)}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white transition-all"
              >
                <img
                  src={user.avatar || "/fox.gif"}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border border-purple-200"
                />
                <div>
                  <p className="font-bold text-gray-800">@{user.username}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {user.bio || "Нет описания"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-10 text-white/80">
            <p className="text-4xl mb-2">😕</p>
            <p>Никого не найдено</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
