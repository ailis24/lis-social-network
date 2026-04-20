import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function AddStory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isVideo = file.type.startsWith("video");
      setMediaType(isVideo ? "video" : "image");

      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!media) {
      alert("Выберите фото или видео!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          media,
          mediaType,
        }),
      });

      if (res.ok) {
        alert("Сторис опубликована! 🎉");
        navigate("/");
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ошибка при загрузке");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-8 px-4">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          ✨ Добавить сторис
        </h1>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden p-6">
          {/* Область загрузки */}
          <div className="mb-6 border-4 border-dashed border-purple-300 rounded-2xl h-64 flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer relative">
            {media ? (
              mediaType === "video" ? (
                <video
                  src={media}
                  controls
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <img
                  src={media}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-xl"
                />
              )
            ) : (
              <div className="text-center text-purple-400">
                <p className="text-4xl mb-2">📷</p>
                <p className="font-semibold">Нажми чтобы выбрать фото</p>
                <p className="text-sm text-gray-400">или видео</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={loading || !media}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "Загрузка..." : "Опубликовать"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
