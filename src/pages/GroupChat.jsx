import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../services/upload";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

// 🔧 Хелпер для парсинга участников — используем везде!
function parseParticipants(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export default function GroupChat() {
  const { groupId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 🔷 Загрузка группы
  useEffect(() => {
    if (!groupId || !currentUser) return;
    loadGroup();
  }, [groupId, currentUser]);

  // 🔧 ИСПРАВЛЕНО: добавлен заголовок авторизации
  async function loadGroup() {
    try {
      setLoading(true);
      const headers = { "X-User-Id": currentUser.uid };
      const res = await fetch(`/api/groups/${groupId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Группа не найдена");

      const participants = parseParticipants(data.participants);
      setGroup({ ...data, participants });
      loadMessages();
    } catch (error) {
      console.error("Error loading group:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // 🔧 ИСПРАВЛЕНО: добавлен заголовок авторизации
  async function loadMessages() {
    try {
      const headers = { "X-User-Id": currentUser.uid };
      const res = await fetch(`/api/groups/${groupId}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  // 🔷 Автопрокрутка
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔷 Поиск пользователей
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        let q = searchQuery.trim();
        if (q.startsWith("@")) q = q.slice(1);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const users = await res.json();
          const currentParticipants = parseParticipants(group?.participants);
          const filtered = users.filter(
            (u) =>
              u.uid !== currentUser.uid && !currentParticipants.includes(u.uid),
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, group?.participants, currentUser.uid]);

  // 🔷 Отправка сообщения
  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !groupId || sending) return;
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
      const headers = {
        "Content-Type": "application/json",
        "X-User-Id": currentUser.uid,
      };
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: newMessage.trim(),
          fileUrl,
          fileType,
          fileName,
          senderId: currentUser.uid,
          username: currentUser.username,
          avatar: currentUser.avatar,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([...messages, data.message]);
        setNewMessage("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert(data.error || "Ошибка отправки");
      }
    } catch (error) {
      console.error("Error sending:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setSending(false);
    }
  };

  // 🔷 УДАЛЕНИЕ СООБЩЕНИЯ
  const handleDeleteMessage = async (messageId, senderId) => {
    if (senderId !== currentUser.uid) {
      alert("❌ Можно удалять только свои сообщения!");
      return;
    }
    if (!confirm("Удалить это сообщение?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/messages/${messageId}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });
      if (res.ok) {
        setMessages(messages.filter((m) => m.id !== messageId));
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Ошибка удаления");
    }
  };

  // 🔷 Добавление участников
  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      setShowAddParticipants(false);
      return;
    }
    try {
      const currentParticipants = parseParticipants(group.participants);
      const newParticipants = [
        ...new Set([...currentParticipants, ...selectedUsers]),
      ];

      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ participants: newParticipants }),
      });
      if (res.ok) {
        await fetch(`/api/groups/${groupId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": currentUser.uid,
          },
          body: JSON.stringify({
            text: `➕ ${currentUser.username} добавил участников: ${selectedUsers.length}`,
            senderId: "system",
            username: "Система",
          }),
        });
        setGroup({ ...group, participants: newParticipants });
        setSelectedUsers([]);
        setSearchQuery("");
        setShowAddParticipants(false);
        loadMessages();
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка");
      }
    } catch (error) {
      console.error("Error adding participants:", error);
      alert("Ошибка: " + error.message);
    }
  };

  const toggleUser = (uid) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTextWithLinks = (text) => {
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
  };

  const getFileIcon = (type) => {
    if (!type) return "📄";
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📕";
    return "📎";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="text-center text-white/80">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <p>Загрузка группы...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="text-center text-white/80">
          <p className="text-xl mb-4">Группа не найдена</p>
          <button
            onClick={() => navigate("/messages")}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl"
          >
            ← Вернуться к чатам
          </button>
        </div>
      </div>
    );
  }

  const participants = parseParticipants(group.participants);
  const isMember = participants.includes(currentUser.uid);

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="text-center text-white/80">
          <p className="text-xl mb-4">❌ Вы не участник этой группы</p>
          <button
            onClick={() => navigate("/messages")}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl"
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
      {/* 🔷 ШАПКА ГРУППЫ */}
      <div className="bg-gradient-to-b from-purple-600 via-purple-300 to-white border-b border-purple-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <span className="text-2xl text-white">←</span>
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold cursor-pointer">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={group.name}
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <span>{(group?.name?.charAt(0) || "G").toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">{group.name || "Группа"}</h2>
            <p className="text-xs text-white/80">
              {participants.length} участник
              {participants.length === 1
                ? ""
                : participants.length < 5
                  ? "а"
                  : "ов"}
            </p>
          </div>
          <button
            onClick={() => setShowAddParticipants(true)}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-2xl font-bold"
            title="Добавить участников"
          >
            +
          </button>
        </div>
      </div>

      {/* 🔷 СООБЩЕНИЯ */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 min-h-[60vh]">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-white/80">
            <p className="text-lg mb-2">Нет сообщений</p>
            <p className="text-sm">Будьте первым кто напишет!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMy = msg.senderId === currentUser?.uid;
            const isSystem = msg.senderId === "system";
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-white/20 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }
            return (
              <div
                key={msg.id}
                className={`flex ${isMy ? "justify-end" : "justify-start"} relative group`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMy ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none shadow-lg" : "bg-white/90 text-gray-900 rounded-bl-none shadow-md"}`}
                >
                  {isMy && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id, msg.senderId)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-lg z-10"
                      title="Удалить сообщение"
                    >
                      ×
                    </button>
                  )}
                  {!isMy && msg.username && msg.senderId && (
                    <Link
                      to={`/profile/${msg.senderId}`}
                      className="text-purple-600 hover:text-purple-800 text-xs font-semibold hover:underline block mb-1"
                    >
                      @{msg.username}
                    </Link>
                  )}
                  {msg.fileUrl && msg.fileType?.startsWith("image/") && (
                    <img
                      src={msg.fileUrl}
                      alt="file"
                      className="rounded-lg mb-2 max-w-full cursor-pointer"
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
                        className={`flex items-center gap-2 p-3 rounded-lg mb-2 text-sm ${isMy ? "bg-white/20" : "bg-purple-50"}`}
                      >
                        <span className="text-xl">
                          {getFileIcon(msg.fileType)}
                        </span>
                        <span className="break-all">
                          {msg.fileName || "Файл"}
                        </span>
                      </a>
                    )}
                  {msg.text && (
                    <p className="break-words whitespace-pre-wrap">
                      {renderTextWithLinks(msg.text)}
                    </p>
                  )}
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
                className="text-red-500 font-bold"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="p-2 hover:bg-purple-100 rounded-full cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-2xl">📎</span>
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-full focus:outline-none focus:border-purple-500 text-gray-800"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !selectedFile) || sending}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg disabled:opacity-50"
            >
              {sending ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      </div>

      {/* 🔷 МОДАЛКА: ДОБАВИТЬ УЧАСТНИКОВ */}
      {showAddParticipants && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddParticipants(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                ➕ Добавить участников
              </h2>
              <button
                onClick={() => setShowAddParticipants(false)}
                className="p-2 hover:bg-purple-100 rounded-full"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Поиск по @нику..."
              className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-gray-800 mb-4"
            />
            {selectedUsers.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 rounded-xl">
                <p className="text-sm font-semibold text-purple-700 mb-2">
                  Выбрано: {selectedUsers.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchResults
                    .filter((u) => selectedUsers.includes(u.uid))
                    .map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-purple-200"
                      >
                        <span className="text-sm">@{user.username}</span>
                        <button
                          onClick={() => toggleUser(user.uid)}
                          className="text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {searchResults.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => toggleUser(user.uid)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left ${selectedUsers.includes(user.uid) ? "bg-purple-100 border-2 border-purple-500" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                    loading="lazy"
                  />
                  <span className="font-semibold text-gray-800">
                    @{user.username}
                  </span>
                  {selectedUsers.includes(user.uid) && (
                    <span className="ml-auto text-purple-600">✓</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleAddParticipants}
              disabled={selectedUsers.length === 0}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50"
            >
              Добавить ({selectedUsers.length})
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
