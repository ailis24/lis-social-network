// src/services/stories.js — REST API для сторис

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

// Конвертирует File в base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

// Получить активные сторис
export async function getActiveStories() {
  const res = await fetch("/api/stories");

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки сторис");
  }

  return await res.json();
}

// Добавить сторис
export async function addStory(
  userId,
  username,
  avatar,
  file,
  mediaType = "image",
) {
  const media = await fileToBase64(file);

  const res = await fetch("/api/stories", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ media, mediaType }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки сторис");
  }

  return await res.json();
}

// Удалить сторис
export async function deleteStory(storyId) {
  const res = await fetch(`/api/stories/${storyId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка удаления");
  }

  return await res.json();
}

// Отметить просмотр
export async function markStoryViewed(storyId) {
  const res = await fetch(`/api/stories/${storyId}/view`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка отметки просмотра");
  }

  return await res.json();
}
