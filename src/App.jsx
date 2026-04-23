import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FitnessProvider } from "./context/FitnessContext";
import { PremiumProvider } from "./context/PremiumContext";
import Header from "./components/Header";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Feed = lazy(() => import("./pages/Feed"));
const Profile = lazy(() => import("./pages/Profile"));
const Messages = lazy(() => import("./pages/Messages"));
const Search = lazy(() => import("./pages/Search"));

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <>
    <Header />
    <main className="pt-2 pb-20 sm:pb-4">{children}</main>
  </>
);

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <Register />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Feed />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:uid"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Messages />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Search />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PremiumProvider>
          <FitnessProvider>
            <div className="min-h-screen bg-gradient-to-b from-purple-700 via-purple-400 to-purple-100">
              <AppRoutes />
            </div>
          </FitnessProvider>
        </PremiumProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
