// src/services/posts.js — REST API для постов

function getCurrentUid() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"))?.uid || "";
  } catch {
    return "";
  }
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Добавляем X-User-Id если есть пользователь
  const uid = getCurrentUid();
  if (uid) {
    headers["X-User-Id"] = uid;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

// Получить все посты
export async function getPosts(cursor = null) {
  let url = "/api/posts?limit=20";
  if (cursor) url += `&cursor=${cursor}`;
  return apiRequest(url);
}

// Получить посты пользователя
export async function getUserPosts(userId, cursor = null) {
  let url = `/api/posts/by-user/${userId}?limit=20`;
  if (cursor) url += `&cursor=${cursor}`;
  return apiRequest(url);
}

// Создать пост
export async function createPost(postData) {
  return apiRequest("/api/posts", {
    method: "POST",
    body: JSON.stringify(postData),
  });
}

// Обновить пост (только опрос или текст для автора)
export async function updatePost(postId, updates) {
  return apiRequest(`/api/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// Удалить пост
export async function deletePost(postId) {
  return apiRequest(`/api/posts/${postId}`, {
    method: "DELETE",
  });
}

// Лайкнуть пост
export async function likePost(postId) {
  return apiRequest(`/api/posts/${postId}/like`, {
    method: "POST",
  });
}

// Получить комментарии
export async function getComments(postId) {
  return apiRequest(`/api/posts/${postId}/comments`);
}

// Добавить комментарий
export async function addComment(postId, text) {
  return apiRequest(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// Удалить комментарий
export async function deleteComment(postId, commentId) {
  return apiRequest(`/api/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}
