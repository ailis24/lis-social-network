import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function AddPost() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Обработка выбора файла (картинки)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result); // Сохраняем как Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!text && !image) {
      alert("Напиши что-нибудь или добавь фото!");
      return;
    }

    setLoading(true);
    try {
      // Отправляем POST запрос на сервер
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid, // 🔥 Важно!
        },
        body: JSON.stringify({
          text: text,
          image: image,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Пост опубликован! 🎉");
        navigate("/"); // Возвращаемся на ленту
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mt-4">
          {/* Шапка формы */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-purple-50">
            <h2 className="text-lg font-bold text-gray-800">✨ Новый пост</h2>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Поле ввода текста */}
          <div className="p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что у тебя нового?"
              className="w-full h-32 resize-none border-none focus:ring-0 text-gray-800 text-lg placeholder-gray-400"
            />

            {/* Предпросмотр картинки */}
            {image && (
              <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={image}
                  alt="Preview"
                  className="w-full max-h-64 object-cover"
                />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Кнопка загрузки фото */}
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer text-purple-600 hover:text-purple-800 font-medium">
                <span className="text-2xl">📷</span>
                <span>Добавить фото</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Кнопка публикации */}
          <div className="p-4 bg-gray-50">
            <button
              onClick={handlePost}
              disabled={loading || (!text && !image)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Публикуем..." : "Опубликовать"}
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
