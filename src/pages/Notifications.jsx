import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Notifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔷 Загрузка уведомлений
  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();

    // Обновление каждые 10 секунд
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // 🔷 Загрузка непрочитанных
  useEffect(() => {
    if (!currentUser) return;
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", {
        headers: { "X-User-Id": currentUser.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { "X-User-Id": currentUser.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  }

  // 🔷 Отметить как прочитанное
  async function markAsRead(id) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "X-User-Id": currentUser.uid },
      });
      loadNotifications();
      loadUnreadCount();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  // 🔷 Удалить уведомление
  async function deleteNotification(id) {
    if (!confirm("Удалить это уведомление?")) return;
    try {
      // Бэкенд: нет DELETE endpoint, просто обновляем локально
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadUnreadCount();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }

  // 🔷 Форматирование времени
  function formatTime(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString("ru-RU");
  }

  // 🔷 Иконка для типа уведомления
  function getIcon(type) {
    switch (type) {
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "follow":
        return "👤";
      case "message":
        return "💬";
      default:
        return "🔔";
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-600 to-white">
        <div className="text-purple-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            🔔 Уведомления
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={() =>
                notifications
                  .filter((n) => !n.read)
                  .forEach((n) => markAsRead(n.id))
              }
              className="text-sm text-white/90 hover:text-white bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm transition-colors"
            >
              Прочитать все ({unreadCount})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center border border-purple-100">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-gray-500 text-lg">Нет уведомлений</p>
            <p className="text-gray-400 text-sm">
              Когда кто-то лайкнет или прокомментирует — они появятся здесь
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-white/90 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] border border-purple-100 ${
                  !notif.read
                    ? "border-l-4 border-purple-500 shadow-lg"
                    : "opacity-70"
                }`}
                onClick={() => {
                  if (!notif.read) markAsRead(notif.id);
                  // Можно добавить переход к посту: if (notif.postId) navigate(`/post/${notif.postId}`);
                }}
              >
                {/* Аватар отправителя */}
                <Link
                  to={`/profile/${notif.senderId}`}
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={
                      notif.sender?.avatar ||
                      "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                    }
                    alt={notif.sender?.username}
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-300"
                    loading="lazy"
                  />
                </Link>

                {/* Контент */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xl">{getIcon(notif.type)}</span>
                    <Link
                      to={`/profile/${notif.senderId}`}
                      className="font-semibold text-purple-600 hover:text-purple-800 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{notif.sender?.username}
                    </Link>
                    <span className="text-gray-500 text-sm">
                      {notif.message}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatTime(notif.createdAt)}
                  </p>
                </div>

                {/* Индикатор непрочитанного + удалить */}
                <div className="flex flex-col items-end gap-2">
                  {!notif.read && (
                    <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0 animate-pulse"></div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
