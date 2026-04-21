const API_URL = "";

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const authService = {
  register: async (username, phone, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  },

  login: async (phone, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};

export const userService = {
  search: async (query) => {
    const res = await fetch(
      `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
      {
        headers: getAuthHeader(),
      },
    );
    if (!res.ok) throw new Error("Search failed");
    return await res.json();
  },

  getProfile: async (uid) => {
    const res = await fetch(`${API_URL}/api/users/${uid}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Profile not found");
    return await res.json();
  },

  updateProfile: async (data) => {
    const res = await fetch(`${API_URL}/api/users/profile`, {
      method: "PUT",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Update failed");
    return await res.json();
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${API_URL}/api/users/avatar`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return await res.json();
  },
};

export const postService = {
  getFeed: async () => {
    const res = await fetch(`${API_URL}/api/posts`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load feed");
    return await res.json();
  },

  createPost: async (content, image, video, pollData) => {
    const formData = new FormData();
    if (content) formData.append("content", content);
    if (image) formData.append("image", image);
    if (video) formData.append("video", video);
    if (pollData) formData.append("pollData", JSON.stringify(pollData));

    const res = await fetch(`${API_URL}/api/posts`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error("Post creation failed");
    return await res.json();
  },

  toggleLike: async (postId) => {
    const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
      method: "POST",
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Like failed");
    return await res.json();
  },

  addComment: async (postId, text) => {
    const res = await fetch(`${API_URL}/api/posts/${postId}/comment`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Comment failed");
    return await res.json();
  },

  getComments: async (postId) => {
    const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load comments");
    return await res.json();
  },
};

export const messageService = {
  getConversations: async () => {
    const res = await fetch(`${API_URL}/api/messages/conversations`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load conversations");
    return await res.json();
  },

  createConversation: async (participantId, name) => {
    const res = await fetch(`${API_URL}/api/messages/conversation`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, name }),
    });
    if (!res.ok) throw new Error("Conversation creation failed");
    return await res.json();
  },

  createGroup: async (participantIds, name) => {
    const res = await fetch(`${API_URL}/api/messages/conversation`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Group creation failed");
    return data;
  },

  addParticipant: async (conversationId, uid, name) => {
    const res = await fetch(
      `${API_URL}/api/messages/conversation/${conversationId}/participants`,
      {
        method: "POST",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ uid, name }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Add participant failed");
    return data;
  },

  getMessages: async (conversationId) => {
    const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load messages");
    return await res.json();
  },

  sendMessage: async (conversationId, text, file) => {
    const formData = new FormData();
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);

    const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error("Message sending failed");
    return await res.json();
  },

  deleteMessage: async (messageId) => {
    const res = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Delete failed");
    return await res.json();
  },
};

export const friendService = {
  sendRequest: async (friendId) => {
    const res = await fetch(`${API_URL}/api/friends/request`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    if (!res.ok) throw new Error("Request failed");
    return await res.json();
  },

  acceptRequest: async (friendId) => {
    const res = await fetch(`${API_URL}/api/friends/accept`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    if (!res.ok) throw new Error("Accept failed");
    return await res.json();
  },
};

export const storyService = {
  getStories: async () => {
    const res = await fetch(`${API_URL}/api/stories`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load stories");
    return await res.json();
  },

  createStory: async (file) => {
    const formData = new FormData();
    formData.append("media", file);

    const res = await fetch(`${API_URL}/api/stories`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error("Story creation failed");
    return await res.json();
  },
};

export const notificationService = {
  getNotifications: async () => {
    const res = await fetch(`${API_URL}/api/notifications`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load notifications");
    return await res.json();
  },

  markAsRead: async () => {
    const res = await fetch(`${API_URL}/api/notifications/read`, {
      method: "PUT",
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Mark read failed");
    return await res.json();
  },
};

export const timerService = {
  getStatus: async () => {
    const res = await fetch(`${API_URL}/api/feed-timer`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to load timer");
    return await res.json();
  },

  updateTime: async (sessionTime) => {
    const res = await fetch(`${API_URL}/api/feed-timer/update`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ sessionTime }),
    });
    if (!res.ok) throw new Error("Update failed");
    return await res.json();
  },

  lock: async () => {
    const res = await fetch(`${API_URL}/api/feed-timer/lock`, {
      method: "POST",
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Lock failed");
    return await res.json();
  },
};
