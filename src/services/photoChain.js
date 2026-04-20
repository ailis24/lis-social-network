// src/services/photoChain.js — REST API для фото-эстафет

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

// Получить все эстафеты
export async function getPhotoChains() {
  const res = await fetch("/api/photo-chains", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка загрузки эстафет");
  }

  return await res.json();
}

// Создать эстафету
export async function createPhotoChain(theme, firstPhoto) {
  const res = await fetch("/api/photo-chains", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title: theme,
      description: "Фото-эстафета",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка создания эстафеты");
  }

  const data = await res.json();

  // Добавляем первое фото
  if (firstPhoto && data.chainId) {
    await addPhotoToChain(data.chainId, firstPhoto);
  }

  return data;
}

// Добавить фото в эстафету
export async function addPhotoToChain(chainId, photoUrl) {
  const res = await fetch(`/api/photo-chains/${chainId}/photos`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ photoUrl }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка добавления фото");
  }

  return await res.json();
}

// Удалить эстафету
export async function deletePhotoChain(chainId, userId, starterId) {
  if (userId !== starterId) {
    return { success: false, error: "Только создатель может удалить эстафету" };
  }

  const res = await fetch(`/api/photo-chains/${chainId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка удаления");
  }

  return await res.json();
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
