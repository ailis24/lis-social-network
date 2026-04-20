// src/services/fitness.js — REST API для фитнес-упражнений

function getCurrentUid() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"))?.uid || "";
  } catch {
    return "";
  }
}

function authHeaders() {
  const uid = getCurrentUid();
  return {
    "Content-Type": "application/json",
    ...(uid ? { "X-User-Id": uid } : {}),
  };
}

// Получить случайное упражнение
export async function getRandomExercise() {
  const res = await fetch("/api/fitness/exercises/random", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки упражнения");
  }

  return await res.json();
}

// Предложить новое упражнение
export async function suggestExercise(
  exerciseName,
  description,
  difficulty = "medium",
) {
  const res = await fetch("/api/fitness/exercises", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      exerciseName,
      exerciseDescription: description,
      difficulty,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка отправки упражнения");
  }

  return await res.json();
}

// Выполнить упражнение (разблокировать ленту)
export async function completeExercise(exerciseId, videoUrl) {
  const res = await fetch("/api/feed/unlock", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      exerciseId,
      videoUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка выполнения упражнения");
  }

  return await res.json();
}

// Отказаться от упражнения (заблокировать ленту)
export async function declineExercise() {
  const res = await fetch("/api/feed/decline", {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка отказа от упражнения");
  }

  return await res.json();
}

// Проверить статус таймера
export async function getFeedTimer() {
  const res = await fetch("/api/feed/timer", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка проверки таймера");
  }

  return await res.json();
}
