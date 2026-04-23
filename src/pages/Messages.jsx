import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { messageService, userService } from "../services";
import StickerPicker from "../components/StickerPicker";
import {
  PaperClipIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const MessageBubble = ({ message, isOwn, onDelete }) => (
  <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 group`}>
    <div className="max-w-xs lg:max-w-md">
      {!isOwn && (
        <Link
          to={`/profile/${message.sender_id}`}
          className="text-xs text-purple-400 font-semibold mb-1 hover:underline block"
        >
          @{message.username}
        </Link>
      )}
      <div
        className={`px-4 py-2.5 rounded-2xl shadow-sm ${
          isOwn
            ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm"
        }`}
      >
        {message.file_url && (
          <div className="mb-2">
            {message.file_type === "image" ? (
              <img
                src={message.file_url}
                alt=""
                loading="lazy"
                className="max-w-full rounded-xl"
              />
            ) : message.file_type === "video" ? (
              <video controls className="max-w-full rounded-xl">
                <source src={message.file_url} />
              </video>
            ) : message.file_type === "audio" ? (
              <audio controls src={message.file_url} className="max-w-full" />
            ) : (
              <a
                href={message.file_url}
                target="_blank"
                rel="noreferrer"
                className={`underline text-sm ${isOwn ? "text-white" : "text-purple-600"}`}
              >
                📎 Скачать файл
              </a>
            )}
          </div>
        )}
        {message.text && <p className="break-words text-sm">{message.text}</p>}
        <p
          className={`text-xs mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}
        >
          {new Date(message.created_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
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

const ConversationItem = ({
  conv,
  isActive,
  onClick,
  currentUserId,
  onDelete,
}) => {
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    if (conv.type !== "group") {
      const otherUid = conv.participants?.find((id) => id !== currentUserId);
      if (otherUid)
        userService
          .getProfile(otherUid)
          .then(setOtherUser)
          .catch(() => {});
    }
  }, [conv.id, currentUserId, conv.type]);

  const isGroup = conv.type === "group";
  const name = isGroup ? conv.name : otherUser?.username || "...";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={`group w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
        isActive ? "bg-purple-100 border border-purple-300" : "hover:bg-gray-50"
      }`}
    >
      {!isGroup && otherUser?.avatar ? (
        <img
          src={otherUser.avatar}
          alt={name}
          loading="lazy"
          className="w-11 h-11 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
          {isGroup ? "👥" : name?.charAt(0)?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-800 truncate">
          {isGroup ? conv.name : `@${name}`}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {isGroup ? `${conv.participants?.length} участников` : "Личный чат"}
        </p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Удалить этот чат?")) onDelete(conv.id);
          }}
          className="flex-shrink-0 w-7 h-7 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-lg"
          title="Удалить чат"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// Modal: pick users (multi-select for group, single for add-to-chat)
const UserPicker = ({ title, multi, onClose, onConfirm, excludeIds = [] }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await userService.search(query);
        setResults(r.filter((u) => !excludeIds.includes(u.uid)));
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = (u) => {
    if (multi) {
      setPicked((p) =>
        p.find((x) => x.uid === u.uid)
          ? p.filter((x) => x.uid !== u.uid)
          : [...p, u],
      );
    } else {
      onConfirm({ users: [u] });
    }
  };

  const confirm = () => {
    if (multi && picked.length === 0) return;
    onConfirm({ users: picked, name: name.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {multi && (
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Название группы"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
            />
          </div>
        )}

        <div className="p-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Найти пользователя..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
            autoFocus
          />
        </div>

        {multi && picked.length > 0 && (
          <div className="px-3 pt-2 flex flex-wrap gap-1.5">
            {picked.map((u) => (
              <span
                key={u.uid}
                className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              >
                @{u.username}
                <button
                  onClick={() => toggle(u)}
                  className="hover:text-red-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-center text-gray-400 text-sm p-4">
              {query ? "Никого не найдено" : "Начни вводить никнейм"}
            </p>
          ) : (
            results.map((u) => {
              const isPicked = picked.find((p) => p.uid === u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={() => toggle(u)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                    isPicked ? "bg-purple-100" : "hover:bg-purple-50"
                  }`}
                >
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt=""
                      loading="lazy"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-bold">
                      {u.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      @{u.username}
                    </p>
                  </div>
                  {multi && isPicked && (
                    <span className="text-purple-600 font-bold">✓</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {multi && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={confirm}
              disabled={picked.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              Создать группу ({picked.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const bottomRef = useRef();
  const pollRef = useRef();

  const loadConversations = async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      return data;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleDeleteConv = async (convId) => {
    try {
      await messageService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (selectedConv?.id === convId) {
        setSelectedConv(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить чат");
    }
  };

  const loadMessages = async (convId) => {
    try {
      const data = await messageService.getMessages(convId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
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
    if (term.length < 1) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    try {
      const results = await userService.search(term);
      setSearchResults(results.filter((u) => u.uid !== user.uid));
      setShowSearch(true);
    } catch (err) {
      console.error(err);
    }
  };

  const startConversation = async (uid) => {
    try {
      const data = await messageService.createConversation(uid);
      setSearchTerm("");
      setShowSearch(false);
      setSearchResults([]);
      const convs = await loadConversations();
      const found = convs.find((c) => c.id === data.id);
      if (found) setSelectedConv(found);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async ({ users, name }) => {
    try {
      const finalName =
        name ||
        `Группа ${users
          .map((u) => "@" + u.username)
          .join(", ")
          .slice(0, 40)}`;
      const data = await messageService.createGroup(
        users.map((u) => u.uid),
        finalName,
      );
      setShowGroupModal(false);
      const convs = await loadConversations();
      const found = convs.find((c) => c.id === data.id);
      if (found) setSelectedConv(found);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddParticipant = async ({ users }) => {
    if (!selectedConv || users.length === 0) return;
    try {
      const u = users[0];
      const result = await messageService.addParticipant(
        selectedConv.id,
        u.uid,
      );
      setShowAddModal(false);
      const convs = await loadConversations();
      const found = convs.find((c) => c.id === selectedConv.id);
      if (found) setSelectedConv(found);
    } catch (err) {
      alert(err.message);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      await messageService.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 pb-8 h-[calc(100vh-8rem)] flex gap-3">
      {/* Sidebar */}
      <div
        className={`${selectedConv ? "hidden sm:flex" : "flex"} w-full sm:w-72 flex-shrink-0 bg-white/90 backdrop-blur rounded-2xl shadow-md flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-lg">Сообщения</h2>
            <button
              onClick={() => setShowGroupModal(true)}
              title="Создать группу"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center hover:shadow-lg transition-all"
            >
              <UsersIcon className="w-5 h-5" />
            </button>
          </div>
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
                  <p className="text-center text-gray-400 text-sm p-3">
                    Никого не найдено
                  </p>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => startConversation(u.uid)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-left"
                    >
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt=""
                          loading="lazy"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-bold">
                          {u.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-800">
                        @{u.username}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-center text-gray-400 text-sm p-4">
              Нет чатов. Найди пользователя или создай группу!
            </p>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={selectedConv?.id === conv.id}
                onClick={() => setSelectedConv(conv)}
                currentUserId={user?.uid}
                onDelete={handleDeleteConv}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`${selectedConv ? "flex" : "hidden sm:flex"} flex-1 bg-white/90 backdrop-blur rounded-2xl shadow-md flex-col overflow-hidden min-w-0`}
      >
        {selectedConv ? (
          <>
            <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center gap-2">
              <button
                onClick={() => setSelectedConv(null)}
                className="sm:hidden text-white text-xl px-2"
              >
                ←
              </button>
              <p className="font-bold text-white flex-1 truncate">
                {selectedConv.type === "group"
                  ? `👥 ${selectedConv.name}`
                  : "💬 Личный чат"}
                <span className="text-white/70 text-xs font-normal ml-2">
                  {selectedConv.participants?.length} уч.
                </span>
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                title="Добавить участника"
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
              >
                <UserPlusIcon className="w-5 h-5" />
              </button>
            </div>

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

            <div className="p-3 border-t border-gray-100">
              {attachment && (
                <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2 mb-2 text-sm">
                  <span className="text-purple-600 truncate">
                    {attachment.name}
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form
                onSubmit={sendMessage}
                className="relative flex items-center gap-2"
              >
                {showStickers && (
                  <StickerPicker
                    onPick={(s) => {
                      setNewMsg((p) => p + s);
                      setShowStickers(false);
                    }}
                    onClose={() => setShowStickers(false)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setShowStickers((s) => !s)}
                  className="text-2xl text-gray-400 hover:text-purple-500 flex-shrink-0"
                  title="Стикеры"
                >
                  😊
                </button>
                <label className="cursor-pointer text-gray-400 hover:text-purple-500 flex-shrink-0">
                  <PaperClipIcon className="w-5 h-5" />
                  <input
                    type="file"
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
              <p className="font-semibold text-gray-500">
                Выбери чат, найди пользователя или создай группу
              </p>
            </div>
          </div>
        )}
      </div>

      {showGroupModal && (
        <UserPicker
          title="Новая группа"
          multi
          onClose={() => setShowGroupModal(false)}
          onConfirm={handleCreateGroup}
          excludeIds={[user?.uid]}
        />
      )}
      {showAddModal && selectedConv && (
        <UserPicker
          title="Добавить участника"
          multi={false}
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddParticipant}
          excludeIds={selectedConv.participants || []}
        />
      )}
    </div>
  );
}
