import React, { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FitnessProvider } from "./context/FitnessContext";
import { PremiumProvider } from "./context/PremiumContext";
import Header from "./components/Header";
import CallModal from "./components/CallModal";
import FoxPet from "./components/FoxPet";
import { callService } from "./services";

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

// Global incoming-call banner — polls every 3 sec when user is logged in
function IncomingCallBanner() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState(null);
  const [showCall, setShowCall] = useState(false);

  useEffect(() => {
    if (!user) return;
    const iv = setInterval(async () => {
      if (showCall) return;
      try {
        const { call } = await callService.getIncoming();
        if (call) setIncoming(call);
        else setIncoming(null);
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [user, showCall]);

  if (!incoming) return null;
  if (showCall)
    return (
      <CallModal
        side="callee"
        callId={incoming.id}
        targetName={`@${incoming.callerName}`}
        callType={incoming.type}
        offer={incoming.offer}
        onEnd={() => {
          setShowCall(false);
          setIncoming(null);
        }}
      />
    );

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 border border-purple-200 animate-pulse">
      <div className="text-2xl">{incoming.type === "video" ? "📹" : "📞"}</div>
      <div>
        <p className="font-bold text-gray-800 text-sm">
          @{incoming.callerName}
        </p>
        <p className="text-xs text-gray-500">
          {incoming.type === "video" ? "Видеозвонок" : "Аудиозвонок"}
        </p>
      </div>
      <button
        onClick={() => callService.end(incoming.id, true).then(() => setIncoming(null))}
        className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center text-lg"
      >
        📵
      </button>
      <button
        onClick={() => setShowCall(true)}
        className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-lg"
      >
        {incoming.type === "video" ? "📹" : "📞"}
      </button>
    </div>
  );
}

const AppLayout = ({ children }) => (
  <>
    <Header />
    <main className="pt-2 pb-20 sm:pb-4">{children}</main>
    <IncomingCallBanner />
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

function FoxPetWrapper() {
  const { user } = useAuth();
  const location = useLocation();
  const authRoutes = ["/login", "/register"];
  if (!user || authRoutes.includes(location.pathname)) return null;
  return <FoxPet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PremiumProvider>
          <FitnessProvider>
            <div className="min-h-screen bg-gradient-to-b from-purple-700 via-purple-400 to-purple-100">
              <AppRoutes />
              <FoxPetWrapper />
            </div>
          </FitnessProvider>
        </PremiumProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
