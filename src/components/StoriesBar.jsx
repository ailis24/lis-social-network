import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getActiveStories } from "../services/stories";
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

  useEffect(() => {
    const unsubscribe = getActiveStories((data) => {
      setStories(data);

      const grouped = {};
      data.forEach((story) => {
        if (!grouped[story.userId]) {
          grouped[story.userId] = {
            userId: story.userId,
            username: story.username,
            avatar: story.avatar,
            stories: [],
          };
        }
        grouped[story.userId].stories.push(story);
      });

      Object.keys(grouped).forEach((userId) => {
        grouped[userId].stories.sort(
          (a, b) =>
            new Date(a.createdAt?.toDate?.() || a.createdAt) -
            new Date(b.createdAt?.toDate?.() || b.createdAt),
        );
      });

      setGroupedStories(grouped);
    });

    return () => unsubscribe();
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

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // 🔧 Получаем массив пользователей для маппинга
  const storyUsers = Object.values(groupedStories);

  return (
    <>
      {/* ✅ УБРАЛ bg-white И border-b — ТЕПЕРЬ ПРОЗРАЧНЫЙ */}
      <div className="relative bg-transparent py-4">
        {/* Кнопка влево */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white/80 transition-all"
        >
          ←
        </button>

        {/* Лента сторис */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-12 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Моя сторис */}
          {currentUser && (
            <div
              key="my-story"
              onClick={() => navigate("/add-story")}
              className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer"
            >
              <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-purple-500 to-pink-500">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                  <img
                    src={
                      userData?.avatar ||
                      "https://i.ibb.co/Lzkg4DLS/737fa499-05ed-4d7d-813c-380b6eb09dfe-1.gif"
                    }
                    alt="Your story"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
              </div>
              <span className="text-xs text-purple-700 font-medium">Вы</span>
            </div>
          )}

          {/* Сторис других пользователей */}
          {storyUsers.map((user) => (
            <div
              key={user.userId || `user-${user.username}`}
              onClick={() => handleStoryClick(user.userId, 0)}
              className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-purple-500 to-pink-500">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-purple-700 font-medium max-w-[64px] truncate">
                {user.username}
              </span>
            </div>
          ))}
        </div>

        {/* Кнопка вправо */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white/80 transition-all"
        >
          →
        </button>
      </div>

      {/* Просмотрщик сторис */}
      {showViewer && selectedUserId && groupedStories[selectedUserId] && (
        <StoryViewer
          userId={selectedUserId}
          initialIndex={selectedIndex}
          storiesByUser={groupedStories[selectedUserId].stories || []}
          onClose={handleCloseViewer}
          onNextUser={() => {
            const userIds = Object.keys(groupedStories);
            const currentIndex = userIds.indexOf(selectedUserId);
            const nextIndex = currentIndex + 1;
            if (nextIndex < userIds.length) {
              handleStoryClick(userIds[nextIndex], 0);
            } else {
              handleCloseViewer();
            }
          }}
          onPrevUser={() => {
            const userIds = Object.keys(groupedStories);
            const currentIndex = userIds.indexOf(selectedUserId);
            const prevIndex = currentIndex - 1;
            if (prevIndex >= 0) {
              handleStoryClick(userIds[prevIndex], 0);
            }
          }}
        />
      )}
    </>
  );
}
