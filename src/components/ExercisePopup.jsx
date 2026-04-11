import { useState } from "react";
import { useFitness } from "../context/FitnessContext";

export default function ExercisePopup() {
  const {
    showExercisePopup,
    currentExercise,
    completeExercise,
    declineExercise,
    setIsRecording,
    setShowExercisePopup,
  } = useFitness();
  const [isRecording, setIsRecordingLocal] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!showExercisePopup || !currentExercise) return null;

  // 🔷 Начать запись
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setMediaStream(stream);
      setIsRecordingLocal(true);
      setIsRecording(true);
      setRecordedChunks([]);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0)
          setRecordedChunks((prev) => [...prev, event.data]);
      };
      mediaRecorder.start();

      // Автоматическая остановка через 15 секунд
      setTimeout(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      }, 15000);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
        setIsRecordingLocal(false);
        setIsRecording(false);
      };
    } catch (error) {
      console.error("Camera error:", error);
      alert(
        "❌ Не удалось получить доступ к камере. Проверьте разрешения в браузере.",
      );
    }
  };

  // 🔷 Отправить выполнение — ИСПРАВЛЕНО: загрузка через upload.js + отправка на сервер
  const handleSubmit = async () => {
    if (!videoUrl) {
      alert("Сначала запишите видео!");
      return;
    }
    setUploading(true);

    try {
      // Загружаем видео через upload сервис
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      // Конвертируем в base64 для отправки
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;

        // Отправляем на сервер для разблокировки
        const result = await completeExercise(base64);

        if (result.success) {
          setShowExercisePopup(false);
          alert("✅ Упражнение выполнено! Лента разблокирована на 30 минут 💪");
        } else {
          alert("❌ Ошибка: " + (result.error || "Неизвестная ошибка"));
        }
        setUploading(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Submit error:", error);
      alert("❌ Ошибка отправки: " + error.message);
      setUploading(false);
    }
  };

  // 🔷 Отмена
  const handleDecline = async () => {
    if (confirm("⚠️ Вы уверены? Лента будет заблокирована на 30 минут")) {
      const result = await declineExercise();
      if (result.success) {
        setShowExercisePopup(false);
        alert("⏰ Лента заблокирована. Возвращайтесь через 30 минут!");
      } else {
        alert("❌ Ошибка: " + (result.error || "Неизвестная ошибка"));
      }
    }
  };

  // 🔷 Перезаписать видео
  const handleReRecord = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setRecordedChunks([]);
    startRecording();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">💪</div>
          <h2 className="text-2xl font-bold text-purple-600 mb-2">
            Время фитнеса!
          </h2>
          <p className="text-gray-600">Вы провели 10 минут в приложении</p>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-purple-600 mb-1">Упражнение от:</p>
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentExercise.avatar || "/fox.gif"}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
            <span className="font-semibold">
              @{currentExercise.username || currentExercise.anonymous_author}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {currentExercise.exercise_name || currentExercise.exerciseName}
          </h3>
          {(currentExercise.exercise_description ||
            currentExercise.exerciseDescription) && (
            <p className="text-gray-600 text-sm">
              {currentExercise.exercise_description ||
                currentExercise.exerciseDescription}
            </p>
          )}
        </div>

        {videoUrl ? (
          <div className="mb-4">
            <video
              src={videoUrl}
              controls
              className="w-full rounded-xl bg-black"
            />
            <p className="text-center text-xs text-gray-500 mt-1">
              Просмотрите запись перед отправкой
            </p>
          </div>
        ) : isRecording ? (
          <div className="mb-4 bg-black rounded-xl p-6">
            <div className="text-center text-white">
              <div className="animate-pulse text-5xl mb-3">🎥</div>
              <p className="font-semibold">Запись...</p>
              <p className="text-sm text-gray-400">
                Остановится автоматически через 15 сек
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {!videoUrl && !isRecording && (
            <button
              onClick={startRecording}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              🎥 Начать запись (15 сек)
            </button>
          )}

          {videoUrl && (
            <>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? "⏳ Отправка..." : "✅ Выполнено! Разблокировать"}
              </button>
              <button
                onClick={handleReRecord}
                className="w-full border-2 border-purple-300 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all"
              >
                🔄 Перезаписать
              </button>
            </>
          )}

          <button
            onClick={handleDecline}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
          >
            ❌ Отмена (блок 30 мин)
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-4">
          💡 Совет: запишите приседания, отжимания или планку — любое упражнение
          подойдёт!
        </p>
      </div>
    </div>
  );
}
