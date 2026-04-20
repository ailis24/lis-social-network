import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FitnessProvider } from "./context/FitnessContext";
import { PremiumProvider } from "./context/PremiumContext";
import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Search from "./pages/Search";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Feed />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:uid"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Profile />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Profile />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Messages />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Search />
            </>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PremiumProvider>
          <FitnessProvider>
            <div className="min-h-screen">
              <AppRoutes />
            </div>
          </FitnessProvider>
        </PremiumProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
