import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StoryViewer from "./StoryViewer";

export default function StoriesBar() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [groupedStories, setGroupedStories] = useState({});
  const [showViewer, setShowViewer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef(null);

  // 🔷 Загрузка сторис с сервера
  useEffect(() => {
    const loadStories = async () => {
      try {
        const res = await fetch("/api/stories");
        if (res.ok) {
          const data = await res.json();
          setStories(data);

          // Группируем по пользователям
          const grouped = {};
          data.forEach((story) => {
            if (!grouped[story.author_id]) {
              grouped[story.author_id] = {
                userId: story.author_id,
                username: story.username,
                avatar: story.avatar,
                stories: [],
              };
            }
            grouped[story.author_id].stories.push(story);
          });

          setGroupedStories(grouped);
        }
      } catch (error) {
        console.error("Load stories error:", error);
      }
    };

    loadStories();
  }, []);

  const handleStoryClick = (userId, storyIndex = 0) => {
    setSelectedUserId(userId);
    setSelectedIndex(storyIndex);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedUserId(null);
    setSelectedIndex(0);
  };

  const storyUsers = Object.values(groupedStories);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Моя сторис (Добавить) */}
        {currentUser && (
          <div
            onClick={() => navigate("/add-story")}
            className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer"
          >
            <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-gray-400 to-gray-500">
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                <img
                  src={userData?.avatar || "/fox.gif"}
                  alt="Your story"
                  className="w-full h-full object-cover opacity-80"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-lg font-bold">+</span>
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">Вы</span>
          </div>
        )}

        {/* Сторис других пользователей */}
        {storyUsers.map((user) => (
          <div
            key={user.userId}
            onClick={() => handleStoryClick(user.userId, 0)}
            className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-purple-500 to-pink-500">
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                <img
                  src={user.avatar || "/fox.gif"}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <span className="text-xs text-gray-700 font-medium max-w-[64px] truncate">
              {user.username}
            </span>
          </div>
        ))}
      </div>

      {/* Просмотрщик сторис */}
      {showViewer && selectedUserId && groupedStories[selectedUserId] && (
        <StoryViewer
          storiesByUser={groupedStories[selectedUserId].stories}
          initialIndex={selectedIndex}
          onClose={handleCloseViewer}
          onNextUser={() => {
            const currentIndex = storyUsers.findIndex(
              (u) => u.userId === selectedUserId,
            );
            const nextUser = storyUsers[currentIndex + 1];
            if (nextUser) {
              setSelectedUserId(nextUser.userId);
              setSelectedIndex(0);
            } else {
              handleCloseViewer();
            }
          }}
          onPrevUser={() => {
            const currentIndex = storyUsers.findIndex(
              (u) => u.userId === selectedUserId,
            );
            const prevUser = storyUsers[currentIndex - 1];
            if (prevUser) {
              setSelectedUserId(prevUser.userId);
              setSelectedIndex(0);
            }
          }}
        />
      )}
    </>
  );
}
