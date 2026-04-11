import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  // 🔷 Получаем счетчик пользователей
  useEffect(() => {
    const getCount = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setUserCount(data.users || 0);
      } catch (error) {
        console.error("Error getting user count:", error);
      }
    };
    getCount();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(identifier, password);

      if (result.success) {
        console.log("✅ Logged in");
        navigate("/");
      } else {
        setError(result.error || "Ошибка входа");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Ошибка при входе");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          {/* 🦊 Логотип - картинка вместо эмодзи */}
          <img
            src="/fox.gif"
            alt="Lis"
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />

          {/* ✨ Красивый шрифт Parisienne */}
          <h1
            className="text-6xl mb-2 text-pink-500"
            style={{ fontFamily: "'Parisienne', cursive" }}
          >
            Lis
          </h1>
          <p className="text-gray-600 mb-2">Социальная сеть</p>

          {/* 🔢 Счетчик пользователей */}
          {userCount > 0 && (
            <p className="text-sm text-purple-600 mt-2 font-semibold bg-purple-50 py-1 px-3 rounded-full inline-block">
              🦊 Нас уже {userCount}{" "}
              {userCount === 1
                ? "человек"
                : userCount < 5
                  ? "человека"
                  : "человек"}
              !
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="📱 Телефон или username"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="🔒 Пароль"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !identifier.trim() || !password}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ Вход..." : "🔐 Войти"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Нет аккаунта?{" "}
            <Link
              to="/register"
              className="text-purple-600 hover:text-purple-800 font-semibold hover:underline"
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
