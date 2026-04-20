import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { postService, userService, timerService } from "../services";
import {
  PhotoIcon,
  VideoCameraIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const Post = ({ post, onLike, onAddComment, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (showComments && post.comments_count > 0) {
      loadComments();
    }
  }, [showComments]);

  const loadComments = async () => {
    try {
      const data = await postService.getComments(post.id);
      setComments(data);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await onAddComment(post.id, newComment);
      setNewComment("");
      loadComments(); // Refresh comments
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      {/* Post header */}
      <div className="p-4 flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600">
            {post.author_username?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{post.author_username}</h3>
          <p className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800">{post.content}</p>
      </div>

      {/* Post media */}
      {post.image && (
        <div className="px-4 pb-3">
          <img
            src={post.image}
            alt="Post"
            className="w-full h-auto rounded-lg"
          />
        </div>
      )}

      {post.video && (
        <div className="px-4 pb-3">
          <video controls className="w-full rounded-lg">
            <source src={post.video} type="video/mp4" />
          </video>
        </div>
      )}

      {/* Post actions */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center space-x-1 ${
                post.likes?.includes(currentUser.uid)
                  ? "text-red-500"
                  : "text-gray-500"
              }`}
            >
              <span>❤️</span>
              <span>{post.likes?.length || 0}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="text-gray-500 flex items-center space-x-1"
            >
              <span>💬</span>
              <span>{post.comments_count}</span>
            </button>
          </div>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Write a comment..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-600"
              >
                Post
              </button>
            </div>

            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600">
                    {comment.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {comment.username}
                  </p>
                  <p className="text-sm text-gray-600">{comment.text}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FeedTimer = ({ onTimerEnd }) => {
  const [status, setStatus] = useState({
    sessionTime: 0,
    isLocked: false,
    lockUntil: null,
  });
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await timerService.getStatus();
        setStatus(data);

        if (data.isLocked && data.lockUntil) {
          const lockTime = new Date(data.lockUntil).getTime();
          const now = Date.now();
          setTimeLeft(Math.max(0, Math.floor((lockTime - now) / 1000)));
        } else {
          setTimeLeft(0);
        }
      } catch (error) {
        console.error("Error fetching timer status:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status.isLocked) {
      onTimerEnd();
    }
  }, [timeLeft, status.isLocked, onTimerEnd]);

  if (status.isLocked && timeLeft > 0) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
        <p className="text-yellow-800 font-medium">
          Feed is locked. Time remaining: {minutes}:
          {seconds.toString().padStart(2, "0")}
        </p>
      </div>
    );
  }

  return null;
};

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({
    content: "",
    image: null,
    video: null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const data = await postService.getFeed();

      // Get author usernames for each post
      const postsWithAuthors = await Promise.all(
        data.map(async (post) => {
          try {
            const author = await userService.getProfile(post.author_id);
            return { ...post, author_username: author.username };
          } catch (error) {
            return { ...post, author_username: "Unknown User" };
          }
        }),
      );

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim() && !newPost.image && !newPost.video) return;

    setUploading(true);
    try {
      await postService.createPost(
        newPost.content,
        newPost.image,
        newPost.video,
      );
      setNewPost({ content: "", image: null, video: null });
      loadFeed();
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const result = await postService.toggleLike(postId);
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, likes: result.likes } : post,
        ),
      );
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      await postService.addComment(postId, text);
      setPosts(
        posts.map((post) =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleTimerEnd = () => {
    // Timer ended, refresh status
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <FeedTimer onTimerEnd={handleTimerEnd} />

      {/* Create Post */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleCreatePost}>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="What's on your mind?"
            value={newPost.content}
            onChange={(e) =>
              setNewPost({ ...newPost, content: e.target.value })
            }
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex space-x-4">
              <label className="cursor-pointer text-gray-500 hover:text-blue-600">
                <PhotoIcon className="w-6 h-6" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    setNewPost({ ...newPost, image: e.target.files[0] })
                  }
                />
              </label>

              <label className="cursor-pointer text-gray-500 hover:text-blue-600">
                <VideoCameraIcon className="w-6 h-6" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) =>
                    setNewPost({ ...newPost, video: e.target.files[0] })
                  }
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 disabled:opacity-50"
            >
              {uploading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>

      {/* Posts */}
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          onLike={handleLike}
          onAddComment={handleAddComment}
          currentUser={user}
        />
      ))}

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No posts yet. Be the first to share!</p>
        </div>
      )}
    </div>
  );
};

export default Feed;
