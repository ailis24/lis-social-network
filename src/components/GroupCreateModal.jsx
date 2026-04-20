import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function GroupCreateModal({ onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          name,
          creatorId: currentUser.uid,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess(data.groupId);
      } else {
        alert("Ошибка создания группы");
      }
    } catch (error) {
      console.error("Create group error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          🦊 Создать группу
        </h3>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название группы"
          className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
          >
            {loading ? "⏳" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
