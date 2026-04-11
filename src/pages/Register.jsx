import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser, setUserData } = useAuth();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: formData.username,
          phone: formData.phone,
          password: formData.password,
          email: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка регистрации");
      }

      // ✅ Успешная регистрация
      if (data.user) {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        setCurrentUser({ uid: data.user.uid });
        setUserData(data.user);
        console.log("✅ Registered:", data.user.username);
        navigate("/");
      } else {
        throw new Error("Не удалось получить данные пользователя");
      }
    } catch (err) {
      console.error("Registration Error:", err);
      setError(err.message || "Произошла ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <img
            src="/fox.gif"
            alt="Lis Logo"
            className="mb-4 w-20 h-20 object-contain mx-auto"
          />
          <h1
            className="text-6xl font-bold mb-2"
            style={{
              fontFamily: "'Parisienne', 'Brush Script MT', cursive",
              background:
                "linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 50%, #ffb4b4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
              letterSpacing: "2px",
            }}
          >
            Lis
          </h1>
          <p className="text-gray-500 text-sm">Создать аккаунт</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="username"
              placeholder="Имя пользователя"
              value={formData.username}
              onChange={handleChange}
              required
              minLength="3"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
            />
          </div>
          <div>
            <input
              type="tel"
              name="phone"
              placeholder="📱 Номер телефона (+7...)"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              placeholder="Пароль (мин. 6 символов)"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              style={{ color: "#000000" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ Создание..." : "🦊 Создать аккаунт"}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-gray-600">
            Уже есть аккаунт?{" "}
            <Link
              to="/login"
              className="text-purple-600 font-semibold hover:underline"
            >
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
