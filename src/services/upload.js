// src/services/upload.js
// Конвертация файлов в base64 (без внешних сервисов)

const LIMITS = {
  "image/": 10 * 1024 * 1024,
  "video/": 50 * 1024 * 1024,
  "audio/": 20 * 1024 * 1024,
  "application/": 20 * 1024 * 1024,
  "text/": 5 * 1024 * 1024,
};

function getLimit(fileType) {
  for (const [prefix, limit] of Object.entries(LIMITS)) {
    if (fileType.startsWith(prefix)) return limit;
  }
  return 10 * 1024 * 1024;
}

// Конвертирует File в base64 data URL
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const maxSize = getLimit(file.type);
    if (file.size > maxSize) {
      reject(new Error(`Файл слишком большой! Максимум ${Math.round(maxSize / 1024 / 1024)}MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

// Алиасы для обратной совместимости с кодом, который вызывает uploadFile/uploadPhoto/uploadVideo
export async function uploadFile(file, userId, folder = "files") {
  return fileToBase64(file);
}

export const uploadPhoto = (file, userId) => fileToBase64(file);
export const uploadVideo = (file, userId) => fileToBase64(file);
