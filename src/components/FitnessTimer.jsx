import { useFitness } from "../context/FitnessContext";
import { useEffect } from "react";

export default function FitnessTimer() {
  const {
    timerActive,
    totalSeconds,
    isBlocked,
    blockUntil,
    formatTime,
    timeUntilBlock,
    startTimer,
  } = useFitness();

  // Автозапуск при монтировании
  useEffect(() => {
    startTimer();
  }, []);

  if (isBlocked) {
    const remaining = blockUntil
      ? Math.floor((new Date(blockUntil) - new Date()) / 1000)
      : 0;

    return (
      <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏰</span>
          <div>
            <p className="font-semibold">Заблокировано</p>
            <p className="text-sm">Осталось: {formatTime(remaining)}</p>
          </div>
        </div>
      </div>
    );
  }

  const progress = (totalSeconds / 600) * 100;
  const isWarning = totalSeconds > 480; // Последние 2 минуты

  return (
    <div
      className={`fixed top-4 right-4 px-4 py-2 rounded-xl shadow-lg z-50 transition-colors ${
        isWarning ? "bg-red-500 text-white" : "bg-purple-500 text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">⏱️</span>
        <div>
          <p className="font-semibold text-sm">
            В сети: {formatTime(totalSeconds)}
          </p>
          <div className="w-24 h-1 bg-white/30 rounded-full mt-1">
            <div
              className={`h-full rounded-full transition-all ${isWarning ? "bg-yellow-300" : "bg-white"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
