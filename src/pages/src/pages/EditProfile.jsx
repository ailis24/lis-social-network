import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import imageCompression from "browser-image-compression";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

// Cloudinary данные
const CLOUDINARY_CLOUD_NAME = "dzs54s6s";
const CLOUDINARY_UPLOAD_PRESET = "Lis-app";

export default function EditProfile() {
  const { currentUser, userData } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      setUsername(userData.username || "");
      setBio(userData.bio || "");
      setAvatarPreview(userData.avatar || "");
    }
  }, [userData]);

  // Сжатие фото
  async function compressImage(file) {
    const options = {
      maxSizeMB: 0.5, // Аватар меньше - 0.5 MB
      maxWidthOrHeight: 512, // Аватар меньше
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.8,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Ошибка сжатия:", error);
      return file;
    }
  }

  // Загрузка в Cloudinary
  async function uploadToCloudinary(file) {
    const compressedFile = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      throw error;
    }
  }

  // Обработка выбора аватара
  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Фото слишком большое! Максимум 5MB");
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!username.trim()) {
      setError("Введите имя пользователя");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let avatarUrl = userData?.avatar || "";

      // Загрузка нового аватара если есть
      if (avatar) {
        setUploading(true);
        avatarUrl = await uploadToCloudinary(avatar);
        setUploading(false);
      }

      const userRef = doc(db, "users", currentUser.uid);

      await updateDoc(userRef, {
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        avatar: avatarUrl,
        updatedAt: new Date().toISOString(),
      });

      navigate("/profile");
    } catch (error) {
      console.error("Ошибка обновления профиля:", error);
      setError("Ошибка: " + error.message);
      setUploading(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-all"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white ml-4">
            Редактировать профиль
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Аватар */}
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={
                    avatarPreview ||
                    "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                  }
                  alt="Avatar"
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-purple-500"
                />
                {/* Кнопка смены аватара */}
                <label className="absolute bottom-0 right-0 bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors shadow-lg">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-2">{currentUser.email}</p>
              <label className="text-sm text-purple-600 cursor-pointer hover:text-purple-700 font-medium">
                Изменить фото
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Имя пользователя */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ваше имя"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                style={{ color: "#000000" }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Это имя будет видно другим пользователям
              </p>
            </div>

            {/* О себе */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                О себе
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о себе..."
                maxLength={150}
                rows="4"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
                style={{ color: "#000000" }}
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length} / 150</p>
            </div>

            {/* Email (только для просмотра) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email нельзя изменить
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading
                  ? "📤 Загрузка..."
                  : loading
                    ? "Сохранение..."
                    : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
