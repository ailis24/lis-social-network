import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

const CLOUDINARY_CLOUD_NAME = "dzs54s6s";
const CLOUDINARY_UPLOAD_PRESET = "Lis-app";

export default function CreateStory() {
  const { currentUser, userData } = useAuth();
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  function handleMediaChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Файл слишком большой! Максимум 10MB");
        return;
      }
      setMedia(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  }

  async function uploadToCloudinary(file) {
    const isVideo = file.type.startsWith("video/");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const endpoint = isVideo
      ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(endpoint, { method: "POST", body: formData });
    const data = await response.json();
    return { url: data.secure_url, type: isVideo ? "video" : "image" };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!media) {
      alert("Выберите фото или видео");
      return;
    }

    setUploading(true);

    try {
      const { url, type } = await uploadToCloudinary(media);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await addDoc(collection(db, "stories"), {
        userId: currentUser.uid,
        username: userData?.username || currentUser.email.split("@")[0],
        userAvatar:
          userData?.avatar ||
          "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif",
        mediaUrl: url,
        mediaType: type,
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        viewers: [],
      });

      navigate("/");
    } catch (error) {
      console.error("Ошибка создания истории:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 p-4">
      <Header />

      <main className="max-w-2xl mx-auto pt-6 pb-20">
        <h1 className="text-2xl font-bold text-white mb-6">Новая история</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 shadow-lg"
        >
          {!mediaPreview ? (
            <label className="block w-full h-96 border-2 border-dashed border-purple-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-600 transition-colors">
              <svg
                className="w-16 h-16 text-purple-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-purple-600 font-semibold text-lg">
                Добавить фото или видео
              </span>
              <span className="text-gray-500 text-sm mt-2">До 10MB</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              {media.type?.startsWith("video") ? (
                <video
                  src={mediaPreview}
                  className="w-full rounded-xl"
                  controls
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full rounded-xl"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setMedia(null);
                  setMediaPreview("");
                }}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full"
              >
                ×
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-gray-500 text-sm">
            История исчезнет через 24 часа
          </div>

          <button
            type="submit"
            disabled={uploading || !media}
            className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {uploading ? "📤 Загрузка..." : "Опубликовать историю"}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
