import { useState, useEffect } from "react";
import { formatTime } from "../../utils/formatTime";

export default function ChatSidebar({
  onSelectChat,
  searchQuery,
  onSearchChange,
}) {
  const [groups, setGroups] = useState([]);
  const [personalChats, setPersonalChats] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  useEffect(() => {
    loadChats();
  }, [searchQuery]);

  async function loadChats() {
    try {
      // Загружаем группы
      const groupsRes = await fetch(`/api/groups/${currentUser.uid}`);
      const groupsData = await groupsRes.json();
      setGroups(groupsData || []);

      // Загружаем личные чаты
      const convRes = await fetch(`/api/conversations/${currentUser.uid}`);
      const convData = await convRes.json();
      setPersonalChats(convData || []);
    } catch (error) {
      console.error("Error loading chats:", error);
    }
  }

  return (
    <div className="w-80 bg-white/90 backdrop-blur-lg border-r border-purple-200 flex flex-col h-full">
      {/* Поиск */}
      <div className="p-4 border-b border-purple-200">
        <input
          type="text"
          placeholder="🔍 Поиск по @нику или телефону..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 bg-purple-50 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-gray-800"
        />
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {/* Группы */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
            👥 Группы
          </h3>
          {groups
            .filter((g) =>
              g.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((group) => (
              <ChatItem
                key={group.groupId}
                avatar={group.avatar}
                name={group.name}
                lastMessage={group.lastMessage}
                timestamp={group.lastMessageTime}
                participants={group.participants?.length || 0}
                onClick={() => onSelectChat({ ...group, type: "group" })}
              />
            ))}
        </div>

        {/* Личные чаты */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
            💬 Личные чаты
          </h3>
          {personalChats
            .filter((c) =>
              c.username.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((chat) => (
              <ChatItem
                key={chat.conversationId}
                avatar={chat.avatar}
                name={chat.username}
                lastMessage={chat.lastMessage}
                timestamp={chat.lastMessageTime}
                online={chat.online}
                onClick={() => onSelectChat({ ...chat, type: "personal" })}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// Компонент элемента чата
function ChatItem({
  avatar,
  name,
  lastMessage,
  timestamp,
  participants,
  online,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-purple-50 rounded-xl cursor-pointer transition-colors mb-1"
    >
      <div className="relative flex-shrink-0">
        <img
          src={avatar || "/default-avatar.png"}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />
        {online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-semibold text-gray-800 truncate">{name}</h4>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatTime(timestamp)}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {lastMessage || "Нет сообщений"}
        </p>
        {participants > 0 && (
          <span className="text-xs text-purple-600">
            {participants} участников
          </span>
        )}
      </div>
    </div>
  );
}
