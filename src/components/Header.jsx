import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BellIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await import("../services").then((mod) =>
          mod.notificationService.getNotifications(),
        );
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            LIS Social
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/search"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Search
            </Link>
            <Link
              to={`/profile/${user?.uid}`}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Profile
            </Link>
            <Link
              to="/messages"
              className="text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              Messages
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/messages")}
              className="p-2 hover:bg-gray-100 rounded-full relative"
            >
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("/search")}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MagnifyingGlassIcon className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center space-x-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user?.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}

              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.username}
              </span>

              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
