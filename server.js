import dotenv from "dotenv";
dotenv.config();

// server.js - Express + SQLite с уведомлениями и фото эстафетами
import express from "express";
import cors from "cors";
import { createHash } from "crypto";
import { createRequire } from "module";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { requireAuth, isOwner, allowFields } from "./src/middleware/auth.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// 🔧 ДЛЯ AMVERA — используем правильный порт
const PORT = process.env.PORT || process.env.API_PORT || 3001;

// ─── SQLITE SETUP ──────────────────────────────────────────────────────────

// 🔧 ДЛЯ AMVERA — сохраняем базу в /app/ для постоянства
const DB_PATH =
  process.env.NODE_ENV === "production"
    ? "/app/lis_users.db"
    : join(__dirname, "lis_users.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// 🔷 СОЗДАЁМ ВСЕ ТАБЛИЦЫ
db.exec(`
  -- Пользователи
  CREATE TABLE IF NOT EXISTS users (
    uid           TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
    phone         TEXT UNIQUE NOT NULL,
    email         TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    avatar        TEXT DEFAULT '',
    bio           TEXT DEFAULT '',
    followers     TEXT DEFAULT '[]',
    following     TEXT DEFAULT '[]',
    online        INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

  -- Посты
  CREATE TABLE IF NOT EXISTS posts (
    id             TEXT PRIMARY KEY,
    author_id      TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text           TEXT DEFAULT '',
    image          TEXT DEFAULT '',
    video          TEXT DEFAULT '',
    poll           TEXT DEFAULT NULL,
    likes          TEXT DEFAULT '[]',
    comments_count INTEGER DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

  -- Комментарии
  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

  -- Сторис
  CREATE TABLE IF NOT EXISTS stories (
    id         TEXT PRIMARY KEY,
    author_id  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    media      TEXT DEFAULT '',
    media_type TEXT DEFAULT 'image',
    views      TEXT DEFAULT '[]',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
  CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

  -- Группы
  CREATE TABLE IF NOT EXISTS groups (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    creator_id        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    avatar            TEXT DEFAULT '',
    participants      TEXT DEFAULT '[]',
    last_message      TEXT DEFAULT '',
    last_message_time TEXT DEFAULT '',
    unread_count      INTEGER DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);

  -- ЛИЧНЫЕ КОНВЕРСАЦИИ
  CREATE TABLE IF NOT EXISTS conversations (
    id                TEXT PRIMARY KEY,
    participants      TEXT NOT NULL,
    last_message      TEXT DEFAULT '',
    last_message_by   TEXT DEFAULT '',
    last_message_time TEXT DEFAULT '',
    unread_count      INTEGER DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participants);

  -- СООБЩЕНИЯ
  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    group_id        TEXT REFERENCES groups(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text            TEXT DEFAULT '',
    file_url        TEXT DEFAULT '',
    file_type       TEXT DEFAULT '',
    file_name       TEXT DEFAULT '',
    read            INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

  -- 🔔 УВЕДОМЛЕНИЯ
  CREATE TABLE IF NOT EXISTS notifications (
    id           TEXT PRIMARY KEY,
    recipient_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    post_id      TEXT,
    sender_id    TEXT REFERENCES users(uid),
    message      TEXT,
    read         INTEGER DEFAULT 0,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

  -- 📸 ФОТО ЭСТАФЕТА
  CREATE TABLE IF NOT EXISTS photo_chains (
    id          TEXT PRIMARY KEY,
    creator_id  TEXT REFERENCES users(uid) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_photo_chains_creator ON photo_chains(creator_id);

  CREATE TABLE IF NOT EXISTS photo_chain_items (
    id         TEXT PRIMARY KEY,
    chain_id   TEXT REFERENCES photo_chains(id) ON DELETE CASCADE,
    user_id    TEXT REFERENCES users(uid) ON DELETE CASCADE,
    photo_url  TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_photo_chain_items_chain ON photo_chain_items(chain_id);
  CREATE INDEX IF NOT EXISTS idx_photo_chain_items_user ON photo_chain_items(user_id);

  -- 💳 PREMIUM ПОДПИСКИ
  CREATE TABLE IF NOT EXISTS premium_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    amount REAL DEFAULT 199,
    currency TEXT DEFAULT 'RUB',
    payment_method TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- ⏱️ ТАЙМЕРЫ ЛЕНТЫ (ФИТНЕС-БЛОКИРОВКА)
  CREATE TABLE IF NOT EXISTS feed_timers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    session_seconds INTEGER DEFAULT 0,
    total_today_seconds INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    block_until TEXT,
    last_exercise_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 💪 УПРАЖНЕНИЯ ОТ ПОЛЬЗОВАТЕЛЕЙ
  CREATE TABLE IF NOT EXISTS fitness_exercises (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    exercise_description TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'medium',
    likes INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  -- ✅ ВЫПОЛНЕННЫЕ УПРАЖНЕНИЯ
  CREATE TABLE IF NOT EXISTS completed_exercises (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    exercise_id TEXT REFERENCES fitness_exercises(id),
    video_url TEXT,
    image_url TEXT,
    completed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_premium_user ON premium_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_premium_status ON premium_subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_feed_timers_user ON feed_timers(user_id);
  CREATE INDEX IF NOT EXISTS idx_fitness_exercises_active ON fitness_exercises(is_active);
`);

// 🔷 МИГРАЦИИ
const addColumnIfMissing = (table, column, definition) => {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    console.log(`✅ Added column ${table}.${column}`);
  } catch (e) {
    if (!e.message.includes("duplicate column name")) throw e;
  }
};

addColumnIfMissing("posts", "video", "TEXT DEFAULT ''");
addColumnIfMissing("posts", "poll", "TEXT DEFAULT NULL");
addColumnIfMissing("posts", "comments_count", "INTEGER DEFAULT 0");
addColumnIfMissing("conversations", "unread_count", "INTEGER DEFAULT 0");
addColumnIfMissing("groups", "unread_count", "INTEGER DEFAULT 0");

console.log(`✅ SQLite database ready: ${DB_PATH}`);

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const auth = requireAuth(db);

// ─── HELPERS ───────────────────────────────────────────────────────────────

function hashPassword(pwd) {
  return createHash("sha256")
    .update(pwd || "")
    .digest("hex");
}

