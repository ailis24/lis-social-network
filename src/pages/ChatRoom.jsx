export default function ChatRoom() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ... логика загрузки и отправки

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white pb-24">
      {/* ШАПКА ЧАТА */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Стрелка назад */}
          <button
            onClick={() => navigate("/messages")}
            className="p-2 hover:bg-purple-100 rounded-full"
          >
            ←
          </button>

          {/* Аватарка собеседника */}
          <div className="relative">
            <img
              src={otherUser?.avatar || "/default-avatar.png"}
              alt={otherUser?.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-purple-300"
            />
            {otherUser?.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>

          {/* Имя */}
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{otherUser?.username}</h2>
            <p className="text-xs text-gray-500">
              {otherUser?.online ? "онлайн" : "офлайн"}
            </p>
          </div>

          {/* Поиск */}
          <button className="p-2 hover:bg-purple-100 rounded-full">🔍</button>
        </div>
      </div>

      {/* СООБЩЕНИЯ */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {messages.map((msg) => {
          const isMy = msg.senderId === currentUser?.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMy ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  isMy
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none"
                    : "bg-white/90 text-gray-900 rounded-bl-none shadow-md"
                }`}
              >
                {msg.fileUrl && msg.fileType?.startsWith("image/") && (
                  <img
                    src={msg.fileUrl}
                    alt="file"
                    className="rounded-lg mb-2 max-w-full"
                  />
                )}
                <p className="break-words">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${isMy ? "text-purple-100" : "text-gray-400"}`}
                >
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ПОЛЕ ВВОДА */}
      <div className="fixed bottom-20 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-purple-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="p-2 hover:bg-purple-100 rounded-full cursor-pointer">
              <input
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
              className="flex-1 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-full focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSend}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
