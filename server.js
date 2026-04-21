import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "lis_social_secret_key_2024";

// SQLite setup
const db = new Database(path.join(__dirname, "lis_users.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    online INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    image TEXT DEFAULT '',
    video TEXT DEFAULT '',
    poll_data TEXT DEFAULT '',
    likes TEXT DEFAULT '[]',
    comments_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (author_id) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (author_id) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS friendships (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'personal',
    participants TEXT NOT NULL,
    name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id TEXT NOT NULL,
    text TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    file_type TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS feed_timers (
    user_id TEXT PRIMARY KEY,
    session_time INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    lock_until TEXT DEFAULT NULL
  );
`);

// Migration: add phone column if missing
try {
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (!cols.some((c) => c.name === "phone")) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL");
  }
} catch (e) {
  console.error("Migration error:", e);
}

console.log("✅ SQLite database ready");
console.log("========================================");
console.log(`🚀 Lis API server will run on port ${PORT}`);
console.log("========================================");

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", storage: "SQLite" });
});

// ============ AUTH ROUTES ============
const normalizePhone = (phone) => String(phone || "").replace(/[^\d+]/g, "");

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    const normPhone = normalizePhone(phone);

    if (!username || !normPhone || !password) {
      return res.status(400).json({ error: "Никнейм, телефон и пароль обязательны" });
    }
    if (normPhone.length < 6) {
      return res.status(400).json({ error: "Некорректный номер телефона" });
    }

    const existingName = db.prepare("SELECT uid FROM users WHERE username = ?").get(username);
    if (existingName) {
      return res.status(400).json({ error: "Никнейм уже занят" });
    }

    const existingPhone = db.prepare("SELECT uid FROM users WHERE phone = ?").get(normPhone);
    if (existingPhone) {
      return res.status(400).json({ error: "Этот номер уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(
      "INSERT INTO users (uid, username, phone, password_hash, avatar, bio) VALUES (?, ?, ?, ?, '', '')"
    ).run(uid, username, normPhone, passwordHash);

    const token = jwt.sign({ uid, username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { uid, username, phone: normPhone, avatar: "", bio: "" } });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const normPhone = normalizePhone(phone);

    if (!normPhone || !password) {
      return res.status(400).json({ error: "Введите телефон и пароль" });
    }

    const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(normPhone);
    if (!user) {
      return res.status(400).json({ error: "Пользователь не найден" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Неверный пароль" });
    }

    const token = jwt.sign({ uid: user.uid, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        uid: user.uid,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ============ USER ROUTES ============
app.get("/api/users/search", authenticateToken, (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = db
      .prepare("SELECT uid, username, avatar, bio FROM users WHERE username LIKE ? LIMIT 20")
      .all(`%${q}%`);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users/:uid", authenticateToken, (req, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(req.params.uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendsCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'"
      )
      .get(req.params.uid, req.params.uid);

    res.json({
      uid: user.uid,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      online: !!user.online,
      friendsCount: friendsCount?.count || 0,
      followingCount: 0,
      followersCount: 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/users/profile", authenticateToken, (req, res) => {
  try {
    const { username, bio } = req.body;

    if (username) {
      const existing = db
        .prepare("SELECT uid FROM users WHERE username = ? AND uid != ?")
        .get(username, req.user.uid);

      if (existing) {
        return res.status(400).json({ error: "Username taken" });
      }

      db.prepare("UPDATE users SET username = ? WHERE uid = ?").run(username, req.user.uid);
    }

    if (bio !== undefined) {
      db.prepare("UPDATE users SET bio = ? WHERE uid = ?").run(bio, req.user.uid);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users/avatar", authenticateToken, upload.single("avatar"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const avatarUrl = `/uploads/${req.file.filename}`;
    db.prepare("UPDATE users SET avatar = ? WHERE uid = ?").run(avatarUrl, req.user.uid);

    res.json({ avatar: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ POST ROUTES ============
app.get("/api/posts", authenticateToken, (req, res) => {
  try {
    const posts = db
      .prepare(
        `SELECT p.*, u.username, u.avatar as author_avatar 
         FROM posts p 
         JOIN users u ON p.author_id = u.uid 
         ORDER BY p.created_at DESC LIMIT 50`
      )
      .all();

    res.json(
      posts.map((p) => ({
        id: p.id,
        author_id: p.author_id,
        username: p.username,
        avatar: p.author_avatar,
        content: p.content,
        image: p.image,
        video: p.video,
        poll_data: p.poll_data ? JSON.parse(p.poll_data) : null,
        likes: JSON.parse(p.likes || "[]"),
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/posts",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const { content, pollData } = req.body;

      let imageUrl = "";
      let videoUrl = "";

      if (req.files?.image?.[0]) {
        imageUrl = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files?.video?.[0]) {
        videoUrl = `/uploads/${req.files.video[0].filename}`;
      }

      const result = db
        .prepare(
          `INSERT INTO posts (author_id, content, image, video, poll_data, likes) 
           VALUES (?, ?, ?, ?, ?, '[]')`
        )
        .run(
          req.user.uid,
          content || "",
          imageUrl,
          videoUrl,
          pollData ? JSON.stringify(pollData) : ""
        );

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.post("/api/posts/:id/like", authenticateToken, (req, res) => {
  try {
    const post = db.prepare("SELECT likes FROM posts WHERE id = ?").get(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    let likes = JSON.parse(post.likes || "[]");
    const userIndex = likes.indexOf(req.user.uid);

    if (userIndex === -1) {
      likes.push(req.user.uid);
    } else {
      likes.splice(userIndex, 1);
    }

    db.prepare("UPDATE posts SET likes = ? WHERE id = ?").run(JSON.stringify(likes), req.params.id);

    res.json({ likes });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/posts/:id/comment", authenticateToken, (req, res) => {
  try {
    const { text } = req.body;

    const result = db
      .prepare("INSERT INTO comments (post_id, author_id, text) VALUES (?, ?, ?)")
      .run(req.params.id, req.user.uid, text);

    db.prepare("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?").run(
      req.params.id
    );

    // Create notification
    const post = db.prepare("SELECT author_id FROM posts WHERE id = ?").get(req.params.id);
    if (post && post.author_id !== req.user.uid) {
      db.prepare(
        "INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, 'comment', ?)"
      ).run(post.author_id, req.user.uid, `commented on your post`);
    }

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/posts/:id/comments", authenticateToken, (req, res) => {
  try {
    const comments = db
      .prepare(
        `SELECT c.*, u.username, u.avatar 
         FROM comments c 
         JOIN users u ON c.author_id = u.uid 
         WHERE c.post_id = ? 
         ORDER BY c.created_at ASC`
      )
      .all(req.params.id);

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/posts/:id", authenticateToken, (req, res) => {
  try {
    const post = db.prepare("SELECT author_id FROM posts WHERE id = ?").get(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.author_id !== req.user.uid)
      return res.status(403).json({ error: "Not your post" });

    db.prepare("DELETE FROM comments WHERE post_id = ?").run(req.params.id);
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ MESSAGE ROUTES ============
app.get("/api/messages/conversations", authenticateToken, (req, res) => {
  try {
    const conversations = db
      .prepare(
        `SELECT * FROM conversations 
         WHERE participants LIKE ? 
         ORDER BY created_at DESC`
      )
      .all(`%${req.user.uid}%`);

    res.json(
      conversations.map((c) => ({
        id: c.id,
        type: c.type,
        participants: JSON.parse(c.participants),
        name: c.name,
        created_at: c.created_at,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/messages/conversation", authenticateToken, (req, res) => {
  try {
    const { participantId, name } = req.body;

    const participants = [req.user.uid, participantId].sort();

    // Check if personal conversation already exists
    if (!name) {
      const existing = db
        .prepare(
          "SELECT id FROM conversations WHERE type = 'personal' AND participants = ?"
        )
        .get(JSON.stringify(participants));

      if (existing) {
        return res.json({ success: true, id: existing.id });
      }
    }

    const result = db
      .prepare(
        "INSERT INTO conversations (type, participants, name) VALUES (?, ?, ?)"
      )
      .run(
        name ? "group" : "personal",
        JSON.stringify(participants),
        name || ""
      );

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/messages/:conversationId", authenticateToken, (req, res) => {
  try {
    const messages = db
      .prepare(
        `SELECT m.*, u.username, u.avatar 
         FROM messages m 
         JOIN users u ON m.sender_id = u.uid 
         WHERE m.conversation_id = ? 
         ORDER BY m.created_at ASC`
      )
      .all(req.params.conversationId);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/messages/:conversationId",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    try {
      const { text } = req.body;

      let fileUrl = "";
      let fileType = "";

      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
        fileType = req.file.mimetype.startsWith("image/") ? "image" : "video";
      }

      const result = db
        .prepare(
          "INSERT INTO messages (conversation_id, sender_id, text, file_url, file_type) VALUES (?, ?, ?, ?, ?)"
        )
        .run(req.params.conversationId, req.user.uid, text || "", fileUrl, fileType);

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.delete("/api/messages/:messageId", authenticateToken, (req, res) => {
  try {
    const message = db
      .prepare("SELECT sender_id FROM messages WHERE id = ?")
      .get(req.params.messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.sender_id !== req.user.uid)
      return res.status(403).json({ error: "Cannot delete others messages" });

    db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.messageId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ FRIEND ROUTES ============
app.get("/api/friends", authenticateToken, (req, res) => {
  try {
    const friends = db
      .prepare(
        `SELECT u.uid, u.username, u.avatar, u.bio, f.status
         FROM friendships f
         JOIN users u ON (
           CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END = u.uid
         )
         WHERE (f.user_id = ? OR f.friend_id = ?)
         AND f.status = 'accepted'`
      )
      .all(req.user.uid, req.user.uid, req.user.uid);

    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/friends/requests", authenticateToken, (req, res) => {
  try {
    const requests = db
      .prepare(
        `SELECT u.uid, u.username, u.avatar, f.created_at
         FROM friendships f
         JOIN users u ON f.user_id = u.uid
         WHERE f.friend_id = ? AND f.status = 'pending'`
      )
      .all(req.user.uid);

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/friends/request", authenticateToken, (req, res) => {
  try {
    const { friendId } = req.body;

    const existing = db
      .prepare(
        "SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
      )
      .get(req.user.uid, friendId, friendId, req.user.uid);

    if (existing) {
      return res.status(400).json({ error: "Request already exists" });
    }

    db.prepare(
      "INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')"
    ).run(req.user.uid, friendId);

    db.prepare(
      "INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, 'friend_request', ?)"
    ).run(friendId, req.user.uid, "sent you a friend request");

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/friends/accept", authenticateToken, (req, res) => {
  try {
    const { friendId } = req.body;

    db.prepare(
      "UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?"
    ).run(friendId, req.user.uid);

    db.prepare(
      "INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, 'friend_accepted', ?)"
    ).run(friendId, req.user.uid, "accepted your friend request");

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/friends/:friendId", authenticateToken, (req, res) => {
  try {
    db.prepare(
      "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    ).run(req.user.uid, req.params.friendId, req.params.friendId, req.user.uid);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ STORY ROUTES ============
app.get("/api/stories", authenticateToken, (req, res) => {
  try {
    // Clean expired stories
    db.prepare("DELETE FROM stories WHERE expires_at < datetime('now')").run();

    const stories = db
      .prepare(
        `SELECT s.*, u.username, u.avatar 
         FROM stories s 
         JOIN users u ON s.user_id = u.uid 
         ORDER BY s.created_at DESC`
      )
      .all();

    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/stories", authenticateToken, upload.single("media"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const mediaUrl = `/uploads/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith("image/") ? "image" : "video";
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const result = db
      .prepare(
        "INSERT INTO stories (user_id, media_url, media_type, expires_at) VALUES (?, ?, ?, ?)"
      )
      .run(req.user.uid, mediaUrl, mediaType, expiresAt);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ NOTIFICATION ROUTES ============
app.get("/api/notifications", authenticateToken, (req, res) => {
  try {
    const notifications = db
      .prepare(
        `SELECT n.*, u.username, u.avatar 
         FROM notifications n 
         JOIN users u ON n.sender_id = u.uid 
         WHERE n.recipient_id = ? 
         ORDER BY n.created_at DESC LIMIT 50`
      )
      .all(req.user.uid);

    res.json(
      notifications.map((n) => ({
        id: n.id,
        sender_id: n.sender_id,
        username: n.username,
        avatar: n.avatar,
        type: n.type,
        message: n.message,
        is_read: !!n.is_read,
        created_at: n.created_at,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/notifications/read", authenticateToken, (req, res) => {
  try {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?").run(req.user.uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ FEED TIMER ROUTES ============
app.get("/api/feed-timer", authenticateToken, (req, res) => {
  try {
    let timer = db.prepare("SELECT * FROM feed_timers WHERE user_id = ?").get(req.user.uid);

    if (!timer) {
      db.prepare(
        "INSERT INTO feed_timers (user_id, session_time, is_locked) VALUES (?, 0, 0)"
      ).run(req.user.uid);
      return res.json({ sessionTime: 0, isLocked: false, lockUntil: null });
    }

    // Check if lock expired
    if (timer.is_locked && timer.lock_until && new Date(timer.lock_until) < new Date()) {
      db.prepare(
        "UPDATE feed_timers SET is_locked = 0, lock_until = NULL, session_time = 0 WHERE user_id = ?"
      ).run(req.user.uid);
      timer = { ...timer, is_locked: 0, lock_until: null, session_time: 0 };
    }

    res.json({
      sessionTime: timer.session_time,
      isLocked: !!timer.is_locked,
      lockUntil: timer.lock_until,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/feed-timer/update", authenticateToken, (req, res) => {
  try {
    const { sessionTime } = req.body;
    db.prepare("UPDATE feed_timers SET session_time = ? WHERE user_id = ?").run(
      sessionTime,
      req.user.uid
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/feed-timer/lock", authenticateToken, (req, res) => {
  try {
    const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare(
      "UPDATE feed_timers SET is_locked = 1, lock_until = ? WHERE user_id = ?"
    ).run(lockUntil, req.user.uid);
    res.json({ success: true, lockUntil });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/feed-timer/reset", authenticateToken, (req, res) => {
  try {
    db.prepare(
      "UPDATE feed_timers SET session_time = 0, is_locked = 0, lock_until = NULL WHERE user_id = ?"
    ).run(req.user.uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lis API server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
});
