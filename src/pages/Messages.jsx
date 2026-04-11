import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import ChatItem from "../components/ChatItem";
import GroupCreateModal from "../components/GroupCreateModal";

export default function Messages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadChats();
  }, [currentUser]);

  async function loadChats() {
    try {
      setLoading(true);

      // 🔧 ПРЯМОЙ FETCH С ЗАГОЛОВКАМИ
      const headers = { "X-User-Id": currentUser.uid };

      // Загружаем группы
      const groupsRes = await fetch("/api/groups", { headers });
      const groupsData = groupsRes.ok ? await groupsRes.json() : [];

      // Загружаем личные чаты
      const convsRes = await fetch(`/api/conversations/${currentUser.uid}`);
      const convsData = convsRes.ok ? await convsRes.json() : [];

      setGroups(groupsData || []);
      setConversations(convsData || []);
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenChat = (chat, type) => {
    if (type === "personal" && chat.otherUser?.uid) {
      navigate(`/messages/${chat.otherUser.uid}`);
    } else if (type === "group" && chat.id) {
      navigate(`/messages/group/${chat.id}`);
    }
  };

  // 🔷 УДАЛЕНИЕ ГРУППЫ (только создатель)
  const handleDeleteGroup = async (groupId, groupName) => {
    if (
      !confirm(`Удалить группу "${groupName}"?\nЭто действие нельзя отменить!`)
    )
      return;

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { "X-User-Id": currentUser.uid },
      });

      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== groupId));
        alert("✅ Группа удалена");
      } else {
        const err = await res.json();
        alert("Ошибка: " + err.error);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Ошибка удаления");
    }
  };

  const handleCreateGroup = async (groupName, participantIds) => {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({
          name: groupName,
          participants: participantIds,
        }),
      });

      if (!res.ok) throw new Error("Ошибка создания группы");

      const result = await res.json();
      setShowCreateModal(false);
      loadChats();
      if (result?.id) navigate(`/messages/group/${result.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Ошибка создания группы");
    }
  };

  const handleSearchUsers = async (query) => {
    if (query.length < 2) return [];
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
      );
      return res.ok ? await res.json() : [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-24">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 👥 Группы */}
        <section>
          <h2 className="text-lg font-bold text-white/90 mb-3 flex items-center gap-2">
            <span>👥</span> Группы
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-white/20 rounded-xl animate-pulse"
                >
                  <div className="w-12 h-12 rounded-full bg-white/30"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/30 rounded w-3/4"></div>
                    <div className="h-3 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-white/80">
              <p className="text-lg">Нет групп</p>
              <p className="text-sm text-white/60">Создай первую группу!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.id} className="relative">
                  <ChatItem
                    avatar={group.avatar}
                    name={group.name}
                    lastMessage={group.lastMessage}
                    timestamp={group.lastMessageTime}
                    participants={group.participants?.length}
                    onClick={() => handleOpenChat(group, "group")}
                  />

                  {/* 🔴 КНОПКА УДАЛЕНИЯ (только для создателя) */}
                  {group.creatorId === currentUser.uid && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id, group.name);
                      }}
                      className="absolute top-2 right-12 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors z-10"
                      title="Удалить группу (вы создатель)"
                    >
                      <span className="text-sm">🗑️</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 💬 Личные чаты */}
        <section>
          <h2 className="text-lg font-bold text-white/90 mb-3 flex items-center gap-2">
            <span>💬</span> Личные чаты
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-white/20 rounded-xl animate-pulse"
                >
                  <div className="w-12 h-12 rounded-full bg-white/30"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/30 rounded w-3/4"></div>
                    <div className="h-3 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-white/80">
              <p className="text-lg">Нет личных чатов</p>
              <p className="text-sm text-white/60">
                Напиши кому-нибудь первым!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <ChatItem
                  key={conv.id}
                  avatar={conv.otherUser?.avatar}
                  name={conv.otherUser?.username}
                  lastMessage={conv.lastMessage}
                  timestamp={conv.lastMessageTime}
                  online={conv.otherUser?.online}
                  onClick={() => handleOpenChat(conv, "personal")}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ✏️ КНОПКА СОЗДАНИЯ ГРУППЫ */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95"
        title="Создать группу"
      >
        ✏️
      </button>

      <BottomNav />

      {/* 🪟 МОДАЛЬНОЕ ОКНО */}
      {showCreateModal && (
        <GroupCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
          onSearchUsers={handleSearchUsers}
          currentUserId={currentUser?.uid}
        />
      )}
    </div>
  );
}
