import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";

export default function Fitness() {
  const { currentUser, userData } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [publishToFeed, setPublishToFeed] = useState(false);
  const [exerciseMedia, setExerciseMedia] = useState(null);

  // Для добавления упражнения
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseDescription, setExerciseDescription] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  // Загрузка упражнений
  useEffect(() => {
    const loadExercises = async () => {
      try {
        // TODO: заменить на реальный API-запрос
        const mockExercises = [
          {
            id: "1",
            name: "Приседания",
            description: "20 повторений, 3 подхода",
            difficulty: "easy",
            completions: 156,
            emoji: "🏋️",
          },
          {
            id: "2",
            name: "Отжимания",
            description: "15 повторений, 3 подхода",
            difficulty: "medium",
            completions: 89,
            emoji: "💪",
          },
          {
            id: "3",
            name: "Планка",
            description: "60 секунд, 3 подхода",
            difficulty: "hard",
            completions: 234,
            emoji: "🧘",
          },
        ];
        setExercises(mockExercises);
      } catch (error) {
        console.error("Ошибка загрузки:", error);
      } finally {
        setLoading(false);
      }
    };
    loadExercises();
  }, []);

  const handleAddExercise = async () => {
    if (!exerciseName.trim()) {
      alert("Введите название упражнения!");
      return;
    }

    try {
      // TODO: заменить на реальный API-запрос
      const newExercise = {
        id: Date.now().toString(),
        name: exerciseName,
        description: exerciseDescription,
        difficulty,
        completions: 0,
        emoji: "✨",
      };

      setExercises([newExercise, ...exercises]);
      alert("Упражнение добавлено! 💪");
      setShowAddModal(false);
      setExerciseName("");
      setExerciseDescription("");
      setDifficulty("medium");
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleCompleteExercise = async (exercise) => {
    setSelectedExercise(exercise);
    setShowPublishModal(true);
  };

  const handlePublishResult = async () => {
    try {
      // TODO: заменить на реальный API-запрос
      if (publishToFeed) {
        // Создаём пост в ленте
        const postText = `✅ Выполнил упражнение: ${selectedExercise.name}\n${selectedExercise.description}`;

        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: postText,
            image: exerciseMedia || "",
          }),
        });

        if (response.ok) {
          alert("🎉 Результат опубликован в ленте!");
        }
      }

      // Обновляем счётчик выполнений
      setExercises(
        exercises.map((ex) =>
          ex.id === selectedExercise.id
            ? { ...ex, completions: ex.completions + 1 }
            : ex,
        ),
      );

      setShowPublishModal(false);
      setPublishToFeed(false);
      setExerciseMedia(null);
      alert(`✅ ${selectedExercise.name} выполнено! Так держать! 🔥`);
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExerciseMedia(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getDifficultyColor = (diff) => {
    const colors = {
      easy: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      hard: "bg-red-100 text-red-700",
    };
    return colors[diff] || colors.medium;
  };

  const getDifficultyName = (diff) => {
    const names = {
      easy: "Лёгкий",
      medium: "Средний",
      hard: "Сложный",
    };
    return names[diff] || diff;
  };

  // 🔷 Генерируем анонимное имя
  const getAnonymousName = (exerciseId) => {
    const hash = exerciseId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `Участник #${hash % 1000}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-4 px-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">💪 Фитнес-челленджи</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + Добавить
          </button>
        </div>

        {/* Инфо блок */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 text-white">
          <p className="text-sm">
            <strong>💡 Как это работает:</strong> Выполняй упражнения от других
            участников, добавляй свои и делись результатами в ленте! 💪
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white">Загрузка...</div>
        ) : exercises.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg mb-2">Нет упражнений</p>
            <p className="text-white/80 text-sm">Будь первым кто добавит! 💪</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Заголовок карточки */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{exercise.emoji}</span>
                      <div>
                        <h3 className="font-bold text-lg">{exercise.name}</h3>
                        <p className="text-sm opacity-90">
                          от {getAnonymousName(exercise.id)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(exercise.difficulty)}`}
                    >
                      {getDifficultyName(exercise.difficulty)}
                    </span>
                  </div>
                </div>

                {/* Описание */}
                <div className="p-4">
                  <p className="text-gray-700 mb-4">{exercise.description}</p>

                  {/* Кнопка выполнить */}
                  <button
                    onClick={() => handleCompleteExercise(exercise)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>✅</span>
                    <span>Выполнить упражнение</span>
                  </button>

                  {/* Статистика */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        👥 Выполнили: <strong>{exercise.completions}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно добавления упражнения */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">💪 Добавить упражнение</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Название упражнения *
                </label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="Например: Приседания"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Сложность
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                >
                  <option value="easy">🟢 Лёгкий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="hard">🔴 Сложный</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Описание / Инструкция
                </label>
                <textarea
                  value={exerciseDescription}
                  onChange={(e) => setExerciseDescription(e.target.value)}
                  placeholder="Сколько повторений? Как правильно делать?"
                  rows="3"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500"
                  style={{ color: "#000" }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddExercise}
                disabled={!exerciseName.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Добавить упражнение
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setExerciseName("");
                  setExerciseDescription("");
                  setDifficulty("medium");
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Модальное окно публикации результата */}
      {showPublishModal && selectedExercise && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">🎉 Отличный результат!</h2>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Вы выполнили: <strong>{selectedExercise.name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {selectedExercise.description}
              </p>
            </div>

            {/* Чекбокс публикации */}
            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishToFeed}
                  onChange={(e) => setPublishToFeed(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <p className="font-semibold text-purple-900">
                    📤 Опубликовать в ленте
                  </p>
                  <p className="text-sm text-purple-700">
                    Расскажи друзьям о своём достижении!
                  </p>
                </div>
              </label>
            </div>

            {/* Загрузка фото/видео */}
            {publishToFeed && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  📸 Прикрепить фото/видео (необязательно)
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl"
                />
                {exerciseMedia && (
                  <div className="mt-2">
                    {exerciseMedia.startsWith("video") ? (
                      <video
                        src={exerciseMedia}
                        controls
                        className="w-full rounded-xl"
                      />
                    ) : (
                      <img
                        src={exerciseMedia}
                        alt="Exercise"
                        className="w-full rounded-xl"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={handlePublishResult}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold"
              >
                {publishToFeed ? "📤 Опубликовать" : "✅ Готово"}
              </button>
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishToFeed(false);
                  setExerciseMedia(null);
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
