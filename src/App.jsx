import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PremiumProvider } from "./context/PremiumContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
// import PhotoChain from "./pages/PhotoChain";  // ← ВРЕМЕННО ОТКЛЮЧЕНО (tldraw ошибка)
import Fitness from "./pages/Fitness";
import QaChain from "./pages/QaChain";
import AddStory from "./pages/AddStory";
import CreateGroup from "./pages/CreateGroup";
import GroupChat from "./pages/GroupChat";

function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
        <div className="text-white text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-white"></div>
          <span>⏳ Загрузка Lis...</span>
        </div>
      </div>
    );
  }

  return (
    <PremiumProvider>
      <Routes>
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={currentUser ? <Navigate to="/" replace /> : <Register />}
        />
        <Route
          path="/"
          element={currentUser ? <Feed /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={currentUser ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/:userId"
          element={currentUser ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/create"
          element={
            currentUser ? <CreatePost /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/search"
          element={currentUser ? <Search /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/notifications"
          element={
            currentUser ? <Notifications /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/messages"
          element={
            currentUser ? <Messages /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/messages/:userId"
          element={currentUser ? <Chat /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/messages/new"
          element={
            currentUser ? <CreateGroup /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/messages/group/:groupId"
          element={
            currentUser ? <GroupChat /> : <Navigate to="/login" replace />
          }
        />
        {/* ВРЕМЕННО ОТКЛЮЧЕНО — tldraw ошибка */}
        {/* <Route
          path="/photo-chain"
          element={
            currentUser ? <PhotoChain /> : <Navigate to="/login" replace />
          }
        /> */}
        <Route
          path="/fitness"
          element={currentUser ? <Fitness /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/qa-chain"
          element={currentUser ? <QaChain /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/add-story"
          element={
            currentUser ? <AddStory /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PremiumProvider>
  );
}

export default App;
