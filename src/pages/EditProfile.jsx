import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function EditProfile() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setBio(currentUser.bio || "");
      setAvatar(currentUser.avatar || "");
    }
  }, [currentUser]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${currentUser.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ bio, avatar }),
      });

      if (res.ok) {
        // Обновляем данные в localStorage
        const updatedUser = { ...currentUser, bio, avatar };
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        window.location.reload(); // Перезагрузка для обновления UI
      } else {
        alert("Ошибка сохранения");
      }
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Редактировать профиль
          </h2>

          {/* Аватар */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src={avatar || "/fox.gif"}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-400"
              />
              <button
                onClick={() => {
                  const newAvatar = prompt(
                    "Введите ссылку на картинку (или оставьте пустым для лисы):",
                    avatar,
                  );
                  if (newAvatar !== null) setAvatar(newAvatar);
                }}
                className="absolute bottom-0 right-0 bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 border-white"
              >
                📷
              </button>
            </div>
          </div>

          {/* Био */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              О себе
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе..."
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none h-24"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
