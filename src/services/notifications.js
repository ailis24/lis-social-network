// src/services/notifications.js — REST API для уведомлений

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

// Получить все уведомления
export async function getNotifications() {
  const res = await fetch("/api/notifications", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки уведомлений");
  }

  return await res.json();
}

// Получить количество непрочитанных
export async function getUnreadCount() {
  const res = await fetch("/api/notifications/unread-count", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка получения количества");
  }

  return await res.json();
}

// Отметить как прочитанное
export async function markNotificationAsRead(notificationId) {
  const res = await fetch(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка обновления");
  }

  return await res.json();
}

// Отметить все как прочитанные
export async function markAllNotificationsAsRead() {
  const notifications = await getNotifications();
  const unread = notifications.filter((n) => !n.read);

  for (const notif of unread) {
    await markNotificationAsRead(notif.id);
  }

  return { success: true };
}

// Удалить уведомление
export async function deleteNotification(notificationId) {
  return { success: true };
}
