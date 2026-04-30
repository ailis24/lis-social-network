import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// JWT secret: must be set in production. In dev, generate a random one if missing
// (so tokens become invalid after every restart, which is the safe default).
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        console.error(
          "FATAL: JWT_SECRET env variable is required in production",
        );
        process.exit(1);
      })()
    : crypto.randomBytes(64).toString("hex"));

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

  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL,
    activated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id TEXT NOT NULL,
    text TEXT NOT NULL,
    emoji TEXT DEFAULT '💪',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add file_url to comments
try {
  const ccols = db.prepare("PRAGMA table_info(comments)").all();
  if (!ccols.some((c) => c.name === "file_url")) {
    db.exec("ALTER TABLE comments ADD COLUMN file_url TEXT DEFAULT ''");
    db.exec("ALTER TABLE comments ADD COLUMN file_type TEXT DEFAULT ''");
  }
} catch (e) {
  console.error("Comments migration error:", e);
}

// Migration: add phone column if missing
try {
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (!cols.some((c) => c.name === "phone")) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL",
    );
  }
} catch (e) {
  console.error("Migration error:", e);
}

// Migration: add is_admin column
try {
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (!cols.some((c) => c.name === "is_admin")) {
    db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
  }
} catch (e) {
  console.error("Admin migration error:", e);
}

// Admin phones from env (comma-separated). Default: project owner phone.
const ADMIN_PHONES = (process.env.ADMIN_PHONES || "+79999099549")
  .split(",")
  .map((p) => p.replace(/[^\d+]/g, ""))
  .filter(Boolean);

const isAdminPhone = (phone) => {
  const norm = String(phone || "").replace(/[^\d+]/g, "");
  return ADMIN_PHONES.includes(norm);
};

// Promote any registered users whose phone matches ADMIN_PHONES
try {
  if (ADMIN_PHONES.length) {
    const placeholders = ADMIN_PHONES.map(() => "?").join(",");
    db.prepare(
      `UPDATE users SET is_admin = 1 WHERE phone IN (${placeholders})`,
    ).run(...ADMIN_PHONES);
  }
} catch (e) {
  console.error("Admin promote error:", e);
}

console.log("✅ SQLite database ready");
console.log("========================================");
console.log(`🚀 Lis API server will run on port ${PORT}`);
console.log("========================================");

// ============ SECURITY MIDDLEWARE ============
// Trust proxy (Replit / production load balancer) for accurate rate limiting
app.set("trust proxy", 1);

// Security headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled for /uploads cross-origin media
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS — restrict to known origins in production, permissive in dev
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Body size limit + HTTP Parameter Pollution protection
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));
app.use(hpp());

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 req / IP / minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов, попробуйте позже" },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 login/register attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа, попробуйте через 15 минут" },
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много загрузок, подождите минуту" },
});
app.use("/api/", generalLimiter);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; img-src 'self'; media-src 'self'",
      );
    },
  }),
);

