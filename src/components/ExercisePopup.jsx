import { useState } from "react";
import { useFitness } from "../context/FitnessContext";
import { useAuth } from "../context/AuthContext";

export default function ExercisePopup() {
  const {
    currentExercise,
    completeExercise,
    declineExercise,
    setShowExercisePopup,
  } = useFitness();
  const { currentUser } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 🔧 Запись видео
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
        audio: false,
      });
      setMediaStream(stream);
      setIsRecording(true);
      setRecordedChunks([]);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      mediaRecorder.start();

      // Авто-стоп через 10 секунд
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 10000);

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        // Останавливаем камеру
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (error) {
      console.error("❌ Camera Error:", error);
      alert("Не удалось включить камеру. Проверьте разрешения!");
    }
  };

  // 🔧 Отправка видео
  const handleSubmit = async () => {
    if (recordedChunks.length === 0) return;
    setUploading(true);

    try {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64 = reader.result;
        // Вызываем функцию из контекста
        const result = await completeExercise(base64);

        if (result.success) {
          alert("🎉 Отлично! Лента разблокирована!");
          setShowExercisePopup(false);
        } else {
          alert("Ошибка: " + result.error);
        }
        setUploading(false);
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Submit Error:", error);
      setUploading(false);
    }
  };

  // 🔧 Отказ от упражнения
  const handleDecline = async () => {
    if (confirm("Вы уверены? Лента заблокируется на 30 минут.")) {
      const result = await declineExercise();
      if (result.success) {
        setShowExercisePopup(false);
      }
    }
  };

  if (!currentExercise) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🦊</div>
          <h2 className="text-2xl font-bold text-purple-600">
            Время разминки!
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Вы сидели в приложении 10 минут
          </p>
        </div>

        {/* Карточка упражнения */}
        <div className="bg-purple-50 rounded-2xl p-4 mb-6 border border-purple-100">
          <h3 className="font-bold text-gray-800 text-lg">
            {currentExercise.exercise_name || "Приседания"}
          </h3>
          <p className="text-purple-600 text-sm mt-1">
            {currentExercise.exercise_description || "Сделай 20 раз!"}
          </p>
        </div>

        {/* Область видео */}
        <div className="mb-6 bg-gray-100 rounded-2xl h-64 flex items-center justify-center overflow-hidden relative">
          {isRecording ? (
            <div className="text-center">
              <div className="text-4xl animate-pulse mb-2">🎥</div>
              <p className="text-red-500 font-bold">Идёт запись...</p>
              <p className="text-xs text-gray-500">10 секунд</p>
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-2">📷</p>
              <p>Камера выключена</p>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="space-y-3">
          {!videoUrl && !isRecording && (
            <button
              onClick={startRecording}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              🎥 Начать запись
            </button>
          )}

          {videoUrl && (
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {uploading ? "⏳ Отправка..." : "✅ Я выполнил! Разблокировать"}
            </button>
          )}

          <button
            onClick={handleDecline}
            className="w-full bg-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
          >
            ❌ Отказаться (блок 30 мин)
          </button>
        </div>
      </div>
    </div>
  );
}
