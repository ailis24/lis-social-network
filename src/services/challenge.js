// src/services/challenge.js — REST API для челленджей

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

// Получить активные челленджи
export async function getActiveChallenges() {
  const res = await fetch("/api/challenges", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки челленджей");
  }

  return await res.json();
}

// Создать челлендж
export async function createChallenge({ title, description, endDate }) {
  const res = await fetch("/api/challenges", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title,
      description,
      endDate,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка создания челленджа");
  }

  return await res.json();
}

// Присоединиться к челленджу
export async function joinChallenge(challengeId) {
  const res = await fetch(`/api/challenges/${challengeId}/join`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка присоединения");
  }

  return await res.json();
}

// Отправить результат челленджа
export async function submitChallengeResult(challengeId, mediaUrl) {
  const res = await fetch(`/api/challenges/${challengeId}/submit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      mediaUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка отправки результата");
  }

  return await res.json();
}

// Удалить челлендж
export async function deleteChallenge(challengeId) {
  const res = await fetch(`/api/challenges/${challengeId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка удаления");
  }

  return await res.json();
}
