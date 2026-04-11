// src/services/ydb.js - Frontend client для API backend

// 🔧 Определяем правильный API URL
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    console.log("🔌 Using API URL from .env:", envUrl);
    return envUrl.trim();
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname.includes("replit.dev") || hostname.includes("repl.co")) {
      console.log("🔌 Replit detected — using relative paths (/api/...)");
      return "";
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🔌 Localhost — using http://localhost:3000");
      return "http://localhost:3000";
    }
  }

  console.log("🔌 Using empty base URL (relative paths)");
  return "";
};

const API_BASE = getApiBaseUrl();
console.log("🔌 API_BASE initialized:", API_BASE || "(relative)");

// 🔧 Получить uid текущего пользователя из localStorage
function getCurrentUid() {
  try {
    const stored = localStorage.getItem("currentUser");
    if (!stored) return "";
    return JSON.parse(stored)?.uid || "";
  } catch {
    return "";
  }
}

// 🔧 Заголовки с авторизацией (X-User-Id автоматически для всех запросов)
function getAuthHeaders(extra = {}) {
  const uid = getCurrentUid();
  return {
    "Content-Type": "application/json",
    ...(uid ? { "X-User-Id": uid } : {}),
    ...extra,
  };
}

// 🔧 Универсальный fetch с авторизацией и обработкой ошибок
async function apiRequest(endpoint, options = {}) {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
      credentials: "include",
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`❌ API Error ${response.status}:`, responseText);
      let errorData = { error: `HTTP ${response.status}` };
      try {
        errorData = JSON.parse(responseText);
      } catch {}
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    if (!responseText.trim()) {
      return { success: true };
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON:", responseText);
      throw new Error("Invalid JSON response from server");
    }
  } catch (error) {
    console.error(`❌ Fetch error for ${endpoint}:`, error);

    if (
      error.message.includes("Failed to fetch") ||
      error.name === "TypeError"
    ) {
      throw new Error(
        `Cannot connect to API server at ${API_BASE || window.location.origin}. Is the backend running?`,
      );
    }
    throw error;
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────

export async function initYDB() {
  try {
    const health = await apiRequest("/api/health");
    console.log("✅ API server health:", health);
    return health;
  } catch (error) {
    console.warn("⚠️ Could not check API health:", error.message);
    return { success: true };
  }
}

export async function createTables() {
  try {
    return await apiRequest("/api/init-tables", { method: "POST" });
  } catch (error) {
    console.warn("⚠️ Could not create tables:", error.message);
    return { success: true };
  }
}

// ─── USERS ─────────────────────────────────────────────────────────────────

export async function getUserById(uid) {
  return apiRequest(`/api/users/${encodeURIComponent(uid)}`);
}

export async function getUserByUsername(username) {
  return apiRequest(
    `/api/users/by-username/${encodeURIComponent(username.toLowerCase())}`,
  );
}

export async function getUserByPhone(phone) {
  return apiRequest(`/api/users/by-phone/${encodeURIComponent(phone)}`);
}

export async function createUser(userData) {
  return apiRequest("/api/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function updateUser(uid, data) {
  return apiRequest(`/api/users/${encodeURIComponent(uid)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Алиас для совместимости с компонентами
export const updateUserProfile = updateUser;

// Загрузка аватарки — конвертируем файл в base64 и сохраняем через updateUser
export async function uploadAvatar(file) {
  const uid = getCurrentUid();
  if (!uid) throw new Error("Нужно войти");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result;
        const result = await updateUser(uid, { avatar: base64 });

        // Обновляем кешированного пользователя в localStorage
        try {
          const stored = JSON.parse(
            localStorage.getItem("currentUser") || "{}",
          );
          stored.avatar = base64;
          localStorage.setItem("currentUser", JSON.stringify(stored));
        } catch {}

        resolve({ success: true, avatar: base64, ...result });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

// ─── POSTS ─────────────────────────────────────────────────────────────────

export async function getPosts(limit = 50) {
  return apiRequest(`/api/posts?limit=${limit}`);
}

export async function getPostsByUser(userId, limit = 50) {
  return apiRequest(
    `/api/posts/by-user/${encodeURIComponent(userId)}?limit=${limit}`,
  );
}

export async function createPost(postData) {
  return apiRequest("/api/posts", {
    method: "POST",
    body: JSON.stringify(postData),
  });
}

export async function updatePost(postId, data) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePost(postId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}

export async function likePost(postId, userId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/like`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function unlikePost(postId, userId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/unlike`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

export async function getComments(postId) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/comments`);
}

export async function addComment(postId, commentData) {
  return apiRequest(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: JSON.stringify(
      typeof commentData === "string" ? { text: commentData } : commentData,
    ),
  });
}

export async function deleteComment(commentId, postId) {
  return apiRequest(
    `/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  );
}

export async function deleteCommentsByPost(postId) {
  return { success: true };
}

// ─── CONVERSATIONS ─────────────────────────────────────────────────────────

export async function getConversations(userId) {
  return apiRequest(`/api/conversations/${encodeURIComponent(userId)}`);
}

export async function createConversation(data) {
  return apiRequest("/api/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateConversation(conversationId, data) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

// ─── MESSAGES ──────────────────────────────────────────────────────────────

export async function getMessages(conversationId) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}

export async function addMessage(conversationId, messageData) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify(messageData),
    },
  );
}

// 🔷 УДАЛЕНИЕ СООБЩЕНИЯ (личный чат) — НОВОЕ!
export async function deleteMessage(conversationId, messageId) {
  return apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
}

// 🔷 УДАЛЕНИЕ СООБЩЕНИЯ (групповой чат) — НОВОЕ!
export async function deleteGroupMessage(groupId, messageId) {
  return apiRequest(
    `/api/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
}

// ─── GROUPS ────────────────────────────────────────────────────────────────

export async function getGroups(userId) {
  return apiRequest(`/api/groups/${encodeURIComponent(userId)}`);
}

export async function createGroup(data) {
  return apiRequest("/api/groups", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── STORIES ───────────────────────────────────────────────────────────────

export async function getStories() {
  return apiRequest("/api/stories");
}

export async function createStory(storyData) {
  return apiRequest("/api/stories", {
    method: "POST",
    body: JSON.stringify(storyData),
  });
}

export async function deleteStory(storyId) {
  return apiRequest(`/api/stories/${encodeURIComponent(storyId)}`, {
    method: "DELETE",
  });
}

export async function markStoryViewed(storyId) {
  return apiRequest(`/api/stories/${encodeURIComponent(storyId)}/view`, {
    method: "POST",
  });
}

// ─── SEARCH ────────────────────────────────────────────────────────────────

export async function searchUsers(query) {
  return apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`);
}

// ─── FOLLOWERS / FOLLOWING ─────────────────────────────────────────────────

export async function getUserFollowers(userId) {
  const user = await getUserById(userId).catch(() => null);
  if (!user?.followers) return [];
  if (Array.isArray(user.followers)) return user.followers;
  try {
    return JSON.parse(user.followers);
  } catch {
    return [];
  }
}

export async function getUserFollowing(userId) {
  const user = await getUserById(userId).catch(() => null);
  if (!user?.following) return [];
  if (Array.isArray(user.following)) return user.following;
  try {
    return JSON.parse(user.following);
  } catch {
    return [];
  }
}

export async function addFollower(userId, followerId) {
  const followers = await getUserFollowers(userId);
  if (!followers.includes(followerId)) {
    await updateUser(userId, { followers: [...followers, followerId] });
  }
  return { success: true };
}

export async function removeFollower(userId, followerId) {
  const followers = await getUserFollowers(userId);
  await updateUser(userId, {
    followers: followers.filter((f) => f !== followerId),
  });
  return { success: true };
}

export async function addFollowing(userId, followingId) {
  const following = await getUserFollowing(userId);
  if (!following.includes(followingId)) {
    await updateUser(userId, { following: [...following, followingId] });
  }
  return { success: true };
}

export async function removeFollowing(userId, followingId) {
  const following = await getUserFollowing(userId);
  await updateUser(userId, {
    following: following.filter((f) => f !== followingId),
  });
  return { success: true };
}

export async function isFollower(userId, potentialFollowerId) {
  const followers = await getUserFollowers(userId).catch(() => []);
  return followers.includes(potentialFollowerId);
}

export async function isFriend(userId1, userId2) {
  const [aFollowsB, bFollowsA] = await Promise.all([
    isFollower(userId2, userId1).catch(() => false),
    isFollower(userId1, userId2).catch(() => false),
  ]);
  return aFollowsB && bFollowsA;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

export async function getNotifications() {
  return apiRequest("/api/notifications");
}

export async function getUnreadNotificationsCount() {
  return apiRequest("/api/notifications/unread-count");
}

export async function markNotificationAsRead(notificationId) {
  return apiRequest(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PUT",
    },
  );
}

export async function markAllNotificationsAsRead() {
  // Бэкенд не поддерживает массовое обновление, делаем по одному
  const notifications = await getNotifications();
  const unread = notifications.filter((n) => !n.read);
  for (const notif of unread) {
    await markNotificationAsRead(notif.id);
  }
  return { success: true };
}

export async function deleteNotification(notificationId) {
  // Бэкенд не поддерживает удаление уведомлений, просто игнорируем
  return { success: true };
}

// ─── PHOTO CHAINS ──────────────────────────────────────────────────────────

export async function getPhotoChains() {
  return apiRequest("/api/photo-chains");
}

export async function createPhotoChain(data) {
  return apiRequest("/api/photo-chains", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addPhotoToChain(
  chainId,
  userId,
  username,
  avatar,
  photoUrl,
  taggedUser = null,
) {
  return apiRequest(`/api/photo-chains/${encodeURIComponent(chainId)}/photos`, {
    method: "POST",
    body: JSON.stringify({ photoUrl }),
  });
}

export async function deletePhotoChain(chainId, userId, creatorId) {
  if (userId !== creatorId) {
    return { success: false, error: "Только создатель может удалить эстафету" };
  }
  return apiRequest(`/api/photo-chains/${encodeURIComponent(chainId)}`, {
    method: "DELETE",
  });
}

// ─── UPLOAD ────────────────────────────────────────────────────────────────

export async function uploadFile(file, userId, folder = "uploads") {
  // Конвертируем файл в base64 для отправки на сервер
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result;
        // В реальном проекте здесь была бы загрузка на Yandex Cloud / S3
        // Для SQLite просто возвращаем base64 как URL
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}
