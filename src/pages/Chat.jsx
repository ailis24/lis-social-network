import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserById,
  getMessages,
  addMessage,
  getConversations,
  createConversation,
  updateConversation,
  deleteMessage,
} from "../services/ydb";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ──────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return "";
  const date = ts instanceof Date ? ts : new Date(ts);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTextWithLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-300 underline break-all"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function getFileIcon(type) {
  if (!type) return "📄";
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📕";
  return "📎";
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───────────────────────────────────────────────────

export default function Chat() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 🔷 Загрузка собеседника
  useEffect(() => {
    const getUser = async () => {
      if (!userId) return;
      try {
        const user = await getUserById(userId);
        if (user) setOtherUser({ id: user.uid, ...user });
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getUser();
  }, [userId]);

  // 🔷 Поиск/создание разговора
  useEffect(() => {
    if (!userId || !currentUser) return;
    const findOrCreateConversation = async () => {
      try {
        const conversations = await getConversations(currentUser.uid);
        let existingConv = conversations.find((conv) => {
          const participants = conv.participants || [];
          return (
            participants.includes(userId) &&
            participants.includes(currentUser.uid)
          );
        });
        if (existingConv) {
          setConversationId(existingConv.conversationId || existingConv.id);
        } else {
          const result = await createConversation({
            participants: [currentUser.uid, userId].sort(),
            lastMessage: "",
            lastMessageBy: "",
          });
          setConversationId(result.conversationId);
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    };
    findOrCreateConversation();
  }, [userId, currentUser]);

  // 🔷 Загрузка сообщений
  useEffect(() => {
    if (!conversationId) return;
    let intervalId;
    const loadMessages = async () => {
      try {
        const msgs = await getMessages(conversationId);
        setMessages(msgs);
        setLoading(false);
      } catch (error) {
        console.error("Error loading messages:", error);
        setLoading(false);
      }
    };
    loadMessages();
    intervalId = setInterval(loadMessages, 3000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [conversationId]);

  // 🔷 Автопрокрутка
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔷 Отправка сообщения
  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !conversationId || sending)
      return;
    setSending(true);
    try {
      let fileUrl = "",
        fileType = "",
        fileName = "";
      if (selectedFile) {
        const folder = selectedFile.type.startsWith("image/")
          ? "photos"
          : selectedFile.type.startsWith("video/")
            ? "videos"
            : "files";
        fileUrl = await uploadFile(selectedFile, currentUser.uid, folder);
        fileType = selectedFile.type;
        fileName = selectedFile.name;
      }
      await addMessage(conversationId, {
        senderId: currentUser.uid,
        text: newMessage.trim(),
        fileUrl,
        fileType,
        fileName,
        read: false,
      });
      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (conversationId) {
        await updateConversation(conversationId, {
          lastMessage:
            newMessage.trim() ||
            (fileName ? `${getFileIcon(fileType)} ${fileName}` : ""),
          lastMessageBy: currentUser.uid,
        });
      }
    } catch (error) {
      console.error("Error sending:", error);
      alert("Ошибка отправки: " + error.message);
    } finally {
      setSending(false);
    }
  };

  // 🔷 🔴 УДАЛЕНИЕ СООБЩЕНИЯ (только своё)
  const handleDeleteMessage = async (messageId, senderId) => {
    if (senderId !== currentUser.uid) {
      alert("❌ Можно удалять только свои сообщения!");
      return;
    }
    if (!confirm("Удалить это сообщение?")) return;
    try {
      await deleteMessage(conversationId, messageId);
      setMessages(messages.filter((m) => (m.id || m.messageId) !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Ошибка: " + error.message);
    }
  };

  // 🔷 Обработка файла
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const limits = {
        "image/": 10,
        "video/": 100,
        "application/": 50,
        "audio/": 20,
      };
      let maxMB = 10;
      for (const [type, mb] of Object.entries(limits)) {
        if (file.type.startsWith(type)) {
          maxMB = mb;
          break;
        }
      }
      if (file.size > maxMB * 1024 * 1024) {
        alert(`Файл слишком большой! Максимум ${maxMB}MB`);
        return;
      }
      setSelectedFile(file);
    }
  };

  // 🔷 Эмодзи
  const handleEmojiSelect = (emoji) => setNewMessage((prev) => prev + emoji);

  // 🔷 Простая панель эмодзи
  const SimpleEmojiPicker = () => {
    const emojis = [
      "😀",
      "😃",
      "😄",
      "😁",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "👋",
      "🤚",
      "🖐",
      "✋",
      "👍",
      "👎",
      "👊",
      "👏",
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🎾",
      "🏐",
      "🎉",
      "🎊",
      "💖",
      "💕",
      "💗",
      "💓",
      "💝",
      "✨",
      "🔥",
      "⭐",
      "🌟",
      "💫",
      "🦄",
      "🌈",
      "☀️",
      "🌙",
      "⭐",
    ];
    return (
      <div className="absolute bottom-full right-0 mb-2 w-72 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-200 p-3 z-50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Эмодзи</span>
          <button
            onClick={() => setShowEmojiPicker(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => {
                handleEmojiSelect(emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl p-1 hover:bg-purple-100 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // 🔷 Если нет собеседника
  if (!otherUser && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="text-center text-purple-700">
          <p className="text-xl mb-2">Собеседник не найден</p>
          <button
            onClick={() => navigate("/messages")}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl"
          >
            ← Вернуться к чатам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-24">
      <Header />

      {/* 🔷 ШАПКА ЧАТА */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* ← Назад в ленту */}
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-purple-100 rounded-full transition-colors"
            title="Вернуться в ленту"
          >
            <span className="text-2xl">←</span>
          </button>
          {/* 🦊 Логотип Lis ПО ЦЕНТРУ */}
          <h1
            className="text-3xl font-bold cursor-pointer"
            onClick={() => navigate("/")}
            style={{
              fontFamily: "'Parisienne', 'Brush Script MT', cursive",
              background:
                "linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 50%, #ffb4b4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
              letterSpacing: "2px",
            }}
          >
            Lis
          </h1>
          {/* 🔍 Поиск */}
          <button
            className="p-2 hover:bg-purple-100 rounded-full transition-colors"
            title="Поиск по сообщениям"
          >
            <span className="text-xl">🔍</span>
          </button>
        </div>
        {/* Информация о собеседнике */}
        {otherUser && (
          <div className="px-4 pb-3 flex items-center gap-3">
            {/* 🔗 КЛИКАБЕЛЬНЫЙ АВАТАР */}
            <Link to={`/profile/${otherUser.id}`} className="relative">
              <img
                src={
                  otherUser.avatar ||
                  "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                }
                alt={otherUser.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-300"
                loading="lazy"
              />
              {otherUser.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </Link>
            <div>
              {/* 🔗 КЛИКАБЕЛЬНОЕ ИМЯ */}
              <Link
                to={`/profile/${otherUser.id}`}
                className="font-bold text-gray-900 hover:text-purple-600 transition-colors hover:underline"
              >
                @{otherUser.username}
              </Link>
              <p className="text-xs text-gray-500">
                {otherUser.online ? "онлайн" : "офлайн"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 🔷 СООБЩЕНИЯ */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 min-h-[60vh]">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-purple-700 text-lg mb-2">Нет сообщений</p>
            <p className="text-purple-500">
              Напишите {otherUser?.username} первым!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMy = msg.senderId === currentUser?.uid;
            const messageId = msg.id || msg.messageId;
            return (
              <div
                key={messageId}
                className={`flex ${isMy ? "justify-end" : "justify-start"} message-bubble relative group`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMy ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none shadow-lg" : "bg-white/90 text-gray-900 rounded-bl-none shadow-md border border-purple-100"}`}
                >
                  {/* 🔴 КНОПКА УДАЛЕНИЯ (только свои сообщения) */}
                  {isMy && (
                    <button
                      onClick={() =>
                        handleDeleteMessage(messageId, msg.senderId)
                      }
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-lg z-10"
                      title="Удалить сообщение"
                    >
                      ×
                    </button>
                  )}

                  {/* 🔗 КЛИКАБЕЛЬНЫЙ ЮЗЕРНЕЙМ (в чужих сообщениях) */}
                  {!isMy && msg.username && (
                    <Link
                      to={`/profile/${msg.senderId}`}
                      className="text-purple-600 hover:text-purple-800 text-xs font-semibold hover:underline block mb-1"
                    >
                      @{msg.username}
                    </Link>
                  )}

                  {/* Файлы */}
                  {msg.fileUrl && msg.fileType?.startsWith("image/") && (
                    <img
                      src={msg.fileUrl}
                      alt="file"
                      className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(msg.fileUrl, "_blank")}
                      loading="lazy"
                    />
                  )}
                  {msg.fileUrl && msg.fileType?.startsWith("video/") && (
                    <video
                      src={msg.fileUrl}
                      controls
                      className="rounded-lg mb-2 max-w-full"
                      preload="metadata"
                    />
                  )}
                  {msg.fileUrl &&
                    !msg.fileType?.startsWith("image/") &&
                    !msg.fileType?.startsWith("video/") && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-3 rounded-lg mb-2 text-sm transition-colors ${isMy ? "bg-white/20 hover:bg-white/30" : "bg-purple-50 hover:bg-purple-100"}`}
                      >
                        <span className="text-xl">
                          {getFileIcon(msg.fileType)}
                        </span>
                        <span className="break-all">
                          {msg.fileName || "Файл"}
                        </span>
                      </a>
                    )}

                  {/* Текст */}
                  {msg.text && (
                    <p className="break-words whitespace-pre-wrap">
                      {renderTextWithLinks(msg.text)}
                    </p>
                  )}

                  {/* Время */}
                  <p
                    className={`text-xs mt-1 text-right ${isMy ? "text-purple-100" : "text-gray-400"}`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 🔷 ПОЛЕ ВВОДА */}
      <div className="fixed bottom-20 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-purple-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {selectedFile && (
            <div className="mb-2 flex items-center justify-between bg-purple-50 p-2 rounded-lg">
              <span className="text-sm truncate flex items-center gap-2 text-gray-800">
                <span className="text-lg">
                  {getFileIcon(selectedFile.type)}
                </span>
                {selectedFile.name}
              </span>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-500 hover:text-red-600 font-bold"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 relative">
            {/* 📎 Прикрепить */}
            <label
              className="p-2 hover:bg-purple-100 rounded-full cursor-pointer transition-colors"
              title="Прикрепить файл"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-2xl">📎</span>
            </label>
            {/* Поле ввода */}
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-full focus:outline-none focus:border-purple-500 text-gray-800 placeholder-gray-500"
              disabled={sending}
            />
            {/* 😊 Эмодзи */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-purple-100 rounded-full transition-colors text-xl"
                title="Эмодзи"
              >
                😊
              </button>
              {showEmojiPicker && <SimpleEmojiPicker />}
            </div>
            {/* ➤ Отправить */}
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !selectedFile) || sending}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "⏳" : "➤"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            📷 Фото (10MB) • 🎬 Видео (100MB) • 📄 Файлы (50MB)
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
