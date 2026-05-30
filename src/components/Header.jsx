import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";
import { notificationService, friendService } from "../services";
import PremiumLockModal from "./PremiumLockModal";
import { playNotificationSound } from "../utils/sounds";

function NotifItem({ n, onAccepted, onDeclined }) {
  const [accepted, setAccepted] = useState(n.type === "friend_accepted");
  const [declined, setDeclined] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await friendService.acceptRequest(n.sender_id);
      setAccepted(true);
      onAccepted(n.sender_id);
    } catch {}
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await friendService.declineRequest(n.sender_id);
      setDeclined(true);
      onDeclined && onDeclined(n.sender_id);
    } catch {}
    setLoading(false);
  };

  const icon =
    n.type === "like"
      ? "❤️"
      : n.type === "comment"
        ? "💬"
        : n.type === "friend_request" || n.type === "friend_accepted"
          ? "👤"
          : "🔔";

  if (declined) return null;

  return (
    <div
      className={`px-3 py-2.5 border-b border-gray-50 last:border-0 ${!n.is_read ? "bg-purple-50" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800">
            <span className="font-semibold">@{n.username}</span> {n.message}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(n.created_at).toLocaleString("ru-RU")}
          </p>
          {n.type === "friend_request" && !accepted && (
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full disabled:opacity-50"
              >
                {loading ? "..." : "✅ Принять"}
              </button>
              <button
                onClick={handleDecline}
                disabled={loading}
                className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                ❌ Отклонить
              </button>
            </div>
          )}
          {(n.type === "friend_accepted" ||
            (n.type === "friend_request" && accepted)) && (
            <span className="mt-1 inline-block text-xs text-green-600 font-semibold">
              👫 Теперь вы друзья!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMarketLock, setShowMarketLock] = useState(false);
  const notifRef = useRef();
  const prevUnreadRef = useRef(0);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
        const count = data.filter((n) => !n.is_read).length;
        setUnread(count);
        if (!firstLoadRef.current && count > prevUnreadRef.current) {
          playNotificationSound();
        }
        firstLoadRef.current = false;
        prevUnreadRef.current = count;
      } catch {}
    };
    load();
    const iv = setInterval(load, 15000);
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
          <Link
            to="/"
            className="lis-logo text-2xl text-white text-center select-none"
          >
            Lis
          </Link>
          <div className="flex justify-end items-center gap-2">
            {user?.is_admin && (
              <Link
                to="/admin"
                title="Панель администратора"
                className="w-9 h-9 rounded-full bg-yellow-400/90 hover:bg-yellow-300 flex items-center justify-center text-lg transition-all shadow-sm"
              >
                👑
              </Link>
            )}
            <Link
              to="/messages"
              title="Сообщения"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl transition-all"
            >
              💬
            </Link>
            {/* Marketplace icon — replaces profile avatar in header */}
            <button
              onClick={() =>
                isPremium ? navigate("/marketplace") : setShowMarketLock(true)
              }
              title="Маркетплейс"
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${
                isPremium
                  ? "bg-white/20 hover:bg-white/30"
                  : "bg-white/10 opacity-60"
              }`}
            >
              {isPremium ? "🏪" : "🔒"}
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — always visible, 5 items, parallel & aligned */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200">
        <div className="max-w-5xl mx-auto relative flex items-end justify-around px-2 pt-1 pb-1">
          <NavBtn to="/" icon="🏠" label="Главная" active={isActive("/")} />
          <NavBtn
            to="/search"
            icon="🔍"
            label="Поиск"
            active={isActive("/search")}
          />

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
                    <p className="text-center text-gray-400 text-sm p-4">
                      Нет уведомлений
                    </p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <NotifItem
                        key={n.id}
                        n={n}
                        onAccepted={(senderId) => {
                          setNotifications((prev) =>
                            prev.map((x) =>
                              x.sender_id === senderId &&
                              x.type === "friend_request"
                                ? { ...x, type: "friend_accepted" }
                                : x,
                            ),
                          );
                        }}
                        onDeclined={(senderId) => {
                          setNotifications((prev) =>
                            prev.filter(
                              (x) =>
                                !(
                                  x.sender_id === senderId &&
                                  x.type === "friend_request"
                                ),
                            ),
                          );
                        }}
                      />
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

      {showMarketLock && (
        <PremiumLockModal
          feature="Маркетплейс"
          onClose={() => setShowMarketLock(false)}
        />
      )}
    </>
  );
}
