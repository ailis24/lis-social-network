export function formatTime(ts) {
  if (!ts) return "";
  const date = ts instanceof Date ? ts : new Date(ts);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

  return date.toLocaleDateString("ru-RU");
}
