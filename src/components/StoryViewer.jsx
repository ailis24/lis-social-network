import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const STORY_DURATION = 5000; // 5 секунд на сторис

export default function StoryViewer({
  storiesByUser,
  initialIndex,
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
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onNextUser();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      onPrevUser();
    }
  };

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);

  if (!currentStory) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
      <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src={currentStory.avatar}
            alt=""
            className="w-10 h-10 rounded-full border border-white/50"
          />
          <span className="text-white font-semibold drop-shadow-md">
            {currentStory.username}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white text-3xl drop-shadow-md"
        >
          &times;
        </button>
      </div>

      {/* Контент сторис */}
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        {currentStory.media_type === "video" ? (
          <video
            src={currentStory.media}
            autoPlay
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <img
            src={currentStory.media}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Зоны нажатия */}
      <div className="absolute inset-0 flex z-0">
        <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
      </div>
    </div>
  );
}
