import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Загрузка данных группы и сообщений
  useEffect(() => {
    if (!currentUser || !groupId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = { "X-User-Id": currentUser.uid };

        // 1. Грузим инфо о группе
        const groupRes = await fetch(`/api/groups/${groupId}`, { headers });
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroup(groupData);
        } else {
          alert("Группа не найдена");
          navigate("/messages");
        }

        // 2. Грузим сообщения
        const msgsRes = await fetch(`/api/groups/${groupId}/messages`, {
          headers,
        });
        if (msgsRes.ok) {
          const msgsData = await msgsRes.json();
          setMessages(msgsData);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, currentUser]);

  // Отправка сообщения
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !group) return;

    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify({ text: newMessage }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      } else {
        alert("Ошибка отправки");
      }
    } catch (error) {
      console.error("Send error:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white flex items-center justify-center">
        <div className="text-white text-xl">Загрузка чата...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white">
      <Header />

      {/* Шапка чата */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-b border-purple-200 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate("/messages")}
          className="text-gray-500 text-xl"
        >
          ⬅️
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-800">{group?.name || "Группа"}</h2>
          <p className="text-xs text-gray-500">
            {group?.participants?.length || 0} участников
          </p>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-white/70 mt-10">
            <p className="text-4xl mb-2">💬</p>
            <p>Начните общение в группе!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                  isMe
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none"
                }`}
              >
                {!isMe && (
                  <p className="text-xs font-bold text-purple-500 mb-1">
                    @{msg.sender_username || "Пользователь"}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p
                  className={`text-[10px] mt-1 text-right ${isMe ? "text-white/70" : "text-gray-400"}`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Ввод сообщения */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white/80 backdrop-blur-md border-t border-purple-200 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Напишите сообщение..."
          className="flex-1 px-4 py-2 rounded-full border-2 border-purple-200 focus:outline-none focus:border-purple-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:shadow-lg transition-all"
        >
          {sending ? "⏳" : "➤"}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}
