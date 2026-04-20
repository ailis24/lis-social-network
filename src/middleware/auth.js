// Server-side auth middleware
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
