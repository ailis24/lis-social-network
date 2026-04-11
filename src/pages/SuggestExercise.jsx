import { useState } from "react";
import { useFitness } from "../context/FitnessContext";
import { useNavigate } from "react-router-dom";

export default function SuggestExercise() {
  const [exerciseName, setExerciseName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { suggestExercise } = useFitness();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await suggestExercise(exerciseName, description);

    if (result.success) {
      alert("✅ Упражнение добавлено!");
      navigate("/");
    } else {
      alert("❌ Ошибка");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💡</div>
          <h1 className="text-3xl font-bold text-purple-600 mb-2">
            Предложить упражнение
          </h1>
          <p className="text-gray-600">
            Другие пользователи будут выполнять его!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Название *</label>
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Например: Отжимания"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Сколько раз? Как правильно делать?"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
              rows="3"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !exerciseName.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? "⏳ Отправка..." : "💪 Предложить"}
          </button>
        </form>
      </div>
    </div>
  );
}
