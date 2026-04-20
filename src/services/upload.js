// src/services/upload.js — REST API для загрузки файлов

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

// Загрузка файла на сервер
export async function uploadFile(file, userId, folder = "uploads") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            fileData: base64,
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Ошибка загрузки");
        }

        const data = await res.json();
        resolve(data.url);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

// Алиасы для обратной совместимости
export const uploadPhoto = (file, userId) => uploadFile(file, userId, "photos");
export const uploadVideo = (file, userId) => uploadFile(file, userId, "videos");

// Конвертирует File в base64 data URL
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}
