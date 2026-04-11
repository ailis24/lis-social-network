import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { deleteStory } from "../services/stories";

const STORY_DURATION = 5000;

export default function StoryViewer({
  userId,
  initialIndex,
  storiesByUser,
  onClose,
  onNextUser,
  onPrevUser,
}) {
  const { currentUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressInterval = useRef(null);
  const storyTimeout = useRef(null);

  const currentStory = storiesByUser[currentIndex];
  const isOwner = currentStory?.userId === currentUser?.uid;

  useEffect(() => {
    if (!isPaused && currentStory) {
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval.current);
            handleNext();
            return 0;
          }
          return prev + 100 / (STORY_DURATION / 100);
        });
      }, 100);

      storyTimeout.current = setTimeout(() => {
        handleNext();
      }, STORY_DURATION);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (storyTimeout.current) clearTimeout(storyTimeout.current);
    };
  }, [currentIndex, isPaused, currentStory]);

  const handleNext = () => {
    if (currentIndex < storiesByUser.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onNextUser();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      onPrevUser();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить эту сторис?")) return;

    const result = await deleteStory(currentStory.id, currentUser.uid);
    if (result.success) {
      if (storiesByUser.length === 1) {
        onClose();
      } else {
        handleNext();
      }
    } else {
      alert("Ошибка: " + result.error);
    }
  };

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);

  if (!currentStory) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
    >
      {/* Прогресс бары */}
      <div className="absolute top-0 left-0 right-0 z-10 p-2 flex gap-1">
        {storiesByUser.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  index < currentIndex
                    ? "100%"
                    : index === currentIndex
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Шапка */}
      <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src={currentStory.avatar}
            alt={currentStory.username}
            className="w-8 h-8 rounded-full border-2 border-white"
          />
          <span className="text-white font-semibold text-sm">
            {currentStory.username}
          </span>
          <span className="text-white/70 text-xs">
            {new Date(
              currentStory.createdAt?.toDate?.() || currentStory.createdAt,
            ).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={handleDelete}
              className="text-white/70 hover:text-white text-sm px-3 py-1"
            >
              Удалить
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Контент сторис — ТЕПЕРЬ И ФОТО, И ВИДЕО */}
      <div className="w-full h-full flex items-center justify-center">
        {currentStory.mediaType === "video" ? (
          <video
            src={currentStory.mediaUrl}
            autoPlay
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={currentStory.mediaUrl || currentStory.imageUrl}
            alt="Story"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Навигация */}
      <div className="absolute inset-0 flex">
        <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
      </div>
    </div>
  );
}
