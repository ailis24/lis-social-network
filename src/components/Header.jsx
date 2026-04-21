import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services";

export default function Header() {
  const { user } = useAuth();
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

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifs = async () => {
    setShowNotifs((v) => !v);
    if (unread > 0) {
      try {
        await notificationService.markAsRead();
        setUnread(0);
      } catch {}
    }
  };

  const handleCreate = () => {
    navigate("/");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("lis:create-post"));
    }, 50);
  };

  const isActive = (path) => location.pathname === path;

  const NavBtn = ({ to, icon, label, active, onClick }) => {
    const cls = `flex flex-col items-center justify-center gap-0.5 w-14 h-14 transition-all ${
      active ? "text-purple-600" : "text-gray-500"
    }`;
    if (onClick) {
      return (
        <button onClick={onClick} className={cls}>
          <span className="text-2xl leading-none">{icon}</span>
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      );
    }
    return (
      <Link to={to} className={cls}>
        <span className="text-2xl leading-none">{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Top header — centered Lis logo */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-purple-700 to-pink-600 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-2 grid grid-cols-3 items-center">
          <div /> {/* spacer */}
          <Link to="/" className="lis-logo text-2xl text-white text-center select-none">
            Lis
          </Link>
          <div className="flex justify-end items-center gap-2">
            <Link
              to="/messages"
              title="Сообщения"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl transition-all"
            >
              💬
            </Link>
            <Link to={`/profile/${user?.uid}`} className="flex items-center">
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
            </Link>
          </div>
        </div>
      </header>

      {/* Bottom nav — always visible, 5 items, parallel & aligned */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200">
        <div className="max-w-5xl mx-auto relative flex items-end justify-around px-2 pt-1 pb-1">
          <NavBtn to="/" icon="🏠" label="Главная" active={isActive("/")} />
          <NavBtn to="/search" icon="🔍" label="Поиск" active={isActive("/search")} />

          {/* Center + button (raised) */}
          <button
            onClick={handleCreate}
            className="-mt-6 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-3xl font-bold shadow-xl flex items-center justify-center active:scale-95 transition-all"
            title="Новый пост"
          >
            +
          </button>

          <div ref={notifRef} className="relative">
            <NavBtn
              icon="🔔"
              label="Уведомления"
              active={showNotifs}
              onClick={openNotifs}
            />
            {unread > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-bold px-1">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            {showNotifs && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
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

          <NavBtn
            to={`/profile/${user?.uid}`}
            icon="👤"
            label="Профиль"
            active={location.pathname.startsWith("/profile")}
          />
        </div>
      </div>

      {/* Spacer so content isn't hidden under bottom nav */}
      <div className="h-16" />
    </>
  );
}
