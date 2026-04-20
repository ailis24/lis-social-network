import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function Notifications() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        headers: { "X-User-Id": currentUser.uid },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      } else {
        console.error("Failed to load notifications");
      }
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: "PUT",
        headers: { "X-User-Id": currentUser.uid },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error("Mark read error:", error);
    }
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.postId) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        <h1 className="text-2xl font-bold text-white mb-6">🔔 Уведомления</h1>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg">Нет новых уведомлений</p>
            <p className="text-white/70 text-sm mt-2">
              Когда кто-то лайкнет или прокомментирует ваш пост, вы увидите это
              здесь
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                  !notif.read ? "border-2 border-purple-400 shadow-lg" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {notif.type === "like"
                      ? "❤️"
                      : notif.type === "comment"
                        ? "💬"
                        : "🔔"}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">
                      <strong>
                        @{notif.sender?.username || "Пользователь"}
                      </strong>{" "}
                      {notif.message || "взаимодействовал с вашим контентом"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
