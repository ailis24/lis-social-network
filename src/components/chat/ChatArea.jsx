import { useState, useEffect, useRef } from "react";
import { formatTime } from "../../utils/formatTime";

export default function ChatArea({ selectedChat, onBack }) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function loadMessages() {
    try {
      const endpoint =
        selectedChat.type === "group"
          ? `/api/groups/${selectedChat.groupId}/messages`
          : `/api/conversations/${selectedChat.conversationId}/messages`;

      const res = await fetch(endpoint);
      const data = await res.json();
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  async function handleSend() {
    if (!messageText.trim() || !selectedChat) return;

    try {
      const endpoint =
        selectedChat.type === "group"
          ? `/api/groups/${selectedChat.groupId}/messages`
          : `/api/conversations/${selectedChat.conversationId}/messages`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          text: messageText,
          senderId: currentUser.uid,
          username: currentUser.username,
          avatar: currentUser.avatar,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([...messages, data.message || data]);
        setMessageText("");
      } else {
        alert(data.error || "Ошибка отправки");
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("Ошибка отправки сообщения");
    }
  }

  function handleEmojiSelect(emoji) {
    setMessageText(messageText + emoji);
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/50">
        <div className="text-center text-purple-600">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-xl font-semibold">
            Выберите чат для начала общения
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm h-full">
      {/* Шапка чата */}
      <div className="bg-white/90 backdrop-blur border-b border-purple-200 p-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-purple-100 rounded-full"
        >
          ←
        </button>
        <img
          src={selectedChat.avatar || "/default-avatar.png"}
          alt={selectedChat.name}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">{selectedChat.name}</h3>
          {selectedChat.participants && (
            <p className="text-sm text-purple-600">
              {selectedChat.participants.length} участников
            </p>
          )}
        </div>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 hover:bg-purple-100 rounded-full transition-colors text-2xl"
        >
          😊
        </button>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => {
          const isMyMessage = msg.senderId === currentUser.uid;

          return (
            <div
              key={msg.messageId || index}
              className={`flex ${isMyMessage ? "justify-end" : "justify-start"} message-bubble`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-2xl ${
                  isMyMessage
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none shadow-md"
                }`}
              >
                {!isMyMessage && msg.username && (
                  <p className="text-xs font-semibold text-purple-600 mb-1">
                    {msg.username}
                  </p>
                )}
                <p>{msg.text}</p>
                <span
                  className={`text-xs mt-1 block ${isMyMessage ? "text-purple-100" : "text-gray-500"}`}
                >
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="bg-white/90 backdrop-blur border-t border-purple-200 p-4">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-purple-100 rounded-full transition-colors text-xl">
            📎
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Введите сообщение..."
            className="flex-1 px-4 py-2 bg-purple-50 rounded-full border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-gray-800"
          />
          <button
            onClick={handleSend}
            className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-shadow"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Emoji Panel (правая колонка) */}
      {showEmojiPicker && (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-white/95 backdrop-blur-lg border-l border-purple-200 shadow-2xl overflow-y-auto">
          <div className="p-4 border-b border-purple-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Эмодзи</h3>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-2xl hover:bg-purple-100 rounded p-1"
            >
              ×
            </button>
          </div>
          <EmojiPanel onSelectEmoji={handleEmojiSelect} />
        </div>
      )}
    </div>
  );
}

// Компонент Emoji Panel
function EmojiPanel({ onSelectEmoji }) {
  const emojiCategories = [
    {
      id: "smileys",
      name: "😊",
      emojis: [
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
        "",
        "🥰",
        "😘",
      ],
    },
    {
      id: "people",
      name: "👋",
      emojis: [
        "👋",
        "🤚",
        "🖐",
        "",
        "🖖",
        "👌",
        "🤌",
        "🤏",
        "",
        "🤞",
        "🤟",
        "🤙",
        "👍",
        "",
        "",
        "👊",
      ],
    },
    {
      id: "animals",
      name: "🐶",
      emojis: [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "",
        "🦊",
        "🐻",
        "🐼",
        "",
        "",
        "🦁",
        "🐮",
        "🐷",
        "🐸",
        "🐵",
        "🐔",
      ],
    },
    {
      id: "food",
      name: "🍎",
      emojis: [
        "🍎",
        "",
        "🍊",
        "🍋",
        "🍌",
        "",
        "🍇",
        "🍓",
        "🫐",
        "",
        "🍒",
        "🍑",
        "🍍",
        "🥝",
        "🥥",
        "🥑",
      ],
    },
    {
      id: "activities",
      name: "⚽",
      emojis: [
        "⚽",
        "🏀",
        "🏈",
        "⚾",
        "🎾",
        "🏐",
        "🏉",
        "",
        "🏓",
        "🏸",
        "🥅",
        "⛳",
        "🎯",
        "🎮",
        "🎲",
        "🎨",
      ],
    },
  ];

  const [activeCategory, setActiveCategory] = useState("smileys");

  return (
    <div className="p-4">
      {/* Категории */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {emojiCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`p-2 rounded-lg text-2xl transition-colors flex-shrink-0 ${
              activeCategory === cat.id
                ? "bg-purple-200"
                : "hover:bg-purple-100"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Сетка эмодзи */}
      <div className="grid grid-cols-8 gap-2">
        {emojiCategories
          .find((cat) => cat.id === activeCategory)
          ?.emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => onSelectEmoji(emoji)}
              className="text-2xl p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
      </div>
    </div>
  );
}
