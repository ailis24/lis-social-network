import { createContext, useContext, useState, useEffect } from "react";

const FitnessContext = createContext(null);

export function useFitness() {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error("useFitness must be used within a FitnessProvider");
  }
  return context;
}

export function FitnessProvider({ children }) {
  const [timerActive, setTimerActive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockUntil, setBlockUntil] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [showExercisePopup, setShowExercisePopup] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const BLOCK_TIME = 600;

  useEffect(() => {
    if (!timerActive || isBlocked) return;

    const checkFeedTimer = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));

        if (!currentUser?.uid) {
          return;
        }

        const res = await fetch("/api/feed/timer", {
          headers: { "X-User-Id": currentUser.uid },
        });

        if (!res.ok) {
          console.error("Feed timer error:", res.status);
          return;
        }

        const data = await res.json();

        if (data.isBlocked) {
          setIsBlocked(true);
          setBlockUntil(data.blockUntil);
          setTimerActive(false);
        } else if (data.shouldBlock) {
          await loadRandomExercise();
          setShowExercisePopup(true);
          setTimerActive(false);
        } else {
          setTotalSeconds(data.sessionSeconds || 0);
        }
      } catch (error) {
        console.error("Feed timer error:", error);
      }
    };

    checkFeedTimer();
    const interval = setInterval(checkFeedTimer, 60000);
    return () => clearInterval(interval);
  }, [timerActive, isBlocked]);

  const loadRandomExercise = async () => {
    try {
      const res = await fetch("/api/fitness/exercises/random");

      if (!res.ok) {
        console.error("Load exercise error:", res.status);
        return;
      }

      const data = await res.json();
      setCurrentExercise(data);
    } catch (error) {
      console.error("Load exercise error:", error);
    }
  };

  const startTimer = () => {
    setTimerActive(true);
    setIsBlocked(false);
  };

  const stopTimer = () => {
    setTimerActive(false);
  };

  const completeExercise = async (videoUrl) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));

      if (!currentUser?.uid) {
        return { success: false, error: "Пользователь не авторизован" };
      }

      const res = await fetch("/api/feed/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          exerciseId: currentExercise?.id || "default",
          videoUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || "Ошибка сервера" };
      }

      const data = await res.json();

      setShowExercisePopup(false);
      setIsRecording(false);
      setTotalSeconds(0);
      setTimerActive(true);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const declineExercise = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));

      if (!currentUser?.uid) {
        return { success: false, error: "Пользователь не авторизован" };
      }

      const res = await fetch("/api/feed/decline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || "Ошибка сервера" };
      }

      const data = await res.json();

      setIsBlocked(true);
      setBlockUntil(data.blockUntil);
      setShowExercisePopup(false);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const suggestExercise = async (exerciseName, description) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));

      if (!currentUser?.uid) {
        return { success: false, error: "Пользователь не авторизован" };
      }

      const res = await fetch("/api/fitness/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          exerciseName,
          exerciseDescription: description,
        }),
      });

      return res.ok
        ? { success: true }
        : { success: false, error: "Ошибка сервера" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const value = {
    timerActive,
    totalSeconds,
    isBlocked,
    blockUntil,
    currentExercise,
    showExercisePopup,
    isRecording,
    startTimer,
    stopTimer,
    completeExercise,
    declineExercise,
    suggestExercise,
    loadRandomExercise,
    setShowExercisePopup,
    setIsRecording,
    formatTime,
    timeUntilBlock: BLOCK_TIME - totalSeconds,
  };

  return (
    <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>
  );
}