// Multer config — sanitize filename, restrict mimetypes, cap size at 50MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
]);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Strip path components and dangerous chars from original name
    const base = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-60);
    const safe = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${base || "file"}`;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error("Недопустимый тип файла"));
  },
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

// Public: total registered users
app.get("/api/users/count", (req, res) => {
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get();
    res.json({ count: row?.count || 0 });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Helper: check if user has active premium
const hasPremium = (uid) => {
  try {
    const sub = db
      .prepare("SELECT expires_at FROM subscriptions WHERE user_id = ?")
      .get(uid);
    if (!sub) return false;
    return new Date(sub.expires_at) > new Date();
  } catch {
    return false;
  }
};

// ============ AUTH ROUTES ============
const normalizePhone = (phone) => String(phone || "").replace(/[^\d+]/g, "");

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    const normPhone = normalizePhone(phone);

    if (!username || !normPhone || !password) {
      return res
        .status(400)
        .json({ error: "Никнейм, телефон и пароль обязательны" });
    }
    if (normPhone.length < 6 || normPhone.length > 20) {
      return res.status(400).json({ error: "Некорректный номер телефона" });
    }
    if (
      typeof username !== "string" ||
      username.length < 2 ||
      username.length > 30 ||
      !/^[a-zA-Zа-яА-Я0-9_.-]+$/u.test(username)
    ) {
      return res.status(400).json({
        error: "Никнейм: 2-30 символов, только буквы, цифры, _ . -",
      });
    }
    if (
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 100
    ) {
      return res.status(400).json({ error: "Пароль: от 6 до 100 символов" });
    }

    const existingName = db
      .prepare("SELECT uid FROM users WHERE username = ?")
      .get(username);
    if (existingName) {
      return res.status(400).json({ error: "Никнейм уже занят" });
    }

    const existingPhone = db
      .prepare("SELECT uid FROM users WHERE phone = ?")
      .get(normPhone);
    if (existingPhone) {
      return res.status(400).json({ error: "Этот номер уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const uid = `user_${crypto.randomBytes(12).toString("hex")}`;
    const isAdmin = isAdminPhone(normPhone) ? 1 : 0;

    db.prepare(
      "INSERT INTO users (uid, username, phone, password_hash, avatar, bio, is_admin) VALUES (?, ?, ?, ?, '', '', ?)",
    ).run(uid, username, normPhone, passwordHash, isAdmin);

    const token = jwt.sign({ uid, username, is_admin: user.is_admin || 0 }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: {
        uid,
        username,
        phone: normPhone,
        avatar: "",
        bio: "",
        is_admin: isAdmin,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    const normPhone = normalizePhone(phone);

    if (!normPhone || !password || typeof password !== "string") {
      return res.status(400).json({ error: "Введите телефон и пароль" });
    }
    if (password.length > 100) {
      return res.status(400).json({ error: "Неверные данные" });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE phone = ?")
      .get(normPhone);

    // Timing-safe: always run bcrypt to avoid leaking whether user exists
    const dummyHash =
      "$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN0pqrs";
    const hashToCheck = user ? user.password_hash : dummyHash;
    const validPassword = await bcrypt.compare(password, hashToCheck);

    if (!user || !validPassword) {
      return res.status(400).json({ error: "Неверный телефон или пароль" });
    }

    // Sync admin flag if phone is in ADMIN_PHONES
    let isAdmin = user.is_admin ? 1 : 0;
    if (isAdminPhone(user.phone) && !isAdmin) {
      try {
        db.prepare("UPDATE users SET is_admin = 1 WHERE uid = ?").run(user.uid);
        isAdmin = 1;
      } catch {}
    }

    const token = jwt.sign(
      { uid: user.uid, username: user.username },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({
      token,
      user: {
        uid: user.uid,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
        is_admin: isAdmin,
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
      .prepare(
        "SELECT uid, username, avatar, bio FROM users WHERE username LIKE ? LIMIT 20",
      )
      .all(`%${q}%`);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users/:uid", authenticateToken, (req, res) => {
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE uid = ?")
      .get(req.params.uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendsCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'",
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

      db.prepare("UPDATE users SET username = ? WHERE uid = ?").run(
        username,
        req.user.uid,
      );
    }

    if (bio !== undefined) {
      db.prepare("UPDATE users SET bio = ? WHERE uid = ?").run(
        bio,
        req.user.uid,
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/users/avatar",
  authenticateToken,
  uploadLimiter,
  upload.single("avatar"),
  (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const avatarUrl = `/uploads/${req.file.filename}`;
      db.prepare("UPDATE users SET avatar = ? WHERE uid = ?").run(
        avatarUrl,
        req.user.uid,
      );

      res.json({ avatar: avatarUrl });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// ============ POST ROUTES ============
app.get("/api/posts", authenticateToken, (req, res) => {
  try {
    const posts = db
      .prepare(
        `SELECT p.*, u.username, u.avatar as author_avatar 
         FROM posts p 
         JOIN users u ON p.author_id = u.uid 
         ORDER BY p.created_at DESC LIMIT 50`,
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
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/posts",
  authenticateToken,
  uploadLimiter,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "file", maxCount: 1 },
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
      // Generic file: route by mimetype
      if (req.files?.file?.[0]) {
        const f = req.files.file[0];
        const url = `/uploads/${f.filename}`;
        if (f.mimetype.startsWith("image/")) imageUrl = url;
        else if (f.mimetype.startsWith("video/")) videoUrl = url;
        else videoUrl = url; // fallback: store in video field as generic media link
      }

      // pollData may be JSON string from FormData
      let pollJson = "";
      if (pollData) {
        try {
          const parsed =
            typeof pollData === "string" ? JSON.parse(pollData) : pollData;
          pollJson = JSON.stringify(parsed);
        } catch {
          pollJson = "";
        }
      }

      const result = db
        .prepare(
          `INSERT INTO posts (author_id, content, image, video, poll_data, likes) 
           VALUES (?, ?, ?, ?, ?, '[]')`,
        )
        .run(req.user.uid, content || "", imageUrl, videoUrl, pollJson);

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Poll voting
app.post("/api/posts/:id/vote", authenticateToken, (req, res) => {
  try {
    const { optionIndex } = req.body;
    const post = db
      .prepare("SELECT poll_data FROM posts WHERE id = ?")
      .get(req.params.id);
    if (!post || !post.poll_data) {
      return res.status(404).json({ error: "Опрос не найден" });
    }
    const poll = JSON.parse(post.poll_data);
    if (
      !poll.options ||
      optionIndex < 0 ||
      optionIndex >= poll.options.length
    ) {
      return res.status(400).json({ error: "Некорректный вариант" });
    }
    poll.voters = poll.voters || {};
    if (poll.voters[req.user.uid] !== undefined) {
      return res.status(400).json({ error: "Вы уже голосовали" });
    }
    // option may be string or {text, votes}
    if (typeof poll.options[optionIndex] === "string") {
      poll.options = poll.options.map((o) =>
        typeof o === "string" ? { text: o, votes: 0 } : o,
      );
    }
    poll.options[optionIndex].votes =
      (poll.options[optionIndex].votes || 0) + 1;
    poll.voters[req.user.uid] = optionIndex;
    db.prepare("UPDATE posts SET poll_data = ? WHERE id = ?").run(
      JSON.stringify(poll),
      req.params.id,
    );
    res.json({ poll });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/posts/:id/like", authenticateToken, (req, res) => {
  try {
    const post = db
      .prepare("SELECT likes FROM posts WHERE id = ?")
      .get(req.params.id);

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

    db.prepare("UPDATE posts SET likes = ? WHERE id = ?").run(
      JSON.stringify(likes),
      req.params.id,
    );

    res.json({ likes });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/posts/:id/comment",
  authenticateToken,
  uploadLimiter,
  upload.single("file"),
  (req, res) => {
    try {
      const { text } = req.body;
      let fileUrl = "";
      let fileType = "";
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
        if (req.file.mimetype.startsWith("image/")) fileType = "image";
        else if (req.file.mimetype.startsWith("video/")) fileType = "video";
        else fileType = "file";
      }

      if (!text && !fileUrl) {
        return res.status(400).json({ error: "Пустой комментарий" });
      }

      const result = db
        .prepare(
          "INSERT INTO comments (post_id, author_id, text, file_url, file_type) VALUES (?, ?, ?, ?, ?)",
        )
        .run(req.params.id, req.user.uid, text || "", fileUrl, fileType);

      db.prepare(
        "UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?",
      ).run(req.params.id);

      const post = db
        .prepare("SELECT author_id FROM posts WHERE id = ?")
        .get(req.params.id);
      if (post && post.author_id !== req.user.uid) {
        db.prepare(
          "INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, 'comment', ?)",
        ).run(post.author_id, req.user.uid, `commented on your post`);
      }

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Comment error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

app.get("/api/posts/:id/comments", authenticateToken, (req, res) => {
  try {
    const comments = db
      .prepare(
        `SELECT c.*, u.username, u.avatar 
         FROM comments c 
         JOIN users u ON c.author_id = u.uid 
         WHERE c.post_id = ? 
         ORDER BY c.created_at ASC`,
      )
      .all(req.params.id);

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/posts/:id", authenticateToken, (req, res) => {
  try {
    const post = db
      .prepare("SELECT author_id FROM posts WHERE id = ?")
      .get(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    const me = db
      .prepare("SELECT is_admin FROM users WHERE uid = ?")
      .get(req.user.uid);
    const isAdmin = me?.is_admin === 1;

    if (post.author_id !== req.user.uid && !isAdmin)
      return res.status(403).json({ error: "Not your post" });

    db.prepare("DELETE FROM comments WHERE post_id = ?").run(req.params.id);
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);

    res.json({
      success: true,
      deleted_by_admin: isAdmin && post.author_id !== req.user.uid,
    });
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
         ORDER BY created_at DESC`,
      )
      .all(`%${req.user.uid}%`);

    res.json(
      conversations.map((c) => ({
        id: c.id,
        type: c.type,
        participants: JSON.parse(c.participants),
        name: c.name,
        created_at: c.created_at,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete conversation for the current user (removes from participants;
// when no participants remain, the conversation and its messages are purged).
app.delete("/api/messages/conversations/:id", authenticateToken, (req, res) => {
  try {
    const conv = db
      .prepare("SELECT * FROM conversations WHERE id = ?")
      .get(req.params.id);
    if (!conv) return res.status(404).json({ error: "Чат не найден" });

    const parts = JSON.parse(conv.participants).filter(
      (uid) => uid !== req.user.uid,
    );
    if (parts.length === 0) {
      db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(
        req.params.id,
      );
      db.prepare("DELETE FROM conversations WHERE id = ?").run(req.params.id);
    } else {
      db.prepare("UPDATE conversations SET participants = ? WHERE id = ?").run(
        JSON.stringify(parts),
        req.params.id,
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Delete conv error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/messages/conversation", authenticateToken, (req, res) => {
  try {
    const { participantId, participantIds, name } = req.body;

    // Build participant list (supports single or multiple)
    let parts = [req.user.uid];
    if (Array.isArray(participantIds)) {
      parts = parts.concat(participantIds);
    } else if (participantId) {
      parts.push(participantId);
    }
    parts = [...new Set(parts)].sort();

    if (parts.length < 2) {
      return res.status(400).json({ error: "Нужен хотя бы один участник" });
    }

    const isGroup = !!name || parts.length > 2;

    // Check if personal conversation already exists
    if (!isGroup) {
      const existing = db
        .prepare(
          "SELECT id FROM conversations WHERE type = 'personal' AND participants = ?",
        )
        .get(JSON.stringify(parts));

      if (existing) {
        return res.json({ success: true, id: existing.id });
      }
    }

    const result = db
      .prepare(
        "INSERT INTO conversations (type, participants, name) VALUES (?, ?, ?)",
      )
      .run(isGroup ? "group" : "personal", JSON.stringify(parts), name || "");

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error("Conversation error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add participant to conversation; auto-converts personal -> group
app.post(
  "/api/messages/conversation/:id/participants",
  authenticateToken,
  (req, res) => {
    try {
      const { uid, name } = req.body;
      const conv = db
        .prepare("SELECT * FROM conversations WHERE id = ?")
        .get(req.params.id);
      if (!conv) return res.status(404).json({ error: "Чат не найден" });

      const parts = JSON.parse(conv.participants);
      if (!parts.includes(req.user.uid)) {
        return res.status(403).json({ error: "Нет доступа" });
      }
      if (parts.includes(uid)) {
        return res.status(400).json({ error: "Уже в чате" });
      }

      const newParts = [...new Set([...parts, uid])].sort();
      const newType = newParts.length > 2 ? "group" : conv.type;

      // Auto-name group if converting and no name yet
      let newName = conv.name;
      if (newType === "group" && !newName) {
        newName = name || "Новая группа";
      }

      db.prepare(
        "UPDATE conversations SET participants = ?, type = ?, name = ? WHERE id = ?",
      ).run(JSON.stringify(newParts), newType, newName, req.params.id);

      res.json({
        success: true,
        type: newType,
        participants: newParts,
        name: newName,
      });
    } catch (error) {
      console.error("Add participant error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

app.get("/api/messages/:conversationId", authenticateToken, (req, res) => {
  try {
    const messages = db
      .prepare(
        `SELECT m.*, u.username, u.avatar 
         FROM messages m 
         JOIN users u ON m.sender_id = u.uid 
         WHERE m.conversation_id = ? 
         ORDER BY m.created_at ASC`,
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
  uploadLimiter,
  upload.single("file"),
  (req, res) => {
    try {
      const { text } = req.body;

      let fileUrl = "";
      let fileType = "";

      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
        if (req.file.mimetype.startsWith("image/")) fileType = "image";
        else if (req.file.mimetype.startsWith("video/")) fileType = "video";
        else if (req.file.mimetype.startsWith("audio/")) fileType = "audio";
        else fileType = "file";
      }

      const result = db
        .prepare(
          "INSERT INTO messages (conversation_id, sender_id, text, file_url, file_type) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          req.params.conversationId,
          req.user.uid,
          text || "",
          fileUrl,
          fileType,
        );

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },
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
         AND f.status = 'accepted'`,
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
         WHERE f.friend_id = ? AND f.status = 'pending'`,
      )
      .all(req.user.uid);

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/friends/status/:friendId", authenticateToken, (req, res) => {
  try {
    const row = db
      .prepare(
        `SELECT user_id, status FROM friendships
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      )
      .get(
        req.user.uid,
        req.params.friendId,
        req.params.friendId,
        req.user.uid,
      );
    if (!row) return res.json({ status: "none" });
    if (row.status === "accepted") return res.json({ status: "friends" });
    if (row.user_id === req.user.uid) return res.json({ status: "sent" });
    return res.json({ status: "incoming" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/friends/request", authenticateToken, (req, res) => {
  try {
    const { friendId } = req.body;

    const existing = db
      .prepare(
        "SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      )
      .get(req.user.uid, friendId, friendId, req.user.uid);

    if (existing) {
      return res.status(400).json({ error: "Request already exists" });
    }

    db.prepare(
      "INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')",
    ).run(req.user.uid, friendId);

    db.prepare(
      "INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, 'friend_request', ?)",
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
      "UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?",
    ).run(friendId, req.user.uid);

    db.prepare(
      "INSERT INTO notifications (recipient_id, sender_id, type, message) VALUES (?, ?, 'friend_accepted', ?)",
    ).run(friendId, req.user.uid, "accepted your friend request");

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/friends/:friendId", authenticateToken, (req, res) => {
  try {
    db.prepare(
      "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
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
         ORDER BY s.created_at DESC`,
      )
      .all();

    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/stories",
  authenticateToken,
  uploadLimiter,
  upload.single("media"),
  (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const mediaUrl = `/uploads/${req.file.filename}`;
      const mediaType = req.file.mimetype.startsWith("image/")
        ? "image"
        : "video";
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const result = db
        .prepare(
          "INSERT INTO stories (user_id, media_url, media_type, expires_at) VALUES (?, ?, ?, ?)",
        )
        .run(req.user.uid, mediaUrl, mediaType, expiresAt);

      res.json({
        success: true,
        id: result.lastInsertRowid,
        expires_at: expiresAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },
);

app.delete("/api/stories/:id", authenticateToken, (req, res) => {
  try {
    const story = db
      .prepare("SELECT user_id FROM stories WHERE id = ?")
      .get(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });

    const me = db
      .prepare("SELECT is_admin FROM users WHERE uid = ?")
      .get(req.user.uid);
    if (story.user_id !== req.user.uid && me?.is_admin !== 1) {
      return res.status(403).json({ error: "Forbidden" });
    }
    db.prepare("DELETE FROM stories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Hourly cleanup of expired stories (in addition to lazy cleanup on read)
setInterval(
  () => {
    try {
      const result = db
        .prepare("DELETE FROM stories WHERE expires_at < datetime('now')")
        .run();
      if (result.changes > 0) {
        console.log(`🧹 Removed ${result.changes} expired stories`);
      }
    } catch (e) {
      console.error("Story cleanup error:", e);
    }
  },
  60 * 60 * 1000,
);

// ============ NOTIFICATION ROUTES ============
app.get("/api/notifications", authenticateToken, (req, res) => {
  try {
    const notifications = db
      .prepare(
        `SELECT n.*, u.username, u.avatar 
         FROM notifications n 
         JOIN users u ON n.sender_id = u.uid 
         WHERE n.recipient_id = ? 
         ORDER BY n.created_at DESC LIMIT 50`,
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
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/notifications/read", authenticateToken, (req, res) => {
  try {
    db.prepare(
      "UPDATE notifications SET is_read = 1 WHERE recipient_id = ?",
    ).run(req.user.uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ FEED TIMER ROUTES ============
app.get("/api/feed-timer", authenticateToken, (req, res) => {
  try {
    // Premium users are never locked
    if (hasPremium(req.user.uid)) {
      return res.json({
        sessionTime: 0,
        isLocked: false,
        lockUntil: null,
        premium: true,
      });
    }

    let timer = db
      .prepare("SELECT * FROM feed_timers WHERE user_id = ?")
      .get(req.user.uid);

    if (!timer) {
      db.prepare(
        "INSERT INTO feed_timers (user_id, session_time, is_locked) VALUES (?, 0, 0)",
      ).run(req.user.uid);
      return res.json({ sessionTime: 0, isLocked: false, lockUntil: null });
    }

    // Check if lock expired
    if (
      timer.is_locked &&
      timer.lock_until &&
      new Date(timer.lock_until) < new Date()
    ) {
      db.prepare(
        "UPDATE feed_timers SET is_locked = 0, lock_until = NULL, session_time = 0 WHERE user_id = ?",
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
      req.user.uid,
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
      "UPDATE feed_timers SET is_locked = 1, lock_until = ? WHERE user_id = ?",
    ).run(lockUntil, req.user.uid);
    res.json({ success: true, lockUntil });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/feed-timer/reset", authenticateToken, (req, res) => {
  try {
    db.prepare(
      "UPDATE feed_timers SET session_time = 0, is_locked = 0, lock_until = NULL WHERE user_id = ?",
    ).run(req.user.uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ PREMIUM ROUTES ============
app.get("/api/premium/status", authenticateToken, (req, res) => {
  try {
    const sub = db
      .prepare("SELECT expires_at FROM subscriptions WHERE user_id = ?")
      .get(req.user.uid);
    if (!sub) {
      return res.json({ isPremium: false, expiresAt: null });
    }
    const isPremium = new Date(sub.expires_at) > new Date();
    res.json({ isPremium, expiresAt: sub.expires_at });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/premium/activate", authenticateToken, (req, res) => {
  try {
    const { phone } = req.body;
    // Simple validation: payment phone must match the configured number
    const PAYMENT_PHONE = "+79999099549";
    const norm = String(phone || "").replace(/[^\d+]/g, "");
    if (norm !== PAYMENT_PHONE) {
      return res.status(400).json({
        error: `Перевод должен быть на ${PAYMENT_PHONE}`,
      });
    }

    // Activate for 30 days
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const existing = db
      .prepare("SELECT user_id FROM subscriptions WHERE user_id = ?")
      .get(req.user.uid);

    if (existing) {
      db.prepare(
        "UPDATE subscriptions SET expires_at = ?, activated_at = datetime('now') WHERE user_id = ?",
      ).run(expiresAt, req.user.uid);
    } else {
      db.prepare(
        "INSERT INTO subscriptions (user_id, expires_at) VALUES (?, ?)",
      ).run(req.user.uid, expiresAt);
    }

    // Reset any current lock
    db.prepare(
      "UPDATE feed_timers SET session_time = 0, is_locked = 0, lock_until = NULL WHERE user_id = ?",
    ).run(req.user.uid);

    res.json({ success: true, expiresAt });
  } catch (error) {
    console.error("Premium activate error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ CHALLENGE ROUTES ============
// User-created exercise prompts that get randomly assigned to others
app.get("/api/challenges/random", authenticateToken, (req, res) => {
  try {
    const ch = db
      .prepare(
        `SELECT c.id, c.text, c.emoji, c.author_id, u.username AS author_name
         FROM challenges c
         LEFT JOIN users u ON u.uid = c.author_id
         WHERE c.author_id != ?
         ORDER BY RANDOM() LIMIT 1`,
      )
      .get(req.user.uid);
    res.json({ challenge: ch || null });
  } catch (error) {
    console.error("Random challenge error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/challenges", authenticateToken, (req, res) => {
  try {
    const { text, emoji } = req.body;
    const cleanText = String(text || "").trim();
    if (cleanText.length < 3 || cleanText.length > 200) {
      return res.status(400).json({ error: "Задание от 3 до 200 символов" });
    }
    const cleanEmoji = String(emoji || "💪").slice(0, 8);
    const result = db
      .prepare(
        "INSERT INTO challenges (author_id, text, emoji) VALUES (?, ?, ?)",
      )
      .run(req.user.uid, cleanText, cleanEmoji);
    res.json({
      id: result.lastInsertRowid,
      text: cleanText,
      emoji: cleanEmoji,
    });
  } catch (error) {
    console.error("Create challenge error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/challenges/mine", authenticateToken, (req, res) => {
  try {
    const list = db
      .prepare(
        "SELECT id, text, emoji, created_at FROM challenges WHERE author_id = ? ORDER BY id DESC LIMIT 50",
      )
      .all(req.user.uid);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/challenges/:id", authenticateToken, (req, res) => {
  try {
    const ch = db
      .prepare("SELECT author_id FROM challenges WHERE id = ?")
      .get(req.params.id);
    if (!ch) return res.status(404).json({ error: "Not found" });
    const me = db
      .prepare("SELECT is_admin FROM users WHERE uid = ?")
      .get(req.user.uid);
    if (ch.author_id !== req.user.uid && me?.is_admin !== 1) {
      return res.status(403).json({ error: "Forbidden" });
    }
    db.prepare("DELETE FROM challenges WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ============ GLOBAL ERROR HANDLERS ============
// 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Multer & generic error handler — never leak stack traces to clients
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ error: "Файл слишком большой (макс 50 МБ)" });
    }
    return res.status(400).json({ error: "Ошибка загрузки файла" });
  }
  if (err && err.message === "Недопустимый тип файла") {
    return res.status(415).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lis API server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
});
