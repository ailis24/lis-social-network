import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setLoading(true);
    try {
      await register(username, phone, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-700 via-purple-400 to-purple-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="lis-logo text-6xl mb-2">Lis</h1>
          <p className="text-white/80 text-sm">Социальная сеть</p>
        </div>

        <div className="bg-white/95 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Регистрация</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="Никнейм"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 text-gray-800"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="tel"
              required
              autoComplete="tel"
              placeholder="Номер телефона"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 text-gray-800"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Пароль (минимум 6 символов)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Создание аккаунта..." : "Зарегистрироваться"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-purple-600 font-semibold hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