function rowToSafeUser(row) {
  if (!row) return null;
  return {
    uid: row.uid,
    username: row.username,
    phone: row.phone,
    email: row.email || "",
    avatar: row.avatar || "",
    bio: row.bio || "",
    followers: safeParseJson(row.followers, []),
    following: safeParseJson(row.following, []),
    online: Boolean(row.online),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPost(row, author) {
  if (!row) return null;
  const poll = row.poll ? safeParseJson(row.poll, null) : null;
  return {
    id: row.id,
    postId: row.id,
    authorId: row.author_id,
    userId: row.author_id,
    username: author?.username || "Пользователь",
    avatar: author?.avatar || "",
    text: row.text || "",
    content: row.text || "",
    image: row.image || "",
    video: row.video || "",
    poll,
    isPoll: !!poll,
    likedBy: safeParseJson(row.likes, []),
    likeCount: safeParseJson(row.likes, []).length,
    commentsCount: row.comments_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToStory(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    media: row.media || "",
    mediaType: row.media_type || "image",
    views: safeParseJson(row.views, []),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function rowToGroup(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    creatorId: row.creator_id,
    avatar: row.avatar || "",
    participants: safeParseJson(row.participants, []),
    lastMessage: row.last_message || "",
    lastMessageTime: row.last_message_time || "",
    unreadCount: row.unread_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

function rowToConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.id,
    participants: safeParseJson(row.participants, []),
    lastMessage: row.last_message || "",
    lastMessageBy: row.last_message_by || "",
    lastMessageTime: row.last_message_time || "",
    unreadCount: row.unread_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    messageId: row.id,
    conversationId: row.conversation_id,
    groupId: row.group_id,
    senderId: row.sender_id,
    text: row.text || "",
    fileUrl: row.file_url || "",
    fileType: row.file_type || "",
    fileName: row.file_name || "",
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

function rowToNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    postId: row.post_id,
    senderId: row.sender_id,
    message: row.message,
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

function rowToPhotoChain(row) {
  if (!row) return null;
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPhotoChainItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    chainId: row.chain_id,
    userId: row.user_id,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

function safeParseJson(val, fallback = []) {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function createNotification(recipientId, type, postId, senderId, message) {
  if (!recipientId) return;
  const id = genId();
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO notifications (id, recipient_id, type, post_id, sender_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, recipientId, type, postId, senderId, message, now);
  } catch (e) {
    console.error("Error creating notification:", e);
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────

app.post("/api/auth/register", (req, res) => {
  try {
    console.log("📝 POST /api/auth/register");
    const { username, phone, password, email } = req.body;
    if (!username || !phone || !password)
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    const normUser = username.toLowerCase().trim();
    const normPhone = phone.trim();
    const existingUser = db
      .prepare(
        "SELECT uid FROM users WHERE username = ? COLLATE NOCASE LIMIT 1",
      )
      .get(normUser);
    if (existingUser)
      return res.status(409).json({ error: "Имя пользователя уже занято" });
    const existingPhone = db
      .prepare("SELECT uid FROM users WHERE phone = ? LIMIT 1")
      .get(normPhone);
    if (existingPhone)
      return res.status(409).json({ error: "Этот номер уже зарегистрирован" });
    const uid = genId();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    db.prepare(
      `INSERT INTO users (uid, username, phone, email, password_hash, avatar, bio, followers, following, online, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '', '', '[]', '[]', 1, ?, ?)`,
    ).run(uid, normUser, normPhone, email || "", passwordHash, now, now);
    const safeUser = rowToSafeUser(
      db.prepare("SELECT * FROM users WHERE uid = ?").get(uid),
    );
    console.log(`✅ Registered: ${normUser} (uid=${uid})`);
    res.json({ success: true, uid, user: safeUser });
  } catch (error) {
    console.error("❌ Register error:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({
        error: "Пользователь с таким именем или телефоном уже существует",
      });
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    console.log("🔐 POST /api/auth/login");
    const { login, password } = req.body;
    if (!login || !password)
      return res.status(400).json({ error: "Введите логин и пароль" });
    const normLogin = login.trim().toLowerCase();
    const passwordHash = hashPassword(password);
    const user = db
      .prepare(
        "SELECT * FROM users WHERE username = ? COLLATE NOCASE OR phone = ? LIMIT 1",
      )
      .get(normLogin, login.trim());
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    if (user.password_hash !== passwordHash)
      return res.status(401).json({ error: "Неверный пароль" });
    const now = new Date().toISOString();
    db.prepare("UPDATE users SET online = 1, updated_at = ? WHERE uid = ?").run(
      now,
      user.uid,
    );
    const updatedUser = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(user.uid);
    console.log(`✅ Logged in: ${user.username}`);
    res.json({ success: true, user: rowToSafeUser(updatedUser) });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── HEALTH ────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const postCount = db.prepare("SELECT COUNT(*) as count FROM posts").get();
  const convCount = db
    .prepare("SELECT COUNT(*) as count FROM conversations")
    .get();
  const msgCount = db.prepare("SELECT COUNT(*) as count FROM messages").get();
  const notifCount = db
    .prepare("SELECT COUNT(*) as count FROM notifications")
    .get();
  const chainCount = db
    .prepare("SELECT COUNT(*) as count FROM photo_chains")
    .get();
  res.json({
    status: "ok",
    storage: "SQLite",
    users: userCount.count,
    posts: postCount.count,
    conversations: convCount.count,
    messages: msgCount.count,
    notifications: notifCount?.count || 0,
    photoChains: chainCount?.count || 0,
    dbPath: DB_PATH,
    timestamp: new Date().toISOString(),
  });
});

// ─── USERS ─────────────────────────────────────────────────────────────────

app.get("/api/users/search", (req, res) => {
  try {
    let q = (req.query.q || "").trim();
    if (q.startsWith("@")) q = q.slice(1);
    if (q.length < 2) return res.json([]);
    const rows = db
      .prepare(
        "SELECT * FROM users WHERE username LIKE ? COLLATE NOCASE LIMIT 20",
      )
      .all(`${q}%`);
    res.json(rows.map(rowToSafeUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:uid", (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(req.params.uid);
    res.json(rowToSafeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/by-username/:username", (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1")
      .get(req.params.username.toLowerCase());
    res.json(rowToSafeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/by-phone/:phone", (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE phone = ? LIMIT 1")
      .get(req.params.phone);
    res.json(rowToSafeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", (req, res) => {
  try {
    const data = req.body;
    const uid = data.uid || genId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR REPLACE INTO users (uid, username, phone, email, password_hash, avatar, bio, followers, following, online, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      uid,
      (data.username || "").toLowerCase(),
      data.phone || "",
      data.email || "",
      data.passwordHash || hashPassword(data.password || ""),
      data.avatar || "",
      data.bio || "",
      JSON.stringify(data.followers || []),
      JSON.stringify(data.following || []),
      data.online ? 1 : 0,
      data.createdAt || now,
      now,
    );
    res.json({ success: true, uid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put(
  "/api/users/:uid",
  auth,
  isOwner((req) => req.params.uid),
  allowFields(
    "username",
    "phone",
    "email",
    "avatar",
    "bio",
    "followers",
    "following",
    "online",
  ),
  (req, res) => {
    try {
      const { uid } = req.params;
      const updates = req.body;
      const now = new Date().toISOString();
      const setClauses = [];
      const values = [];
      for (const key of Object.keys(updates)) {
        setClauses.push(`${key} = ?`);
        if (key === "followers" || key === "following")
          values.push(
            Array.isArray(updates[key])
              ? JSON.stringify(updates[key])
              : updates[key],
          );
        else if (key === "online") values.push(updates[key] ? 1 : 0);
        else values.push(updates[key]);
      }
      if (setClauses.length > 0) {
        setClauses.push("updated_at = ?");
        values.push(now, uid);
        db.prepare(
          `UPDATE users SET ${setClauses.join(", ")} WHERE uid = ?`,
        ).run(...values);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ─── FRIENDS ──────────────────────────────────────────────────────────────

app.post("/api/users/:targetUid/friend", auth, (req, res) => {
  try {
    const currentUid = req.uid;
    const targetUid = req.params.targetUid;
    const { action } = req.body;
    if (currentUid === targetUid)
      return res.status(400).json({ error: "Нельзя добавить себя в друзья" });
    const currentUser = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(currentUid);
    const targetUser = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(targetUid);
    if (!currentUser || !targetUser)
      return res.status(404).json({ error: "Пользователь не найден" });
    const currentFollowers = safeParseJson(currentUser.followers, []);
    const currentFollowing = safeParseJson(currentUser.following, []);
    const targetFollowers = safeParseJson(targetUser.followers, []);
    const targetFollowing = safeParseJson(targetUser.following, []);
    const now = new Date().toISOString();
    if (action === "remove") {
      const newCurrentFollowers = currentFollowers.filter(
        (id) => id !== targetUid,
      );
      const newCurrentFollowing = currentFollowing.filter(
        (id) => id !== targetUid,
      );
      const newTargetFollowers = targetFollowers.filter(
        (id) => id !== currentUid,
      );
      const newTargetFollowing = targetFollowing.filter(
        (id) => id !== currentUid,
      );
      db.prepare(
        "UPDATE users SET followers = ?, following = ?, updated_at = ? WHERE uid = ?",
      ).run(
        JSON.stringify(newCurrentFollowers),
        JSON.stringify(newCurrentFollowing),
        now,
        currentUid,
      );
      db.prepare(
        "UPDATE users SET followers = ?, following = ?, updated_at = ? WHERE uid = ?",
      ).run(
        JSON.stringify(newTargetFollowers),
        JSON.stringify(newTargetFollowing),
        now,
        targetUid,
      );
      console.log(`👥 Friends removed: ${currentUid} <-> ${targetUid}`);
    } else {
      const newCurrentFollowers = [
        ...new Set([...currentFollowers, targetUid]),
      ];
      const newCurrentFollowing = [
        ...new Set([...currentFollowing, targetUid]),
      ];
      const newTargetFollowers = [...new Set([...targetFollowers, currentUid])];
      const newTargetFollowing = [...new Set([...targetFollowing, currentUid])];
      db.prepare(
        "UPDATE users SET followers = ?, following = ?, updated_at = ? WHERE uid = ?",
      ).run(
        JSON.stringify(newCurrentFollowers),
        JSON.stringify(newCurrentFollowing),
        now,
        currentUid,
      );
      db.prepare(
        "UPDATE users SET followers = ?, following = ?, updated_at = ? WHERE uid = ?",
      ).run(
        JSON.stringify(newTargetFollowers),
        JSON.stringify(newTargetFollowing),
        now,
        targetUid,
      );
      createNotification(
        targetUid,
        "friend_request",
        null,
        currentUid,
        "добавил вас в друзья",
      );
      console.log(`👥 Friends added: ${currentUid} <-> ${targetUid}`);
    }
    res.json({
      success: true,
      message: action === "remove" ? "Друг удалён" : "Друг добавлен",
      isFriend: action !== "remove",
    });
  } catch (error) {
    console.error("Friend error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:targetUid/friend-status", auth, (req, res) => {
  try {
    const currentUid = req.uid;
    const targetUid = req.params.targetUid;
    const targetUser = db
      .prepare("SELECT followers, following FROM users WHERE uid = ?")
      .get(targetUid);
    if (!targetUser)
      return res.status(404).json({ error: "Пользователь не найден" });
    const followers = safeParseJson(targetUser.followers, []);
    const following = safeParseJson(targetUser.following, []);
    const isFriend =
      followers.includes(currentUid) && following.includes(currentUid);
    res.json({
      isFriend,
      followers: followers.length,
      following: following.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POSTS ─────────────────────────────────────────────────────────────────

app.get("/api/posts", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor;
    let query = "SELECT * FROM posts";
    let params = [];
    if (cursor) {
      const lastPost = db
        .prepare("SELECT created_at FROM posts WHERE id = ?")
        .get(cursor);
      if (lastPost) {
        query += " WHERE created_at < ?";
        params.push(lastPost.created_at);
      }
    }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    const rows = db.prepare(query).all(...params);
    const enriched = rows.map((row) => {
      const author = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(row.author_id),
      );
      return rowToPost(row, author);
    });
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    res.json({ posts: enriched, nextCursor, hasMore: !!nextCursor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/by-user/:userId", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor;
    let query = "SELECT * FROM posts WHERE author_id = ?";
    let params = [req.params.userId];
    if (cursor) {
      const lastPost = db
        .prepare("SELECT created_at FROM posts WHERE id = ?")
        .get(cursor);
      if (lastPost) {
        query += " AND created_at < ?";
        params.push(lastPost.created_at);
      }
    }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    const rows = db.prepare(query).all(...params);
    const enriched = rows.map((row) => {
      const author = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(row.author_id),
      );
      return rowToPost(row, author);
    });
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    res.json({ posts: enriched, nextCursor, hasMore: !!nextCursor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/posts",
  auth,
  allowFields("text", "image", "video", "poll"),
  (req, res) => {
    try {
      const { text, image, video, poll } = req.body;
      if (!text && !image && !video && !poll)
        return res.status(400).json({ error: "Пост не может быть пустым" });
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO posts (id, author_id, text, image, video, poll, likes, comments_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '[]', 0, ?, ?)`,
      ).run(
        id,
        req.uid,
        text || "",
        image || "",
        video || "",
        poll ? JSON.stringify(poll) : null,
        now,
        now,
      );
      const post = rowToPost(
        db.prepare("SELECT * FROM posts WHERE id = ?").get(id),
      );
      console.log(`📄 Post created: ${id} by ${req.uid}`);
      res.json({ success: true, postId: id, post });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// 🔧 🔥 ИСПРАВЛЕНО: Теперь можно обновлять poll всем пользователям (не только автору)
app.put(
  "/api/posts/:id",
  auth,
  allowFields("text", "image", "poll"),
  (req, res) => {
    try {
      const post = db
        .prepare("SELECT * FROM posts WHERE id = ?")
        .get(req.params.id);
      if (!post) return res.status(404).json({ error: "Пост не найден" });
      const now = new Date().toISOString();
      const { text, image, poll } = req.body;
      // 🔧 Разрешаем обновлять poll любому авторизованному пользователю
      // Но text/image может менять только автор поста
      if (
        (text !== undefined || image !== undefined) &&
        post.author_id !== req.uid
      ) {
        return res.status(403).json({ error: "Нет прав: вы не автор поста" });
      }
      const updates = {};
      if (text !== undefined) updates.text = text;
      if (image !== undefined) updates.image = image;
      if (poll !== undefined) updates.poll = JSON.stringify(poll); // 🔧 Опросы может обновлять любой!
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates)
          .map((key) => `${key} = ?`)
          .join(", ");
        const values = [...Object.values(updates), now, req.params.id];
        db.prepare(
          `UPDATE posts SET ${setClauses}, updated_at = ? WHERE id = ?`,
        ).run(...values);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.delete("/api/posts/:id", auth, (req, res) => {
  try {
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    if (post.author_id !== req.uid)
      return res.status(403).json({ error: "Нет прав: вы не автор поста" });
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    console.log(`🗑️ Post deleted: ${req.params.id} by ${req.uid}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/like", auth, (req, res) => {
  try {
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    const likes = safeParseJson(post.likes, []);
    const isLiked = likes.includes(req.uid);
    if (!isLiked) {
      likes.push(req.uid);
      db.prepare("UPDATE posts SET likes = ?, updated_at = ? WHERE id = ?").run(
        JSON.stringify(likes),
        new Date().toISOString(),
        req.params.id,
      );
      if (post.author_id !== req.uid)
        createNotification(
          post.author_id,
          "like",
          post.id,
          req.uid,
          "понравился ваш пост",
        );
    } else {
      const newLikes = likes.filter((uid) => uid !== req.uid);
      db.prepare("UPDATE posts SET likes = ?, updated_at = ? WHERE id = ?").run(
        JSON.stringify(newLikes),
        new Date().toISOString(),
        req.params.id,
      );
    }
    const updatedPost = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    res.json({
      success: true,
      likes: safeParseJson(updatedPost.likes, []),
      likeCount: safeParseJson(updatedPost.likes, []).length,
      liked: !isLiked,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── COMMENTS ──────────────────────────────────────────────────────────────

app.get("/api/posts/:id/comments", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
      )
      .all(req.params.id);
    const enriched = rows.map((c) => {
      const author = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(c.author_id),
      );
      return { ...c, author };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comments", auth, allowFields("text"), (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim())
      return res
        .status(400)
        .json({ error: "Комментарий не может быть пустым" });
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO comments (id, post_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, req.params.id, req.uid, text.trim(), now);
    if (post.author_id !== req.uid)
      createNotification(
        post.author_id,
        "comment",
        post.id,
        req.uid,
        "прокомментировал ваш пост",
      );
    const comments = db
      .prepare("SELECT COUNT(*) as count FROM comments WHERE post_id = ?")
      .get(req.params.id);
    db.prepare(
      "UPDATE posts SET comments_count = ?, updated_at = ? WHERE id = ?",
    ).run(comments.count, new Date().toISOString(), req.params.id);
    const comment = rowToComment(
      db.prepare("SELECT * FROM comments WHERE id = ?").get(id),
    );
    const author = rowToSafeUser(
      db.prepare("SELECT * FROM users WHERE uid = ?").get(req.uid),
    );
    res.json({
      success: true,
      commentId: id,
      comment: { ...comment, author },
      commentsCount: comments.count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/posts/:id/comments/:cid", auth, (req, res) => {
  try {
    const comment = db
      .prepare("SELECT * FROM comments WHERE id = ? AND post_id = ?")
      .get(req.params.cid, req.params.id);
    if (!comment)
      return res.status(404).json({ error: "Комментарий не найден" });
    if (comment.author_id !== req.uid)
      return res
        .status(403)
        .json({ error: "Нет прав: вы не автор комментария" });
    db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.cid);
    const comments = db
      .prepare("SELECT COUNT(*) as count FROM comments WHERE post_id = ?")
      .get(req.params.id);
    db.prepare("UPDATE posts SET comments_count = ? WHERE id = ?").run(
      comments.count,
      req.params.id,
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── STORIES ───────────────────────────────────────────────────────────────

app.get("/api/stories", (req, res) => {
  try {
    const now = new Date().toISOString();
    const rows = db
      .prepare(
        "SELECT * FROM stories WHERE expires_at > ? ORDER BY created_at DESC",
      )
      .all(now);
    const stories = rows.map(rowToStory);
    const enriched = stories.map((s) => {
      const author = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(s.authorId),
      );
      return {
        ...s,
        author: author
          ? {
              uid: author.uid,
              username: author.username,
              avatar: author.avatar,
            }
          : null,
      };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/stories",
  auth,
  allowFields("media", "mediaType"),
  (req, res) => {
    try {
      const { media, mediaType = "image" } = req.body;
      if (!media) return res.status(400).json({ error: "Медиа обязательно" });
      const id = genId();
      const now = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare(
        `INSERT INTO stories (id, author_id, media, media_type, views, expires_at, created_at) VALUES (?, ?, ?, ?, '[]', ?, ?)`,
      ).run(id, req.uid, media, mediaType, expiresAt, now);
      const story = rowToStory(
        db.prepare("SELECT * FROM stories WHERE id = ?").get(id),
      );
      console.log(`📸 Story created: ${id} by ${req.uid}`);
      res.json({ success: true, storyId: id, story });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.delete("/api/stories/:id", auth, (req, res) => {
  try {
    const story = db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .get(req.params.id);
    if (!story) return res.status(404).json({ error: "Сторис не найдена" });
    if (story.author_id !== req.uid)
      return res.status(403).json({ error: "Нет прав" });
    db.prepare("DELETE FROM stories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stories/:id/view", auth, (req, res) => {
  try {
    const story = db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .get(req.params.id);
    if (!story) return res.status(404).json({ error: "Сторис не найдена" });
    const views = safeParseJson(story.views, []);
    if (!views.includes(req.uid)) {
      views.push(req.uid);
      db.prepare("UPDATE stories SET views = ? WHERE id = ?").run(
        JSON.stringify(views),
        req.params.id,
      );
    }
    res.json({ success: true, views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GROUPS ────────────────────────────────────────────────────────────────

app.get("/api/groups", auth, (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM groups ORDER BY updated_at DESC")
      .all();
    const groups = rows
      .map(rowToGroup)
      .filter((g) => g.participants.includes(req.uid));
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/groups/:id", auth, (req, res) => {
  try {
    const group = db
      .prepare("SELECT * FROM groups WHERE id = ?")
      .get(req.params.id);
    if (!group) return res.status(404).json({ error: "Группа не найдена" });
    const participants = safeParseJson(group.participants, []);
    if (!participants.includes(req.uid))
      return res.status(403).json({ error: "Вы не участник этой группы" });
    res.json({ ...group, participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/groups/:userId", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM groups ORDER BY updated_at DESC")
      .all();
    const groups = rows
      .map(rowToGroup)
      .filter((g) => g.participants.includes(req.params.userId));
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/groups",
  auth,
  allowFields("name", "participants", "avatar"),
  (req, res) => {
    try {
      const { name, participants = [], avatar = "" } = req.body;
      if (!name || !name.trim())
        return res.status(400).json({ error: "Название группы обязательно" });
      const allParticipants = [...new Set([req.uid, ...participants])];
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO groups (id, name, creator_id, avatar, participants, last_message, last_message_time, unread_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '', '', 0, ?, ?)`,
      ).run(
        id,
        name.trim(),
        req.uid,
        avatar,
        JSON.stringify(allParticipants),
        now,
        now,
      );
      const group = rowToGroup(
        db.prepare("SELECT * FROM groups WHERE id = ?").get(id),
      );
      console.log(`👥 Group created: ${id} (${name}) by ${req.uid}`);
      res.json({ success: true, groupId: id, id, group });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.put(
  "/api/groups/:id",
  auth,
  allowFields(
    "name",
    "avatar",
    "participants",
    "lastMessage",
    "lastMessageTime",
  ),
  (req, res) => {
    try {
      const group = db
        .prepare("SELECT * FROM groups WHERE id = ?")
        .get(req.params.id);
      if (!group) return res.status(404).json({ error: "Группа не найдена" });
      const now = new Date().toISOString();
      const updates = req.body;
      const fields = [];
      const values = [];
      if ("name" in updates) {
        fields.push("name = ?");
        values.push(updates.name);
      }
      if ("avatar" in updates) {
        fields.push("avatar = ?");
        values.push(updates.avatar);
      }
      if ("participants" in updates) {
        fields.push("participants = ?");
        values.push(JSON.stringify(updates.participants));
      }
      if ("lastMessage" in updates) {
        fields.push("last_message = ?");
        values.push(updates.lastMessage);
      }
      if ("lastMessageTime" in updates) {
        fields.push("last_message_time = ?");
        values.push(updates.lastMessageTime);
      }
      if (fields.length > 0) {
        fields.push("updated_at = ?");
        values.push(now, req.params.id);
        db.prepare(`UPDATE groups SET ${fields.join(", ")} WHERE id = ?`).run(
          ...values,
        );
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.delete("/api/groups/:id", auth, (req, res) => {
  try {
    const { id } = req.params;
    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
    if (!group) return res.status(404).json({ error: "Группа не найдена" });
    if (group.creator_id !== req.uid)
      return res
        .status(403)
        .json({ error: "Только создатель может удалить группу" });
    db.prepare("DELETE FROM messages WHERE group_id = ?").run(id);
    db.prepare("DELETE FROM groups WHERE id = ?").run(id);
    console.log(`🗑️ Group deleted: ${id} by ${req.uid}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/groups/:groupId/messages", (req, res) => {
  try {
    const { groupId } = req.params;
    const rows = db
      .prepare(
        "SELECT * FROM messages WHERE group_id = ? ORDER BY created_at ASC LIMIT 100",
      )
      .all(groupId);
    const messages = rows.map(rowToMessage);
    const enriched = messages.map((msg) => {
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(msg.senderId),
      );
      return {
        ...msg,
        username: sender?.username || "Пользователь",
        avatar: sender?.avatar || "",
      };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/groups/:groupId/messages",
  auth,
  allowFields("text", "fileUrl", "fileType", "fileName"),
  (req, res) => {
    try {
      const { groupId } = req.params;
      const { text, fileUrl, fileType, fileName } = req.body;
      if (!text && !fileUrl)
        return res
          .status(400)
          .json({ error: "Сообщение не может быть пустым" });
      const group = db
        .prepare("SELECT * FROM groups WHERE id = ?")
        .get(groupId);
      if (!group) return res.status(404).json({ error: "Группа не найдена" });
      const participants = safeParseJson(group.participants, []);
      if (!participants.includes(req.uid))
        return res.status(403).json({ error: "Вы не участник этой группы" });
      const id = genId();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO messages (id, group_id, sender_id, text, file_url, file_type, file_name, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      ).run(
        id,
        groupId,
        req.uid,
        text || "",
        fileUrl || "",
        fileType || "",
        fileName || "",
        now,
      );
      const preview = text
        ? text.length > 50
          ? text.slice(0, 50) + "..."
          : text
        : fileName
          ? `${fileType?.startsWith("image/") ? "🖼️" : "📎"} ${fileName}`
          : "";
      db.prepare(
        "UPDATE groups SET last_message = ?, last_message_time = ?, updated_at = ? WHERE id = ?",
      ).run(preview, now, now, groupId);
      const message = rowToMessage(
        db.prepare("SELECT * FROM messages WHERE id = ?").get(id),
      );
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(req.uid),
      );
      res.json({
        success: true,
        message: {
          ...message,
          username: sender?.username || "Пользователь",
          avatar: sender?.avatar || "",
        },
      });
    } catch (error) {
      console.error("Error sending group message:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

app.delete("/api/groups/:groupId/messages/:messageId", auth, (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const message = db
      .prepare("SELECT * FROM messages WHERE id = ? AND group_id = ?")
      .get(messageId, groupId);
    if (!message)
      return res.status(404).json({ error: "Сообщение не найдено" });
    if (message.sender_id !== req.uid)
      return res
        .status(403)
        .json({ error: "Можно удалять только свои сообщения" });
    db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);
    console.log(`🗑️ Message deleted: ${messageId} by ${req.uid}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── CONVERSATIONS ─────────────────────────────────────────────────────────

app.get("/api/conversations/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const rows = db
      .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all();
    const userConversations = rows
      .map(rowToConversation)
      .filter((conv) => conv.participants.includes(userId));
    const enriched = userConversations.map((conv) => {
      const otherId = conv.participants.find((p) => p !== userId);
      if (otherId) {
        const otherUser = rowToSafeUser(
          db.prepare("SELECT * FROM users WHERE uid = ?").get(otherId),
        );
        return { ...conv, otherUser };
      }
      return conv;
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/conversations", auth, (req, res) => {
  try {
    const { participants } = req.body;
    if (!participants || participants.length !== 2)
      return res
        .status(400)
        .json({ error: "Личный чат должен иметь ровно 2 участника" });
    const existing = db
      .prepare("SELECT * FROM conversations")
      .all()
      .find((conv) => {
        const convParticipants = safeParseJson(conv.participants, []);
        return (
          convParticipants.length === 2 &&
          convParticipants.includes(participants[0]) &&
          convParticipants.includes(participants[1])
        );
      });
    if (existing)
      return res.json({
        success: true,
        conversationId: existing.id,
        id: existing.id,
        conversation: rowToConversation(existing),
      });
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO conversations (id, participants, last_message, last_message_by, last_message_time, unread_count, created_at, updated_at) VALUES (?, ?, '', '', '', 0, ?, ?)`,
    ).run(id, JSON.stringify(participants.sort()), now, now);
    const conversation = rowToConversation(
      db.prepare("SELECT * FROM conversations WHERE id = ?").get(id),
    );
    console.log(`💬 Conversation created: ${id}`);
    res.json({ success: true, conversationId: id, id, conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/conversations/:id", auth, (req, res) => {
  try {
    const { id } = req.params;
    const { lastMessage, lastMessageBy } = req.body;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE conversations SET last_message = ?, last_message_by = ?, last_message_time = ?, updated_at = ? WHERE id = ?`,
    ).run(lastMessage || "", lastMessageBy || "", now, now, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conversations/:id/messages", (req, res) => {
  db.prepare("UPDATE conversations SET unread_count = 0 WHERE id = ?").run(
    req.params.id,
  );
  const { id } = req.params;
  const rows = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 100",
    )
    .all(id);
  const messages = rows.map(rowToMessage);
  const enriched = messages.map((msg) => {
    const sender = rowToSafeUser(
      db.prepare("SELECT * FROM users WHERE uid = ?").get(msg.senderId),
    );
    return {
      ...msg,
      username: sender?.username || "Пользователь",
      avatar: sender?.avatar || "",
    };
  });
  res.json(enriched);
});

app.post(
  "/api/conversations/:id/messages",
  auth,
  allowFields("text", "fileUrl", "fileType", "fileName"),
  (req, res) => {
    try {
      const { id } = req.params;
      const { text, fileUrl, fileType, fileName } = req.body;
      if (!text && !fileUrl)
        return res
          .status(400)
          .json({ error: "Сообщение не может быть пустым" });
      const conv = db
        .prepare("SELECT * FROM conversations WHERE id = ?")
        .get(id);
      if (!conv) return res.status(404).json({ error: "Чат не найден" });
      const participants = safeParseJson(conv.participants, []);
      if (!participants.includes(req.uid))
        return res.status(403).json({ error: "Вы не участник этого чата" });
      const messageId = genId();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, text, file_url, file_type, file_name, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      ).run(
        messageId,
        id,
        req.uid,
        text || "",
        fileUrl || "",
        fileType || "",
        fileName || "",
        now,
      );
      const otherId = participants.find((p) => p !== req.uid);
      if (otherId)
        db.prepare(
          "UPDATE conversations SET unread_count = unread_count + 1 WHERE id = ?",
        ).run(id);
      const preview = text
        ? text.length > 50
          ? text.slice(0, 50) + "..."
          : text
        : fileName
          ? `${fileType?.startsWith("image/") ? "🖼️" : "📎"} ${fileName}`
          : "";
      db.prepare(
        "UPDATE conversations SET last_message = ?, last_message_by = ?, last_message_time = ?, updated_at = ? WHERE id = ?",
      ).run(preview, req.uid, now, now, id);
      const message = rowToMessage(
        db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId),
      );
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(req.uid),
      );
      res.json({
        success: true,
        messageId,
        message: {
          ...message,
          username: sender?.username || "Пользователь",
          avatar: sender?.avatar || "",
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

app.delete(
  "/api/conversations/:conversationId/messages/:messageId",
  auth,
  (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const message = db
        .prepare("SELECT * FROM messages WHERE id = ? AND conversation_id = ?")
        .get(messageId, conversationId);
      if (!message)
        return res.status(404).json({ error: "Сообщение не найдено" });
      if (message.sender_id !== req.uid)
        return res
          .status(403)
          .json({ error: "Можно удалять только свои сообщения" });
      db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);
      console.log(`🗑️ Message deleted: ${messageId} by ${req.uid}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

app.get("/api/notifications", auth, (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50",
      )
      .all(req.uid);
    const enriched = rows.map((n) => {
      const sender = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(n.sender_id),
      );
      return { ...rowToNotification(n), sender };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/notifications/unread-count", auth, (req, res) => {
  try {
    const result = db
      .prepare(
        "SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND read = 0",
      )
      .get(req.uid);
    res.json({ count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/notifications/:id/read", auth, (req, res) => {
  try {
    db.prepare(
      "UPDATE notifications SET read = 1 WHERE id = ? AND recipient_id = ?",
    ).run(req.params.id, req.uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PHOTO CHAINS ──────────────────────────────────────────────────────────

app.post("/api/photo-chains", auth, (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Название обязательно" });
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO photo_chains (id, creator_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, req.uid, title, description || "", now, now);
    res.json({ success: true, chainId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/photo-chains", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM photo_chains ORDER BY updated_at DESC")
      .all();
    const enriched = rows.map((c) => {
      const creator = rowToSafeUser(
        db.prepare("SELECT * FROM users WHERE uid = ?").get(c.creator_id),
      );
      const items = db
        .prepare(
          "SELECT * FROM photo_chain_items WHERE chain_id = ? ORDER BY created_at ASC",
        )
        .all(c.id);
      return { ...c, creator, items, itemCount: items.length };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/photo-chains/:chainId/photos", auth, (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ error: "Фото обязательно" });
    const chain = db
      .prepare("SELECT * FROM photo_chains WHERE id = ?")
      .get(req.params.chainId);
    if (!chain) return res.status(404).json({ error: "Эстафета не найдена" });
    const itemId = genId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO photo_chain_items (id, chain_id, user_id, photo_url, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(itemId, req.params.chainId, req.uid, photoUrl, now);
    db.prepare("UPDATE photo_chains SET updated_at = ? WHERE id = ?").run(
      now,
      req.params.chainId,
    );
    const user = db
      .prepare("SELECT username, avatar FROM users WHERE uid = ?")
      .get(req.uid);
    const postId = genId();
    const notificationText = `📸 @${user?.username || "Пользователь"} добавил фото в эстафету "${chain.title}"`;
    db.prepare(
      `INSERT INTO posts (id, author_id, text, image, video, poll, likes, comments_count, created_at, updated_at) VALUES (?, ?, ?, '', '', NULL, '[]', 0, ?, ?)`,
    ).run(postId, req.uid, notificationText, now, now);
    const participants = db
      .prepare(
        "SELECT DISTINCT user_id FROM photo_chain_items WHERE chain_id = ?",
      )
      .all(req.params.chainId);
    for (const p of participants) {
      if (p.user_id !== req.uid)
        createNotification(
          p.user_id,
          "chain_update",
          null,
          req.uid,
          `добавил фото в эстафету "${chain.title}"`,
        );
    }
    res.json({ success: true, itemId, postId });
  } catch (error) {
    console.error("Error adding photo to chain:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/photo-chains/:id", auth, (req, res) => {
  try {
    const chain = db
      .prepare("SELECT * FROM photo_chains WHERE id = ?")
      .get(req.params.id);
    if (!chain) return res.status(404).json({ error: "Эстафета не найдена" });
    if (chain.creator_id !== req.uid)
      return res
        .status(403)
        .json({ error: "Только создатель может удалить эстафету" });
    db.prepare("DELETE FROM photo_chain_items WHERE chain_id = ?").run(
      req.params.id,
    );
    db.prepare("DELETE FROM photo_chains WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CONVERSATIONS UNREAD ──────────────────────────────────────────────────

app.get("/api/conversations/unread-total", auth, (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM conversations WHERE participants LIKE ?")
      .all(`%${req.uid}%`);
    const total = rows.reduce((sum, c) => {
      const parts = safeParseJson(c.participants, []);
      if (parts.includes(req.uid)) return sum + (c.unread_count || 0);
      return sum;
    }, 0);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PREMIUM & FITNESS BLOCK ───────────────────────────────────────────────

app.get("/api/premium/status", auth, (req, res) => {
  try {
    const subscription = db
      .prepare(
        `SELECT * FROM premium_subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1`,
      )
      .get(req.uid);
    const isPremium = !!subscription;
    res.json({
      isPremium,
      expiresAt: subscription?.expires_at || null,
      price: 199,
      currency: "RUB",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/premium/activate", auth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const id = genId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO premium_subscriptions (id, user_id, status, started_at, expires_at, amount, currency, payment_method, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, 199, 'RUB', ?, ?, ?)`,
    ).run(
      id,
      req.uid,
      now.toISOString(),
      expiresAt.toISOString(),
      paymentMethod || "manual",
      now.toISOString(),
      now.toISOString(),
    );
    console.log(`💳 Premium activated for ${req.uid}`);
    res.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      message: "Premium активирован на 30 дней!",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/premium/claim", auth, (req, res) => {
  try {
    const { transactionInfo, paymentProof } = req.body;
    const id = genId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO premium_subscriptions (id, user_id, status, started_at, expires_at, amount, currency, payment_method, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, 199, 'RUB', 'sbp_manual', ?, ?)`,
    ).run(
      id,
      req.uid,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );
    console.log(`💳 Manual premium activated for ${req.uid} via SBP`);
    res.json({
      success: true,
      message: "✅ Премиум активирован! Спасибо за поддержку! 🦊",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Premium claim error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/premium/activate", auth, (req, res) => {
  try {
    const ADMIN_UID = process.env.ADMIN_UID || "ТВОЙ_UID_ПОЛЬЗОВАТЕЛЯ";
    if (req.uid !== ADMIN_UID)
      return res.status(403).json({ error: "Только админ" });
    const { targetUserId } = req.body;
    if (!targetUserId)
      return res.status(400).json({ error: "Укажите user_id" });
    const id = genId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO premium_subscriptions (id, user_id, status, started_at, expires_at, amount, currency, payment_method, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, 199, 'RUB', 'admin_manual', ?, ?)`,
    ).run(
      id,
      targetUserId,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );
    console.log(`👑 Admin activated premium for ${targetUserId}`);
    res.json({
      success: true,
      message: `Премиум активирован для ${targetUserId}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/feed/timer", auth, (req, res) => {
  try {
    const subscription = db
      .prepare(
        `SELECT * FROM premium_subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now')`,
      )
      .get(req.uid);
    if (subscription)
      return res.json({
        isBlocked: false,
        isPremium: true,
        expiresAt: subscription.expires_at,
        message: "Premium активен",
      });
    let timer = db
      .prepare("SELECT * FROM feed_timers WHERE user_id = ?")
      .get(req.uid);
    const now = new Date();
    const BLOCK_TIME = 1800;
    if (!timer) {
      const id = genId();
      const nowStr = now.toISOString();
      db.prepare(
        `INSERT INTO feed_timers (id, user_id, session_seconds, total_today_seconds, is_blocked, created_at, updated_at) VALUES (?, ?, 0, 0, 0, ?, ?)`,
      ).run(id, req.uid, nowStr, nowStr);
      timer = db
        .prepare("SELECT * FROM feed_timers WHERE user_id = ?")
        .get(req.uid);
    }
    if (timer.is_blocked && timer.block_until) {
      const blockUntil = new Date(timer.block_until);
      if (now < blockUntil)
        return res.json({
          isBlocked: true,
          blockUntil: timer.block_until,
          secondsRemaining: Math.floor((blockUntil - now) / 1000),
          isPremium: false,
          reason: "time_limit",
        });
      else {
        db.prepare(
          `UPDATE feed_timers SET is_blocked = 0, block_until = NULL, session_seconds = 0, updated_at = ? WHERE user_id = ?`,
        ).run(now.toISOString(), req.uid);
        timer.is_blocked = 0;
        timer.session_seconds = 0;
      }
    }
    const newTotal = timer.session_seconds + 1;
    const shouldBlock = newTotal >= BLOCK_TIME;
    if (shouldBlock) {
      const blockUntil = new Date(now.getTime() + 30 * 60 * 1000);
      db.prepare(
        `UPDATE feed_timers SET session_seconds = ?, is_blocked = 1, block_until = ?, updated_at = ? WHERE user_id = ?`,
      ).run(newTotal, blockUntil.toISOString(), now.toISOString(), req.uid);
      return res.json({
        isBlocked: true,
        blockUntil: blockUntil.toISOString(),
        secondsRemaining: 1800,
        isPremium: false,
        shouldBlock: true,
        blockTime: BLOCK_TIME,
      });
    }
    db.prepare(
      `UPDATE feed_timers SET session_seconds = ?, updated_at = ? WHERE user_id = ?`,
    ).run(newTotal, now.toISOString(), req.uid);
    res.json({
      isBlocked: false,
      isPremium: false,
      sessionSeconds: newTotal,
      timeUntilBlock: BLOCK_TIME - newTotal,
      blockTime: BLOCK_TIME,
      shouldBlock: false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/feed/unlock", auth, (req, res) => {
  try {
    const { exerciseId, videoUrl, imageUrl } = req.body;
    const now = new Date().toISOString();
    const id = genId();
    db.prepare(
      `INSERT INTO completed_exercises (id, user_id, exercise_id, video_url, image_url, completed_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, req.uid, exerciseId, videoUrl || null, imageUrl || null, now);
    if (exerciseId && !exerciseId.startsWith("default_"))
      db.prepare(
        `UPDATE fitness_exercises SET completions = completions + 1 WHERE id = ?`,
      ).run(exerciseId);
    db.prepare(
      `UPDATE feed_timers SET is_blocked = 0, block_until = NULL, session_seconds = 0, last_exercise_at = ?, updated_at = ? WHERE user_id = ?`,
    ).run(now, now, req.uid);
    if (videoUrl || imageUrl) {
      const exercise = db
        .prepare(`SELECT exercise_name FROM fitness_exercises WHERE id = ?`)
        .get(exerciseId);
      const postId = genId();
      const postText = `✅ Выполнил упражнение: ${exercise?.exercise_name || "Фитнес-челлендж"}`;
      db.prepare(
        `INSERT INTO posts (id, author_id, text, image, video, likes, comments_count, created_at, updated_at) VALUES (?, ?, ?, '', ?, '[]', 0, ?, ?)`,
      ).run(postId, req.uid, postText, videoUrl || imageUrl, now, now);
    }
    res.json({
      success: true,
      message: "Лента разблокирована на 30 минут!",
      unlockedUntil: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/fitness/exercises/random", auth, (req, res) => {
  try {
    const exercise = db
      .prepare(
        `SELECT e.id, e.exercise_name, e.exercise_description, e.difficulty, 'Участник #' || (ABS(e.rowid) % 1000) as anonymous_author FROM fitness_exercises e WHERE e.is_active = 1 ORDER BY RANDOM() LIMIT 1`,
      )
      .get();
    if (!exercise) {
      const defaults = [
        {
          id: "default_1",
          exercise_name: "Приседания",
          exercise_description: "20 повторений",
          difficulty: "easy",
          anonymous_author: "Система",
        },
        {
          id: "default_2",
          exercise_name: "Отжимания",
          exercise_description: "15 повторений",
          difficulty: "medium",
          anonymous_author: "Система",
        },
        {
          id: "default_3",
          exercise_name: "Планка",
          exercise_description: "60 секунд",
          difficulty: "hard",
          anonymous_author: "Система",
        },
      ];
      return res.json(defaults[Math.floor(Math.random() * defaults.length)]);
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/fitness/exercises", auth, (req, res) => {
  try {
    const { exerciseName, exerciseDescription, difficulty } = req.body;
    if (!exerciseName || !exerciseName.trim())
      return res.status(400).json({ error: "Название упражнения обязательно" });
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO fitness_exercises (id, author_id, exercise_name, exercise_description, difficulty, likes, completions, is_active, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?)`,
    ).run(
      id,
      req.uid,
      exerciseName.trim(),
      exerciseDescription || "",
      difficulty || "medium",
      now,
    );
    res.json({ success: true, exerciseId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── MISC ──────────────────────────────────────────────────────────────────

app.post("/api/init-tables", (req, res) => {
  res.json({ success: true, message: "SQLite tables already initialized" });
});

// ─── FITNESS BLOCK: DECLINE (НОВЫЙ ЭНДПОИНТ) ─────────────────────────────
// 🔷 Отказ от упражнения — блокировка на 30 минут
app.post("/api/feed/decline", auth, (req, res) => {
  try {
    const now = new Date();
    const blockUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 минуты

    // Обновляем или создаём запись таймера
    const existing = db
      .prepare("SELECT id FROM feed_timers WHERE user_id = ?")
      .get(req.uid);

    if (existing) {
      db.prepare(
        `
UPDATE feed_timers SET is_blocked = 1, block_until = ?, session_seconds = 0, updated_at = ?
WHERE user_id = ?
`,
      ).run(blockUntil.toISOString(), now.toISOString(), req.uid);
    } else {
      db.prepare(
        `
INSERT INTO feed_timers (id, user_id, session_seconds, total_today_seconds, is_blocked, block_until, created_at, updated_at)
VALUES (?, ?, 0, 0, 1, ?, ?, ?)
`,
      ).run(
        genId(),
        req.uid,
        blockUntil.toISOString(),
        now.toISOString(),
        now.toISOString(),
      );
    }
    console.log(
      `🔒 User ${req.uid} declined exercise - blocked until ${blockUntil.toISOString()}`,
    );
    res.json({
      success: true,
      blockUntil: blockUntil.toISOString(),
      message: "Лента заблокирована на 30 минут",
    });
  } catch (error) {
    console.error("Decline error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── FILE UPLOAD (НОВЫЙ ЭНДПОИНТ) ─────────────────────────────────────────
// 🔷 Загрузка файла (base64) — сохраняет в папку uploads/
app.post("/api/upload", auth, (req, res) => {
  try {
    const { fileData, fileName, fileType } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ error: "Файл и имя обязательны" });
    }
    // 🔧 ДЛЯ AMVERA — сохраняем в /app/uploads/
    const uploadsDir =
      process.env.NODE_ENV === "production"
        ? "/app/uploads"
        : join(__dirname, "uploads");
    if (!require("fs").existsSync(uploadsDir)) {
      require("fs").mkdirSync(uploadsDir, { recursive: true });
    }
    // Генерируем уникальное имя файла
    const ext = fileType?.split("/")?.[1] || "webm";
    const safeFileName = `${genId()}.${ext}`;
    const filePath = join(uploadsDir, safeFileName);
    // Парсим base64 и сохраняем
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
    require("fs").writeFileSync(filePath, base64Data, "base64");
    // Возвращаем публичный URL
    const fileUrl = `/uploads/${safeFileName}`;
    console.log(`📁 File uploaded: ${fileName} → ${fileUrl}`);
    res.json({ success: true, url: fileUrl, fileName: safeFileName });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔷 Статичная раздача загруженных файлов
app.use("/uploads", express.static(join(__dirname, "uploads")));

// ─── 404 / ERROR ───────────────────────────────────────────────────────────

app.use((req, res) => {
  console.log("⚠️ 404:", req.method, req.path);
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("💥 Server error:", err);
  res
    .status(500)
    .json({ error: "Internal server error", message: err.message });
});

// ─── START ─────────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log(`🚀 Lis API server running on port ${PORT}`);
  console.log(`💾 Storage: SQLite (${DB_PATH})`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat: /api/conversations, /api/groups/:id/messages`);
  console.log(`🔔 Notifications: /api/notifications`);
  console.log(`📸 Photo Chains: /api/photo-chains`);
  console.log(`💪 Fitness Block: /api/feed/timer`);
  console.log(`💳 Premium: /api/premium/status`);
  console.log("========================================");
});
