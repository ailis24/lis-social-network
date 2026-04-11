import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Post from "../components/Post";
import StoriesBar from "../components/StoriesBar";
import FeedBlockPopup from "../components/FeedBlockPopup";

export default function Feed() {
  const { currentUser, userData } = useAuth();
  const { isPremium } = usePremium();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFeedBlocked, setIsFeedBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  const observerRef = useRef();
  const lastPostRef = useRef();

  // 🔷 Проверка блокировки — ИСПРАВЛЕНО: добавлен заголовок авторизации
  useEffect(() => {
    if (!currentUser || isPremium) return;

    const checkFeedTimer = async () => {
      try {
        const res = await fetch("/api/feed/timer", {
          headers: { "X-User-Id": currentUser.uid },
        });
        const data = await res.json();
        if (data.isBlocked) {
          setIsFeedBlocked(true);
          setBlockTimeRemaining(data.secondsRemaining);
        }
      } catch (error) {
        console.error("Feed timer error:", error);
      }
    };

    checkFeedTimer();
    const interval = setInterval(checkFeedTimer, 60000);
    return () => clearInterval(interval);
  }, [currentUser, isPremium]);

  const loadInitialPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/posts?limit=20");
      const data = await res.json();
      setPosts(data.posts || []);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const res = await fetch(`/api/posts?limit=20&cursor=${nextCursor}`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, hasMore]);

  useEffect(() => {
    if (loadingMore || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMorePosts();
      },
      { threshold: 0.1 },
    );
    if (lastPostRef.current) observer.observe(lastPostRef.current);
    return () => observer.disconnect();
  }, [loadingMore, hasMore, loadMorePosts]);

  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  const handlePostUpdate = useCallback((postId, updates) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
    );
  }, []);

  const handleUnlock = () => {
    setIsFeedBlocked(false);
    loadInitialPosts();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-600 to-white">
        <div className="text-purple-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  if (isFeedBlocked && !isPremium) {
    return (
      <>
        <Header />
        <FeedBlockPopup
          onUnlock={handleUnlock}
          onClose={() => setIsFeedBlocked(false)}
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400 pb-20">
          <div className="max-w-2xl mx-auto pt-4 px-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 text-center text-white">
              <p>Лента временно недоступна...</p>
              <p className="text-sm mt-2">Вы можете общаться в чатах 💬</p>
            </div>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-300 to-white">
      <Header />
      <StoriesBar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">
            Лента
          </h1>
          <p className="text-white/90 drop-shadow">
            Добро пожаловать,{" "}
            {userData?.username || currentUser.email?.split("@")[0]}! 🦊
          </p>
        </div>
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-purple-700 text-lg mb-2">Пока нет постов</p>
            <p className="text-purple-500">Будьте первым — создайте пост! 🦊</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => {
              const isLastPost = index === posts.length - 1;
              return (
                <div key={post.id} ref={isLastPost ? lastPostRef : null}>
                  <Post
                    post={post}
                    onUpdate={(updates) => handlePostUpdate(post.id, updates)}
                  />
                </div>
              );
            })}
            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-purple-600"></div>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                🎉 Вы увидели все посты!
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
