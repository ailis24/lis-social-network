import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useFitness } from "../context/FitnessContext";
import { getRandomExercise, suggestExercise } from "../services/fitness";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { useNavigate } from "react-router-dom";

export default function Fitness() {
  const { currentUser } = useAuth();
  const { completeExercise, declineExercise } = useFitness();
  const navigate = useNavigate();

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseMedia, setExerciseMedia] = useState(null);
  const [publishToFeed, setPublishToFeed] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fitness/exercises/random");
      if (res.ok) {
        const exercise = await res.json();
        setExercises([exercise]);
      }
    } catch (error) {
      console.error("Load exercises error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExercise = async (exercise) => {
    setSelectedExercise(exercise);
    setShowPublishModal(true);
  };

  const handlePublishResult = async () => {
    try {
      if (publishToFeed) {
        const postText = `✅ Выполнил упражнение: ${selectedExercise.name} ${selectedExercise.description}`;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">💪 Фитнес</h1>
          <p className="text-white/80">
            Выполняй упражнения и оставайся здоровым!
          </p>
        </div>

        {/* Список упражнений */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Доступные упражнения
            </h2>
            <button
              onClick={() => navigate("/suggest-exercise")}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors text-sm"
            >
              ➕ Предложить
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-white">Загрузка...</div>
          ) : exercises.length === 0 ? (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center">
              <p className="text-white text-lg mb-2">Нет упражнений</p>
              <p className="text-white/80 text-sm">
                Будь первым кто добавит! 💪
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                    <h3 className="text-xl font-bold">
                      {exercise.exercise_name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(exercise.difficulty)}`}
                    >
                      {exercise.difficulty === "easy"
                        ? "Лёгкий"
                        : exercise.difficulty === "medium"
                          ? "Средний"
                          : "Сложный"}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="text-gray-600 mb-4">
                      {exercise.exercise_description}
                    </p>

                    <button
                      onClick={() => handleCompleteExercise(exercise)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span>✅</span>
                      <span>Выполнить упражнение</span>
                    </button>

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
      </div>

      <BottomNav />

      {/* Модальное окно публикации */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              🎉 Результат
            </h3>

            <div className="mb-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={publishToFeed}
                  onChange={(e) => setPublishToFeed(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Опубликовать в ленте</span>
              </label>

              {publishToFeed && (
                <div className="mt-3">
                  <label className="block text-sm text-gray-600 mb-2">
                    Фото/видео выполнения (необязательно):
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePublishResult}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold"
              >
                ✨ Опубликовать
              </button>
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishToFeed(false);
                  setExerciseMedia(null);
                }}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
