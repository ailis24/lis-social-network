import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";

export default function FeedBlockPopup({ onUnlock, onClose }) {
  const { currentUser } = useAuth();
  const { isPremium, expiresAt, activatePremium } = usePremium();
  const [exercise, setExercise] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(1800);
  const [showPremiumOffer, setShowPremiumOffer] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  // 🔷 ТВОИ РЕКВИЗИТЫ СБП 👇 ЗАМЕНИ НА СВОИ!
  const SBP_PHONE = "+79999099549"; // 👈 Твой номер для СБП
  const SBP_BANK = "Сбербанк"; // 👈 Твой банк
  const SBP_NAME = "Александр Беляевский"; // 👈 Твоё имя
  const SUPPORT_LINK = "https://t.me/alex_ddog"; // 👈 Твой контакт для подтверждения

  useEffect(() => {
    loadExercise();
  }, []);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(
        () => setTimeRemaining((prev) => prev - 1),
        1000,
      );
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const loadExercise = async () => {
    try {
      const res = await fetch("/api/fitness/exercises/random");
      const data = await res.json();
      setExercise(data);
    } catch (error) {
      console.error("Load exercise error:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setIsRecording(true);
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 30000);
    } catch (error) {
      console.error("Camera error:", error);
      alert("Не удалось получить доступ к камере");
    }
  };

  const handleUnlock = async () => {
    if (!videoUrl) {
      alert("Сначала запишите видео выполнения!");
      return;
    }
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        const res = await fetch("/api/feed/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId: exercise?.id, videoUrl: base64 }),
        });
        const data = await res.json();
        if (data.success) onUnlock();
        else alert("Ошибка: " + data.error);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      alert("Ошибка при отправке: " + error.message);
    }
  };

  const handleClaimPremium = async () => {
    setClaimLoading(true);
    try {
      const res = await fetch("/api/premium/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionInfo: `СБП перевод на ${SBP_PHONE}`,
          paymentProof: "manual_confirmation",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        if (activatePremium) activatePremium("sbp_manual");
        onClose();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      alert("Ошибка соединения: " + error.message);
    } finally {
      setClaimLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isPremium) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-purple-600 mb-2">
            Лента заблокирована
          </h2>
          <p className="text-gray-600">Вы провели 30 минут в ленте</p>
        </div>

        {!showPremiumOffer ? (
          <>
            {/* Упражнение */}
            <div className="bg-purple-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-purple-600 mb-1">💪 Задание от:</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                  {exercise?.anonymous_author?.charAt(0) || "У"}
                </div>
                <span className="font-semibold">
                  {exercise?.anonymous_author || "Участник"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {exercise?.exercise_name || "Приседания"}
              </h3>
              <p className="text-gray-600 text-sm">
                {exercise?.exercise_description || "20 повторений"}
              </p>
            </div>

            {/* Видео */}
            {videoUrl ? (
              <div className="mb-4">
                <video src={videoUrl} controls className="w-full rounded-xl" />
              </div>
            ) : isRecording ? (
              <div className="mb-4 bg-black rounded-xl p-4">
                <div className="text-center text-white">
                  <div className="animate-pulse text-4xl mb-2">🎥</div>
                  <p>Запись... (30 сек)</p>
                </div>
              </div>
            ) : null}

            {/* Кнопки */}
            <div className="space-y-3 mb-4">
              {!videoUrl && !isRecording && (
                <button
                  onClick={startRecording}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold"
                >
                  🎥 Начать запись выполнения
                </button>
              )}
              {videoUrl && (
                <button
                  onClick={handleUnlock}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold"
                >
                  ✅ Выполнено! Разблокировать ленту
                </button>
              )}

              {/* Кнопка премиум */}
              <button
                onClick={() => setShowPremiumOffer(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                👑 Без блокировок за 199₽/мес
              </button>

              <p className="text-center text-sm text-gray-500">
                Или подождите {formatTime(timeRemaining)}
              </p>
            </div>
          </>
        ) : (
          /* Модальное окно премиум */
          <div className="text-center">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Lis Premium
            </h3>
            <p className="text-gray-600 mb-4">Никаких блокировок ленты!</p>

            {/* Предупреждение о ручном режиме */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-semibold mb-2">
                ⚠️ Временно: ручная активация
              </p>
              <p className="text-gray-700 text-sm mb-3">
                Переведите <strong>199₽</strong> через СБП:
              </p>
              <div className="bg-white rounded-lg p-3 font-mono text-sm text-left">
                <p className="mb-1">
                  📱 Телефон:{" "}
                  <strong className="text-purple-600">{SBP_PHONE}</strong>
                </p>
                <p className="mb-1">
                  🏦 Банк: <strong>{SBP_BANK}</strong>
                </p>
                <p className="mb-2">
                  👤 Получатель: <strong>{SBP_NAME}</strong>
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SBP_PHONE);
                    alert("📋 Номер скопирован!");
                  }}
                  className="text-xs text-purple-600 hover:underline"
                >
                  📋 Скопировать номер
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                После перевода напишите ваш ник{" "}
                <strong>@{currentUser?.username}</strong> в поддержку:
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={SUPPORT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                💬 Написать в поддержку после оплаты
              </a>

              <button
                onClick={handleClaimPremium}
                disabled={claimLoading}
                className="w-full border-2 border-green-300 text-green-700 py-3 rounded-xl font-semibold hover:bg-green-50 disabled:opacity-50"
              >
                {claimLoading
                  ? "⏳ Проверка..."
                  : "✅ Я уже оплатил — активировать"}
              </button>

              <button
                onClick={() => setShowPremiumOffer(false)}
                className="w-full text-gray-500 py-2 text-sm hover:text-gray-700"
              >
                ← Назад к упражнению
              </button>
            </div>

            {/* Преимущества премиум */}
            <div className="mt-6 pt-4 border-t text-left">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Что даёт Premium:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✅ Никаких блокировок ленты</li>
                <li>✅ Приоритетная поддержка</li>
                <li>✅ Эксклюзивные значки в профиле</li>
                <li>✅ Ранний доступ к новым функциям</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
