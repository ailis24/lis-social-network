// 🔧 Универсальный fetch с авторизацией и обработкой ошибок

// Получаем UID текущего пользователя из localStorage
function getCurrentUid() {
  try {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    return user?.uid || null;
  } catch {
    return null;
  }
}

// Базовая функция запроса
export async function apiRequest(endpoint, options = {}) {
  const uid = getCurrentUid();

  const url = endpoint.startsWith("http") ? endpoint : `/api${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(uid ? { "X-User-Id": uid } : {}),
        ...options.headers,
      },
    });

    // 🔥 Обработка 401 — пользователь не авторизован
    if (response.status === 401) {
      console.warn("⚠️ Unauthorized! Clearing session...");
      localStorage.removeItem("currentUser");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new Error("Требуется авторизация");
    }

    // 🔥 Обработка 404 — ресурс не найден
    if (response.status === 404) {
      console.warn(`⚠️ Not found: ${endpoint}`);
      return null;
    }

    // 🔥 Обработка 500 — ошибка сервера
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Ошибка ${response.status}`);
    }

    // Пустой ответ (204)
    if (response.status === 204) {
      return { success: true };
    }

    return await response.json();
  } catch (error) {
    // Сетевые ошибки
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.error("🌐 Network error:", error);
      throw new Error("Нет соединения с сервером");
    }
    console.error(`❌ API Error (${endpoint}):`, error);
    throw error;
  }
}

// 🔷 Удобные хелперы для частых методов

export const get = (endpoint) => apiRequest(endpoint, { method: "GET" });

export const post = (endpoint, body) =>
  apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const put = (endpoint, body) =>
  apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const del = (endpoint) => apiRequest(endpoint, { method: "DELETE" });
