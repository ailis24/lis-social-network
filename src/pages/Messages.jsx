import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { messageService, userService } from "../services";
import { PaperClipIcon } from "@heroicons/react/24/outline";

// ─── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn, onDelete }) => (
  <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 group`}>
    <div className="max-w-xs lg:max-w-md">
      {!isOwn && (
        <Link to={`/profile/${message.sender_id}`} className="text-xs text-purple-400 font-semibold mb-1 hover:underline block">
          @{message.username}
        </Link>
      )}
      <div className={`px-4 py-2.5 rounded-2xl shadow-sm message-bubble ${
        isOwn
          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
          : "bg-white text-gray-800 rounded-bl-sm"
      }`}>
        {message.file_url && (
          <div className="mb-2">
            {message.file_type === "image" ? (
              <img src={message.file_url} alt="Attachment" loading="lazy" className="max-w-full rounded-xl" />
            ) : (
              <video controls className="max-w-full rounded-xl">
                <source src={message.file_url} />
              </video>
            )}
          </div>
        )}
        {message.text && <p className="break-words text-sm">{message.text}</p>}
        <p className={`text-xs mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}>
          {new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {isOwn && (
        <button
          onClick={() => onDelete(message.id)}
          className="text-xs text-red-400 hover:text-red-600 mt-1 hidden group-hover:block"
        >
          Удалить
        </button>
      )}
    </div>
  </div>
);

// ─── Conversation item ─────────────────────────────────────────────────────────
const ConversationItem = ({ conv, isActive, onClick, currentUserId }) => {
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    const otherUid = conv.participants?.find((id) => id !== currentUserId);
    if (otherUid) {
      userService.getProfile(otherUid).then(setOtherUser).catch(() => {});
    }
  }, [conv.id, currentUserId]);

  const name = conv.type === "group" ? conv.name : otherUser?.username || "...";
  const avatar = conv.type === "group" ? null : otherUser?.avatar;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
        isActive ? "bg-purple-100 border border-purple-300" : "hover:bg-gray-50"
      }`}
    >
      {avatar ? (
        <img src={avatar} alt={name} loading="lazy" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
          {conv.type === "group" ? "👥" : name?.charAt(0)?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 truncate">
          {conv.type === "group" ? conv.name : `@${name}`}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {conv.type === "group" ? `${conv.participants?.length} участников` : "Личный чат"}
        </p>
      </div>
    </button>
  );
};

// ─── Main Messages page ────────────────────────────────────────────────────────
export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();
  const pollRef = useRef();

  const loadConversations = async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      return data;
    } catch (err) { console.error(err); return []; }
  };

  const loadMessages = async (convId) => {
    try {
      const data = await messageService.getMessages(convId);
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadConversations().then((convs) => {
      const convParam = searchParams.get("conv");
      if (convParam) {
        const found = convs.find((c) => c.id === parseInt(convParam));
        if (found) setSelectedConv(found);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
    pollRef.current = setInterval(() => loadMessages(selectedConv.id), 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 1) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const results = await userService.search(term);
      setSearchResults(results.filter((u) => u.uid !== user.uid));
      setShowSearch(true);
    } catch (err) { console.error(err); }
  };

  const startConversation = async (uid) => {
    try {
      const data = await messageService.createConversation(uid);
      await loadConversations();
      setSearchTerm("");
      setShowSearch(false);
      setSearchResults([]);
      // select the new conversation
      const convs = await loadConversations();
      const found = convs.find((c) => c.id === data.id);
      if (found) setSelectedConv(found);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMsg.trim() && !attachment) || !selectedConv || sending) return;
    setSending(true);
    try {
      await messageService.sendMessage(selectedConv.id, newMsg, attachment);
      setNewMsg("");
      setAttachment(null);
      await loadMessages(selectedConv.id);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const deleteMessage = async (msgId) => {
    try {
      await messageService.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-8 h-[calc(100vh-4rem)] flex gap-4">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white/90 backdrop-blur rounded-2xl shadow-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg mb-3">Сообщения</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Найти пользователя..."
              className="w-full pl-3 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {showSearch && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm p-3">Никого не найдено</p>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => startConversation(u.uid)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-left"
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-bold">
                          {u.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-800">@{u.username}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-center text-gray-400 text-sm p-4">Нет чатов. Найди пользователя выше!</p>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={selectedConv?.id === conv.id}
                onClick={() => setSelectedConv(conv)}
                currentUserId={user?.uid}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white/90 backdrop-blur rounded-2xl shadow-md flex flex-col overflow-hidden min-w-0">
        {selectedConv ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-pink-500">
              <p className="font-bold text-white text-lg">
                {selectedConv.type === "group" ? `👥 ${selectedConv.name}` : "💬 Личный чат"}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">👋</div>
                  <p>Начни диалог!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user?.uid}
                    onDelete={deleteMessage}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100">
              {attachment && (
                <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2 mb-2 text-sm">
                  <span className="text-purple-600 truncate">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <label className="cursor-pointer text-gray-400 hover:text-purple-500 flex-shrink-0">
                  <PaperClipIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => setAttachment(e.target.files[0])}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Сообщение..."
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                />
                <button
                  type="submit"
                  disabled={sending || (!newMsg.trim() && !attachment)}
                  className="flex-shrink-0 w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50"
                >
                  ↑
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <div className="text-6xl mb-3">💬</div>
              <p className="font-semibold text-gray-500">Выбери чат или найди пользователя</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
