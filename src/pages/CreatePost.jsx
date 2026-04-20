import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function CreatePost() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Опрос
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim() && !image && !video && !isPoll) {
      alert("Добавьте текст, фото, видео или опрос!");
      return;
    }

    if (isPoll && pollOptions.filter((o) => o.trim()).length < 2) {
      alert("Добавьте минимум 2 варианта ответа!");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = "";
      let videoUrl = "";

      // Загрузка фото
      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        formData.append("userId", currentUser.uid);
        formData.append("folder", "photos");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "X-User-Id": currentUser.uid },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      }

      // Загрузка видео
      if (video) {
        const formData = new FormData();
        formData.append("file", video);
        formData.append("userId", currentUser.uid);
        formData.append("folder", "videos");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "X-User-Id": currentUser.uid },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          videoUrl = uploadData.url;
        }
      }

      // Создание поста
      const postData = {
        text: text.trim(),
        image: imageUrl,
        video: videoUrl,
        isPoll,
        poll: isPoll
          ? {
              options: pollOptions
                .filter((o) => o.trim())
                .map((opt) => ({ text: opt, votes: 0 })),
              allowMultiple,
              voters: [],
            }
          : null,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        alert("✅ Пост опубликован!");
        navigate("/");
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка при публикации: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            ✨ Новый пост
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Текст */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что у вас нового?"
              className="w-full h-32 p-4 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
              style={{ color: "#000" }}
            />

            {/* Тип контента */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPoll(false)}
                className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                  !isPoll
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                📝 Пост
              </button>
              <button
                type="button"
                onClick={() => setIsPoll(true)}
                className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
                  isPoll
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                📊 Опрос
              </button>
            </div>

            {/* Загрузка фото */}
            {!isPoll && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📸 Фото (до 10MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm"
                />
                {imagePreview && (
                  <div className="mt-2 relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-64 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Загрузка видео */}
            {!isPoll && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🎥 Видео (до 100MB)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="w-full text-sm"
                />
                {videoPreview && (
                  <div className="mt-2 relative">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-h-64 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVideo(null);
                        setVideoPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Опрос */}
            {isPoll && (
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-800 mb-3">
                  📊 Варианты ответов:
                </h3>
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Вариант ${index + 1}`}
                      className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500"
                      style={{ color: "#000" }}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(index)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-xl"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="text-purple-600 font-semibold text-sm"
                  >
                    + Добавить вариант
                  </button>
                )}
                <label className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">
                    Разрешить несколько вариантов
                  </span>
                </label>
              </div>
            )}

            {/* Кнопка публикации */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "⏳ Публикация..." : "🚀 Опубликовать"}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
