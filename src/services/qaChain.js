// src/services/qaChain.js — REST API для цепочек вопросов

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

// Создать цепочку вопросов
export async function createQaChain({
  question,
  creatorId,
  creatorUsername,
  category,
}) {
  const res = await fetch("/api/qa-chains", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      question,
      category,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка создания цепочки");
  }

  return await res.json();
}

// Добавить ответ
export async function addAnswer(chainId, userId, username, answer) {
  const res = await fetch(`/api/qa-chains/${chainId}/answers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      answer,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка добавления ответа");
  }

  return await res.json();
}

// Получить цепочки
export async function getQaChains() {
  const res = await fetch("/api/qa-chains", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки");
  }

  return await res.json();
}

// Лайкнуть цепочку
export async function likeQaChain(chainId) {
  const res = await fetch(`/api/qa-chains/${chainId}/like`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка лайка");
  }

  return await res.json();
}

// Удалить цепочку
export async function deleteQaChain(chainId) {
  const res = await fetch(`/api/qa-chains/${chainId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка удаления");
  }

  return await res.json();
}
