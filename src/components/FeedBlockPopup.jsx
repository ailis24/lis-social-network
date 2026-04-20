import { useState, useEffect } from "react";
import { useFitness } from "../context/FitnessContext";

export default function FeedBlockPopup({ onClose }) {
  const { declineExercise, completeExercise, blockUntil } = useFitness();
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!blockUntil) return;
    const updateTimer = () => {
      const remaining = Math.floor((new Date(blockUntil) - new Date()) / 1000);
      setTimeRemaining(Math.max(0, remaining));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [blockUntil]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⏰</div>
        <h2 className="text-2xl font-bold text-purple-600 mb-2">
          Лента заблокирована
        </h2>
        <p className="text-gray-600 mb-6">
          Вы провели слишком много времени в приложении
        </p>

        <div className="bg-red-50 rounded-xl p-4 mb-6">
          <p className="text-red-600 font-semibold mb-2">
            ⏰ До разблокировки:
          </p>
          <p className="text-3xl font-bold text-red-700">
            {formatTime(timeRemaining)}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
          >
            ✕ Закрыть (подождать {formatTime(timeRemaining)})
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          💡 Совет: выполните упражнение чтобы разблокировать ленту
        </p>
      </div>
    </div>
  );
}
