import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function AddStory() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // "user" или "environment"
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [maxRecordingTime] = useState(15); // 15 секунд макс
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState("image"); // "image" или "video"
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // 🔷 Проверка поддержки камеры
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Камера не поддерживается в этом браузере");
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some((d) => d.kind === "videoinput");
        setHasCamera(hasVideo);
        if (!hasVideo) {
          setCameraError("Камера не найдена на устройстве");
        }
      } catch (error) {
        setCameraError("Ошибка доступа к камере: " + error.message);
      }
    };
    checkCamera();
    return () => stopCamera();
  }, []);

  // 🔷 Запуск камеры
  const startCamera = async () => {
    try {
      setCameraError(null);
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mediaType === "video",
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        error.name === "NotAllowedError"
          ? "Доступ к камере запрещён. Разрешите в настройках браузера."
          : "Ошибка камеры: " + error.message,
      );
    }
  };

  // 🔷 Остановка камеры
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 🔷 Переключение камеры
  const toggleCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    stopCamera();
    setTimeout(() => startCamera(), 100);
  };

  // 🔷 Съёмка фото
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Устанавливаем размер канваса как у видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Рисуем кадр из видео на канвас
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Получаем изображение как blob
    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setMediaType("image");
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  // 🔷 Начало записи видео
  const startRecording = () => {
    if (!videoRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setMediaType("video");
      stopCamera();
      setRecordingTime(0);
    };

    mediaRecorder.start(100); // Собирать данные каждые 100мс
    setIsRecording(true);

    // Таймер записи
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxRecordingTime - 1) {
          stopRecording();
          return maxRecordingTime;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // 🔷 Остановка записи видео
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // 🔷 Пересъёмка
  const retake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCaption("");
    startCamera();
  };

  // 🔷 Загрузка сторис
  const handleUpload = async () => {
    if (!previewUrl || !currentUser || uploading) return;

    setUploading(true);
    try {
      // Конвертируем preview URL в blob
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `story-${Date.now()}.${mediaType === "image" ? "jpg" : "webm"}`,
        {
          type: mediaType === "image" ? "image/jpeg" : "video/webm",
        },
      );

      // Загружаем файл
      const mediaUrl = await uploadFile(file, currentUser.uid, "stories");

      // Создаём сторис через API
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          media: mediaUrl,
          mediaType: mediaType,
          caption: caption.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("🎉 Сторис опубликована!");
        navigate("/");
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ошибка загрузки: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 🔷 Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [previewUrl]);

  // 🔷 Запускаем камеру при монтировании
  useEffect(() => {
    if (hasCamera && !stream && !previewUrl) {
      startCamera();
    }
  }, [hasCamera, facingMode]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-600 to-white">
        <div className="text-purple-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-20">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            📸 Новая сторис
          </h1>
          <p className="text-white/90 drop-shadow">
            Снимите фото или короткое видео (до {maxRecordingTime} сек)
          </p>
        </div>

        {/* 🔷 ОШИБКА КАМЕРЫ */}
        {cameraError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            <p className="font-bold">⚠️ Ошибка</p>
            <p>{cameraError}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 text-sm underline"
            >
              Вернуться в ленту
            </button>
          </div>
        )}

        {/* 🔷 ПРЕВЬЮ (после съёмки) */}
        {previewUrl ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
            {mediaType === "image" ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-96 object-contain bg-black"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className="w-full max-h-96 object-contain bg-black"
              />
            )}

            {/* Подпись */}
            <div className="p-4">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Добавить подпись..."
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-gray-800"
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {caption.length}/100
              </p>
            </div>

            {/* Кнопки действий */}
            <div className="p-4 flex gap-3 bg-gray-50">
              <button
                onClick={retake}
                disabled={uploading}
                className="flex-1 py-3 border-2 border-purple-500 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                🔄 Переснять
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? "⏳ Загрузка..." : "✨ Опубликовать"}
              </button>
            </div>
          </div>
        ) : (
          /* 🔷 КАМЕРА */
          <div className="bg-black rounded-2xl overflow-hidden mb-4 relative aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Канвас для захвата фото (скрытый) */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Индикатор записи */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-mono">
                  {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:
                  {String(recordingTime % 60).padStart(2, "0")}
                </span>
              </div>
            )}

            {/* Кнопки управления */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 px-4">
              {/* Переключение камеры */}
              <button
                onClick={toggleCamera}
                disabled={isRecording}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors disabled:opacity-50"
                title="Переключить камеру"
              >
                🔄
              </button>

              {/* Кнопка съёмки */}
              {mediaType === "image" ? (
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full border-4 border-purple-500 hover:scale-105 transition-transform flex items-center justify-center"
                >
                  <div className="w-16 h-16 bg-purple-500 rounded-full"></div>
                </button>
              ) : (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-red-500 border-white hover:scale-95"
                      : "bg-white border-purple-500 hover:scale-105"
                  }`}
                >
                  {isRecording ? (
                    <div className="w-8 h-8 bg-white rounded"></div>
                  ) : (
                    <div className="w-16 h-16 bg-red-500 rounded-full"></div>
                  )}
                </button>
              )}

              {/* Переключение режимов */}
              <button
                onClick={() => {
                  setMediaType(mediaType === "image" ? "video" : "image");
                  if (stream) {
                    stopCamera();
                    setTimeout(() => startCamera(), 100);
                  }
                }}
                disabled={isRecording}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors disabled:opacity-50"
                title={mediaType === "image" ? "Режим видео" : "Режим фото"}
              >
                {mediaType === "image" ? "🎬" : "📸"}
              </button>
            </div>

            {/* Прогресс записи видео */}
            {isRecording && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{
                    width: `${(recordingTime / maxRecordingTime) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 🔷 ИНСТРУКЦИЯ */}
        {!previewUrl && !cameraError && (
          <div className="text-center text-white/80 text-sm">
            <p>📸 Тапните по кругу для фото</p>
            <p>
              🎬 Или переключитесь на видео для записи до {maxRecordingTime} сек
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
