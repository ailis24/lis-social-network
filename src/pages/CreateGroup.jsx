import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createGroup } from "../services/groups";

export default function CreateGroup() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Поиск пользователей через REST API
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error("Ошибка поиска");
        const data = await res.json();
        const filtered = (Array.isArray(data) ? data : []).filter(
          (u) => u.uid !== currentUser.uid
        );
        // Нормализуем: у наших пользователей id = uid
        setUsers(filtered.map((u) => ({ ...u, id: u.uid })));
      } catch (error) {
        console.error("Error searching users:", error);
        setUsers([]);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentUser.uid]);

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Введите название группы!");
      return;
    }

    if (selectedUsers.length < 1) {
      alert("Добавьте хотя бы одного участника!");
      return;
    }

    setLoading(true);
    const result = await createGroup(
      groupName,
      currentUser.uid,
      userData?.username || currentUser.email?.split("@")[0],
      userData?.avatar || "",
      selectedUsers,
    );

    setLoading(false);
    if (result.success) {
      alert("✅ Группа создана!");
      navigate("/messages");
    } else {
      alert("Ошибка: " + result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-all"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white ml-4 drop-shadow-lg">
            Создать группу
          </h1>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
          {/* Название группы */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название группы *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Введите название..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
              style={{ color: "#000" }}
            />
          </div>

          {/* Поиск участников */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Добавить участников *
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по username (минимум 2 буквы)..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
              style={{ color: "#000" }}
            />
            {searching && (
              <p className="text-sm text-purple-600 mt-2">🔍 Поиск...</p>
            )}
          </div>

          {/* Найденные пользователи */}
          {users.length > 0 && (
            <div className="mb-4 max-h-60 overflow-y-auto space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedUsers.includes(user.id)
                      ? "bg-purple-100 border-2 border-purple-500"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img
                      src={
                        user.avatar ||
                        "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                      }
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {user.username}
                    </p>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Если ничего не найдено */}
          {searchQuery.length >= 2 && users.length === 0 && !searching && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-xl text-center">
              <p className="text-yellow-700">😕 Пользователи не найдены</p>
              <p className="text-sm text-yellow-600 mt-1">
                Проверьте правильность username
              </p>
            </div>
          )}

          {/* Выбранные участники */}
          {selectedUsers.length > 0 && (
            <div className="mb-6 p-4 bg-purple-50 rounded-xl">
              <p className="text-sm font-medium text-purple-700 mb-2">
                ✅ Выбрано участников:{" "}
                <span className="font-bold">{selectedUsers.length}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {users
                  .filter((user) => selectedUsers.includes(user.id))
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-purple-200"
                    >
                      <span className="text-sm text-gray-700">
                        {user.username}
                      </span>
                      <button
                        onClick={() => toggleUser(user.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Кнопка создания */}
          <button
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedUsers.length < 1}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "⏳ Создание..."
              : `👥 Создать группу (${selectedUsers.length} участников)`}
          </button>

          {/* Подсказка */}
          <p className="text-xs text-gray-500 mt-4 text-center">
            💡 Совет: введите минимум 2 буквы username для поиска
          </p>
        </div>
      </div>
    </div>
  );
}
