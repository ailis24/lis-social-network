import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminService, messageService } from "../services";

const STATUS_LABEL = {
  pending: { text: "Ожидает", cls: "bg-yellow-100 text-yellow-700" },
  approved: { text: "Одобрен", cls: "bg-green-100 text-green-700" },
  rejected: { text: "Отклонён", cls: "bg-red-100 text-red-700" },
};

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [previewImg, setPreviewImg] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [note, setNote] = useState({});

  // Redirect non-admins
  useEffect(() => {
    if (!user?.is_admin) navigate("/", { replace: true });
  }, [user, navigate]);

  const loadChecks = useCallback(async () => {
    try {
      const data = await adminService.getChecks();
      setChecks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecks();
  }, [loadChecks]);

  const handleAction = async (id, status) => {
    setActionLoading(id + status);
    try {
      await adminService.updateCheck(id, status, note[id] || "");
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, admin_note: note[id] || "" } : c))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = async (userId) => {
    try {
      const data = await messageService.createConversation(userId);
      navigate(`/messages?conv=${data.id}`);
    } catch (err) {
      alert("Ошибка открытия чата");
    }
  };

  const filtered = checks.filter((c) => filter === "all" || c.status === filter);

  if (!user?.is_admin) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
      <div className="bg-white/95 rounded-3xl shadow-lg p-5 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">👑</span>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Панель администратора</h1>
            <p className="text-xs text-gray-400">@{user.username} · {user.phone}</p>
          </div>
        </div>
      </div>

      {/* Checks section */}
      <div className="bg-white/95 rounded-3xl shadow-lg p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-3">🧾 Чеки об оплате</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["pending", "Ожидают"], ["approved", "Одобрены"], ["rejected", "Отклонены"], ["all", "Все"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                filter === val
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
              {val !== "all" && (
                <span className="ml-1 text-xs opacity-70">
                  ({checks.filter((c) => c.status === val).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>Нет чеков в этой категории</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((check) => {
              const sl = STATUS_LABEL[check.status] || STATUS_LABEL.pending;
              return (
                <div key={check.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    {check.avatar ? (
                      <img src={check.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-purple-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {check.username?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">@{check.username}</p>
                      <p className="text-xs text-gray-500">Тел. для оплаты: <span className="font-mono font-semibold">{check.user_phone}</span></p>
                      <p className="text-xs text-gray-400">{new Date(check.created_at).toLocaleString("ru-RU")}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${sl.cls}`}>{sl.text}</span>
                  </div>

                  {/* Check image */}
                  {check.image_url && (
                    <button
                      onClick={() => setPreviewImg(check.image_url)}
                      className="block w-full mb-3"
                    >
                      <img
                        src={check.image_url}
                        alt="Чек"
                        className="w-full max-h-48 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                      <p className="text-xs text-center text-purple-600 mt-1">Нажмите для увеличения</p>
                    </button>
                  )}

                  {/* Admin note */}
                  {check.admin_note && (
                    <p className="text-xs text-gray-500 italic mb-2">Заметка: {check.admin_note}</p>
                  )}

                  {/* Actions */}
                  {check.status === "pending" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Заметка (необязательно)"
                        value={note[check.id] || ""}
                        onChange={(e) => setNote((prev) => ({ ...prev, [check.id]: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMessage(check.user_id)}
                          className="flex-1 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-100 transition-all"
                        >
                          💬 Написать
                        </button>
                        <button
                          onClick={() => handleAction(check.id, "approved")}
                          disabled={!!actionLoading}
                          className="flex-1 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          {actionLoading === check.id + "approved" ? "..." : "✅ Одобрить"}
                        </button>
                        <button
                          onClick={() => handleAction(check.id, "rejected")}
                          disabled={!!actionLoading}
                          className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          {actionLoading === check.id + "rejected" ? "..." : "❌ Отклонить"}
                        </button>
                      </div>
                    </div>
                  )}

                  {check.status !== "pending" && (
                    <button
                      onClick={() => handleMessage(check.user_id)}
                      className="w-full py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-100 transition-all"
                    >
                      💬 Написать пользователю
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <img
            src={previewImg}
            alt="Чек"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 text-xl font-bold hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
