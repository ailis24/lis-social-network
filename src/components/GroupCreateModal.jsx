import { useState, useEffect } from "react";
import { searchUsers } from "../services/ydb";

export default function GroupCreateModal({
  onClose,
  onCreateGroup,
  onSearchUsers,
  currentUserId,
}) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Поиск пользователей
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results =
          (await onSearchUsers?.(searchQuery)) ||
          (await searchUsers(searchQuery));
        // Фильтруем: не показывать себя и уже выбранных
        const filtered = results.filter(
          (u) =>
            u.uid !== currentUserId &&
            !selectedUsers.find((s) => s.uid === u.uid),
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers, currentUserId, onSearchUsers]);

  // Добавить пользователя
  const addUser = (user) => {
    if (!selectedUsers.find((u) => u.uid === user.uid)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // Удалить пользователя
  const removeUser = (uid) => {
    setSelectedUsers(selectedUsers.filter((u) => u.uid !== uid));
  };

  // Создать группу
  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setError("Введите название группы");
      return;
    }
    if (selectedUsers.length === 0) {
      setError("Добавьте хотя бы одного участника");
      return;
    }

    try {
      setError("");
      await onCreateGroup(
        groupName.trim(),
        selectedUsers.map((u) => u.uid),
      );
    } catch (err) {
      setError(err.message || "Ошибка создания группы");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            ✨ Создать группу
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-100 rounded-full transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Название группы */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Название группы *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError("");
              }}
              placeholder="Введите название"
              maxLength={50}
              className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-500"
            />
          </div>

          {/* Поиск участников */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Добавить участников *
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="@никнейм (мин. 2 буквы)"
              className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-gray-800 placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Введите минимум 2 буквы для поиска
            </p>
          </div>

          {/* Результаты поиска */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-600"></div>
            </div>
          ) : (
            searchResults.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => addUser(user)}
                    className="flex items-center gap-3 p-3 hover:bg-purple-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="font-semibold text-gray-800">
                      {user.username}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Выбранные участники */}
          {selectedUsers.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-purple-700 mb-3">
                ✅ Выбрано: {selectedUsers.length}
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between bg-white p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-gray-800">{user.username}</span>
                    </div>
                    <button
                      onClick={() => removeUser(user.uid)}
                      className="text-red-500 hover:text-red-600 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Кнопка создания */}
          <button
            onClick={handleSubmit}
            disabled={!groupName.trim() || selectedUsers.length < 1}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🦊 Создать группу
          </button>
        </div>
      </div>
    </div>
  );
}
