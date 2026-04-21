import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Неверный номер или пароль");
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
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Войти</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              placeholder="Пароль"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-purple-600 font-semibold hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
