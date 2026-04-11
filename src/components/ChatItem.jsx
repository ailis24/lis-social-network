import { formatTime } from "../utils/formatTime";

export default function ChatItem({
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
      className="flex items-center gap-3 p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-purple-50 cursor-pointer transition-all duration-200 active:scale-[0.99] border border-purple-100"
    >
      {/* Аватарка */}
      <div className="relative flex-shrink-0">
        <img
          src={
            avatar ||
            "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
          }
          alt={name}
          className="w-12 h-12 rounded-full object-cover border-2 border-purple-300"
        />
        {online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        )}
      </div>

      {/* Информация */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-semibold text-gray-800 truncate">{name}</h4>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formatTime(timestamp)}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {lastMessage || "Нет сообщений"}
        </p>
        {participants > 0 && (
          <span className="text-xs text-purple-600 mt-1 inline-block">
            {participants} участников
          </span>
        )}
      </div>
    </div>
  );
}
