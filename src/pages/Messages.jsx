import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { messageService, userService } from "../services";
import { PaperClipIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

const Conversation = ({ conversation, onSelect, isActive }) => {
  const [lastMessage, setLastMessage] = useState("");
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const loadLastMessageAndParticipants = async () => {
      try {
        const messages = await messageService.getMessages(conversation.id);
        const lastMsg = messages[messages.length - 1];
        if (lastMsg) {
          setLastMessage(lastMsg.text || "Media message");
        }

        // Load participant info
        const otherParticipantId = conversation.participants.find(
          (id) => id !== conversation.participants[0],
        );
        if (otherParticipantId) {
          const user = await userService.getProfile(otherParticipantId);
          setParticipants([user]);
        }
      } catch (error) {
        console.error("Error loading conversation data:", error);
      }
    };

    loadLastMessageAndParticipants();
  }, [conversation.id, conversation.participants]);

  return (
    <div
      onClick={() => onSelect(conversation)}
      className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
        isActive ? "bg-blue-50 border-r-2 border-r-blue-500" : ""
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600">
            {participants[0]?.username?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {conversation.name || participants[0]?.username || "Unknown"}
          </h3>
          <p className="text-sm text-gray-500 truncate">{lastMessage}</p>
        </div>
      </div>
    </div>
  );
};

const Message = ({ message, isCurrentUser }) => {
  return (
    <div
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
        }`}
      >
        {message.text && <p className="break-words">{message.text}</p>}

        {message.file_url && (
          <div className="mt-2">
            {message.file_type === "image" ? (
              <img
                src={message.file_url}
                alt="Attachment"
                className="max-w-full h-auto rounded"
              />
            ) : (
              <video controls className="max-w-full rounded">
                <source src={message.file_url} type="video/mp4" />
              </video>
            )}
          </div>
        )}

        <p
          className={`text-xs mt-1 ${isCurrentUser ? "text-blue-100" : "text-gray-500"}`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setShowSearchResults(false);
    await loadMessages(conversation.id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;

    try {
      await messageService.sendMessage(
        selectedConversation.id,
        newMessage,
        attachment,
      );
      setNewMessage("");
      setAttachment(null);
      // Reload messages to get the new one
      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSearch = async (term) => {
    if (term.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await userService.search(term);
      setSearchResults(results.filter((u) => u.uid !== user.uid)); // Exclude current user
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleCreateConversation = async (userId, name) => {
    try {
      await messageService.createConversation(userId, name);
      await loadConversations();
      setShowSearchResults(false);
      setSearchTerm("");
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-10rem)] flex">
      {/* Sidebar */}
      <div className="w-80 bg-white rounded-lg shadow-md mr-6 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>

          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              onFocus={() => searchTerm && setShowSearchResults(true)}
            />

            {showSearchResults && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.uid}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() =>
                      handleCreateConversation(user.uid, user.username)
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.username?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.username}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-32">
                          {user.bio}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {searchResults.length === 0 && (
                  <div className="p-3 text-center text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <Conversation
              key={conversation.id}
              conversation={conversation}
              onSelect={handleSelectConversation}
              isActive={selectedConversation?.id === conversation.id}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedConversation.name || "Conversation"}
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender_id === user.uid}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center space-x-3"
              >
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    id="attachment"
                    onChange={(e) => setAttachment(e.target.files[0])}
                  />
                  <label
                    htmlFor="attachment"
                    className="cursor-pointer text-gray-500 hover:text-blue-600"
                  >
                    <PaperClipIcon className="w-6 h-6" />
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />

                <button
                  type="submit"
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
                >
                  <ArrowUpIcon className="w-5 h-5" />
                </button>
              </form>

              {attachment && (
                <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded">
                  <span className="text-sm text-gray-600 truncate">
                    {attachment.name}
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
