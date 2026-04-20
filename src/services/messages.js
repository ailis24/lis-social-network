// src/services/messages.js — REST API для сообщений

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

// Получить личные чаты
export async function getConversations(userId) {
  const res = await fetch(`/api/conversations/${userId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки чатов");
  }

  return await res.json();
}

// Создать чат
export async function createConversation(participants) {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ participants }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка создания чата");
  }

  return await res.json();
}

// Получить сообщения чата
export async function getMessages(conversationId) {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки сообщений");
  }

  return await res.json();
}

// Отправить сообщение
export async function addMessage(conversationId, messageData) {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(messageData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка отправки сообщения");
  }

  return await res.json();
}

// Удалить сообщение
export async function deleteMessage(conversationId, messageId) {
  const res = await fetch(
    `/api/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка удаления");
  }

  return await res.json();
}

// Получить групповые чаты
export async function getGroups(userId) {
  const res = await fetch(`/api/groups/${userId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки групп");
  }

  return await res.json();
}

// Получить сообщения группы
export async function getGroupMessages(groupId) {
  const res = await fetch(`/api/groups/${groupId}/messages`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки сообщений");
  }

  return await res.json();
}

// Отправить сообщение в группу
export async function sendGroupMessage(groupId, messageData) {
  const res = await fetch(`/api/groups/${groupId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(messageData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка отправки");
  }

  return await res.json();
}

// Удалить сообщение из группы
export async function deleteGroupMessage(groupId, messageId) {
  const res = await fetch(`/api/groups/${groupId}/messages/${messageId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка удаления");
  }

  return await res.json();
}

// Обновить чат
export async function updateConversation(conversationId, data) {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка обновления");
  }

  return await res.json();
}

// Получить общее количество непрочитанных
export async function getTotalUnreadCount(userId) {
  const res = await fetch("/api/conversations/unread-total", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка получения количества");
  }

  return await res.json();
}
