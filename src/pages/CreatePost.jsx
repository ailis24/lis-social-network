import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createPost } from "../services/ydb";
import { uploadFile } from "../services/upload";

export default function CreatePost() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Опрос
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert("Фото слишком большое! Максимум 10MB");
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  function handleVideoChange(e) {
    const file = e.target.files[0];
    if (file) {
      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert("Видео слишком большое! Максимум 100MB");
        return;
      }
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  }

  function addPollOption() {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    }
  }

  function removePollOption(index) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  }

  function updatePollOption(index, value) {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!content.trim() && !image && !video && !isPoll) {
      alert("Добавьте текст, фото, видео или опрос!");
      return;
    }

    if (isPoll && pollOptions.filter((o) => o.trim()).length < 2) {
      alert("Добавьте минимум 2 варианта ответа для опроса!");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let imageUrl = "";
      let videoUrl = "";

      // Загрузка фото в Yandex Object Storage
      if (image) {
        setUploadProgress(20);
        imageUrl = await uploadFile(image, currentUser.uid, "photos");
        setUploadProgress(50);
      }

      // Загрузка видео в Yandex Object Storage
      if (video) {
        setUploadProgress(60);
        videoUrl = await uploadFile(video, currentUser.uid, "videos");
        setUploadProgress(90);
      }

      // Формируем данные поста для API
      const postData = {
        text: content || "",
        image: imageUrl || "",
        video: videoUrl || "",
        poll: isPoll
          ? {
              options: pollOptions
                .filter((o) => o.trim())
                .map((opt) => ({ text: opt, votes: 0 })),
              allowMultiple: pollAllowMultiple,
              voters: [],
            }
          : null,
      };

      setUploadProgress(100);

      // ✅ Создаём пост в YDB
      const result = await createPost(postData);

      if (result.success) {
        alert("✅ Пост опубликован!");
        setContent("");
        setImage(null);
        setVideo(null);
        setPreview(null);
        setVideoPreview(null);
        setIsPoll(false);
        setPollOptions(["", ""]);
        navigate("/");
      } else {
        alert("Ошибка при создании поста");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при создании поста: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-all"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white ml-4">Новый пост</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 shadow-lg"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Что нового? 🦊"
            maxLength={500}
            className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
            style={{ color: "#000000" }}
          />

          {/* Тип поста */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setIsPoll(false)}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${!isPoll ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              📝 Пост
            </button>
            <button
              type="button"
              onClick={() => setIsPoll(true)}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${isPoll ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              📊 Опрос
            </button>
          </div>

          {/* Загрузка фото */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📸 Добавить фото (макс. 10MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
            />
          </div>

          {/* Загрузка видео */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎥 Добавить видео (макс. 100MB, MP4/MOV)
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
            />
          </div>

          {/* Предпросмотр фото */}
          {preview && (
            <div className="mt-4 relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"
              >
                ✕
              </button>
            </div>
          )}

          {/* Предпросмотр видео */}
          {videoPreview && (
            <div className="mt-4 relative">
              <video
                src={videoPreview}
                controls
                className="w-full h-64 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setVideo(null);
                  setVideoPreview(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"
              >
                ✕
              </button>
            </div>
          )}

          {/* Опрос */}
          {isPoll && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-700 mb-3">
                📊 Варианты ответов:
              </h3>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                    placeholder={`Вариант ${index + 1}`}
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                    style={{ color: "#000" }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
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
                  className="text-purple-600 font-semibold text-sm hover:text-purple-700"
                >
                  + Добавить вариант
                </button>
              )}
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={(e) => setPollAllowMultiple(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">
                  Разрешить несколько вариантов
                </span>
              </label>
            </div>
          )}

          {/* Индикатор загрузки */}
          {uploading && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-600"></div>
                <span className="text-purple-700 font-medium">
                  Загрузка в Yandex Cloud...
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">{content.length} / 500</div>
            <button
              type="submit"
              disabled={
                uploading || (!content.trim() && !image && !video && !isPoll)
              }
              className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "⏳ Загрузка..." : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
