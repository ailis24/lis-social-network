// src/services/groups.js — REST API вместо Firebase

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

// Создание группы
export async function createGroup(name, creatorId, creatorUsername, creatorAvatar, participantIds = []) {
  try {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, participants: participantIds }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Ошибка создания группы");
    }

    const data = await res.json();
    return { success: true, id: data.groupId || data.id };
  } catch (error) {
    console.error("Error creating group:", error);
    return { success: false, error: error.message };
  }
}

// Получение групп пользователя (polling вместо onSnapshot)
export function getUserGroups(userId, callback) {
  let cancelled = false;

  async function load() {
    try {
      const res = await fetch(`/api/groups/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) callback(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("getUserGroups error:", e);
      if (!cancelled) callback([]);
    }
  }

  load();
  const interval = setInterval(load, 10000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// Добавить участника
export async function addParticipant(groupId, userId) {
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ action: "addParticipant", userId }),
    });
    return res.ok ? { success: true } : { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Удалить участника
export async function removeParticipant(groupId, userId) {
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ action: "removeParticipant", userId }),
    });
    return res.ok ? { success: true } : { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Обновить аватар группы
export async function updateGroupAvatar(groupId, avatarUrl) {
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ avatar: avatarUrl }),
    });
    return res.ok ? { success: true } : { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Обновить последнее сообщение
export async function updateLastMessage(groupId, messageText) {
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        lastMessage: messageText,
        lastMessageTime: new Date().toISOString(),
      }),
    });
    return res.ok ? { success: true } : { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
