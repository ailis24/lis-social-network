// src/services/stories.js — REST API вместо Firebase
import { fileToBase64 } from "./upload";

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

// Получить активные сторис (polling вместо onSnapshot)
export function getActiveStories(callback) {
  let cancelled = false;

  async function load() {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) callback(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("getActiveStories error:", e);
      if (!cancelled) callback([]);
    }
  }

  load();
  const interval = setInterval(load, 15000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// Получить сторис конкретного пользователя
export function getUserStories(userId, callback) {
  let cancelled = false;

  async function load() {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) return;
      const data = await res.json();
      const userStories = (Array.isArray(data) ? data : []).filter(
        (s) => s.authorId === userId
      );
      if (!cancelled) callback(userStories);
    } catch (e) {
      console.error("getUserStories error:", e);
      if (!cancelled) callback([]);
    }
  }

  load();
  const interval = setInterval(load, 15000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// Добавить сторис
export async function addStory(userId, username, avatar, file, mediaType = "image") {
  try {
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
  } catch (error) {
    console.error("Error adding story:", error);
    return { success: false, error: error.message };
  }
}

// Удалить сторис
export async function deleteStory(storyId) {
  try {
    const res = await fetch(`/api/stories/${storyId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Ошибка удаления");
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting story:", error);
    return { success: false, error: error.message };
  }
}

// Отметить просмотр
export async function markStoryViewed(storyId) {
  try {
    const res = await fetch(`/api/stories/${storyId}/view`, {
      method: "POST",
      headers: authHeaders(),
    });
    return res.ok ? await res.json() : { success: false };
  } catch (error) {
    console.error("Error marking story viewed:", error);
    return { success: false };
  }
}
