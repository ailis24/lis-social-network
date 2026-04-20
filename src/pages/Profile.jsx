import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userService, postService, friendService } from "../services";
import { CameraIcon } from "@heroicons/react/24/outline";

const Profile = () => {
  const { uid } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ username: "", bio: "" });
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [uid]);

  const loadProfile = async () => {
    try {
      const profileData = await userService.getProfile(uid);
      setProfile(profileData);

      // Load user's posts
      const allPosts = await postService.getFeed();
      const userPosts = allPosts.filter((post) => post.author_id === uid);

      // Get author usernames for posts
      const postsWithAuthors = await Promise.all(
        userPosts.map(async (post) => {
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
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      saveProfile();
    } else {
      setEditData({ username: profile.username, bio: profile.bio });
    }
    setEditing(!editing);
  };

  const saveProfile = async () => {
    try {
      await userService.updateProfile(editData);
      setProfile({ ...profile, ...editData });
      if (currentUser.uid === uid) {
        updateUser(editData);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const result = await userService.uploadAvatar(file);
        setProfile({ ...profile, avatar: result.avatar });
        if (currentUser.uid === uid) {
          updateUser({ avatar: result.avatar });
        }
      } catch (error) {
        console.error("Error uploading avatar:", error);
      }
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      await friendService.sendRequest(uid);
      alert("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-2xl font-medium text-gray-600">
                  {profile.username?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}

            {currentUser.uid === uid && (
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer hover:bg-gray-100">
                <CameraIcon className="w-5 h-5 text-gray-600" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.username}
              </h1>
              {currentUser.uid !== uid ? (
                <button
                  onClick={handleSendFriendRequest}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600"
                >
                  Add Friend
                </button>
              ) : editing ? (
                <div className="space-x-3">
                  <button
                    onClick={handleEditToggle}
                    className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-full hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {profile.postsCount || 0}
                </p>
                <p className="text-gray-600">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {profile.followersCount || 0}
                </p>
                <p className="text-gray-600">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {profile.followingCount || 0}
                </p>
                <p className="text-gray-600">Following</p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editData.username}
                  onChange={(e) =>
                    setEditData({ ...editData, username: e.target.value })
                  }
                />
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={editData.bio}
                  onChange={(e) =>
                    setEditData({ ...editData, bio: e.target.value })
                  }
                />
              </div>
            ) : (
              <p className="text-gray-700">
                {profile.bio || "No bio available"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Posts</h2>
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-md mb-4 p-4">
            {post.image && (
              <img
                src={post.image}
                alt="Post"
                className="w-full h-auto rounded-lg mb-3"
              />
            )}
            {post.video && (
              <video controls className="w-full rounded-lg mb-3">
                <source src={post.video} type="video/mp4" />
              </video>
            )}
            <p className="text-gray-800 mb-3">{post.content}</p>
            <div className="flex items-center space-x-4 text-gray-500">
              <span>❤️ {post.likes?.length || 0}</span>
              <span>💬 {post.comments_count}</span>
              <span>{new Date(post.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
