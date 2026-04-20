import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
        setUnread(data.filter((n) => !n.is_read).length);
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, [user]);

  // Close notifs on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellClick = async () => {
    setShowNotifs((v) => !v);
    if (unread > 0) {
      try {
        await notificationService.markAsRead();
        setUnread(0);
      } catch {}
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-purple-700 to-pink-600 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="lis-logo text-3xl select-none">Lis</Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {[
            { to: "/", label: "🏠", title: "Лента" },
            { to: "/search", label: "🔍", title: "Поиск" },
            { to: `/profile/${user?.uid}`, label: "👤", title: "Профиль" },
            { to: "/messages", label: "💬", title: "Сообщения" },
          ].map(({ to, label, title }) => (
            <Link
              key={to}
              to={to}
              title={title}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive(to)
                  ? "bg-white/30 text-white"
                  : "text-white/80 hover:bg-white/20 hover:text-white"
              }`}
            >
              {label} <span className="hidden md:inline">{title}</span>
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleBellClick}
              className="relative p-2 rounded-full hover:bg-white/20 transition-all text-white"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="font-bold text-gray-800">Уведомления</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm p-4">Нет уведомлений</p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0 ${
                          !n.is_read ? "bg-purple-50" : ""
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm flex-shrink-0">
                          {n.type === "like" ? "❤️" : n.type === "comment" ? "💬" : "👤"}
                        </div>
                        <div>
                          <p className="text-sm text-gray-800">
                            <span className="font-semibold">@{n.username}</span>{" "}
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(n.created_at).toLocaleString("ru-RU")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <Link to={`/profile/${user?.uid}`} className="flex items-center gap-2">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                loading="lazy"
                className="w-8 h-8 rounded-full object-cover border-2 border-white/50"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-sm">
                {user?.username?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <span className="hidden md:block text-sm text-white font-semibold">
              @{user?.username}
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 flex justify-around py-2 z-30">
        {[
          { to: "/", label: "🏠" },
          { to: "/search", label: "🔍" },
          { to: `/profile/${user?.uid}`, label: "👤" },
          { to: "/messages", label: "💬" },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`p-2 rounded-xl text-xl transition-all ${
              isActive(to) ? "bg-purple-100" : "opacity-60"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
