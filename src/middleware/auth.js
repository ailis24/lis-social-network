// Server-side auth middleware (аналог Firebase Rules)

/**
 * requireAuth(db)
 * Проверяет заголовок X-User-Id и верифицирует пользователя в БД.
 * Записывает req.uid при успехе.
 */
export function requireAuth(db) {
  return (req, res, next) => {
    const uid = req.headers["x-user-id"];
    if (!uid) {
      return res.status(401).json({ error: "Необходима авторизация" });
    }
    const user = db.prepare("SELECT uid FROM users WHERE uid = ?").get(uid);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }
    req.uid = uid;
    next();
  };
}

/**
 * isOwner(getOwnerUid)
 * Проверяет, что req.uid совпадает с uid владельца ресурса.
 * getOwnerUid: функция (req) => string | строка
 * Должен применяться ПОСЛЕ requireAuth.
 */
export function isOwner(getOwnerUid) {
  return (req, res, next) => {
    const ownerUid =
      typeof getOwnerUid === "function" ? getOwnerUid(req) : getOwnerUid;
    if (!ownerUid || req.uid !== ownerUid) {
      return res.status(403).json({ error: "Нет прав: вы не владелец" });
    }
    next();
  };
}

/**
 * allowFields(...fields)
 * Фильтрует req.body — оставляет только разрешённые поля.
 * Защищает от массового присвоения (mass assignment).
 */
export function allowFields(...fields) {
  return (req, res, next) => {
    const filtered = {};
    for (const f of fields) {
      if (f in req.body) filtered[f] = req.body[f];
    }
    req.body = filtered;
    next();
  };
}
