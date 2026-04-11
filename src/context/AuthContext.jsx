import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔷 Проверка сессии при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem("lis_user");
        if (savedUser) {
          const user = JSON.parse(savedUser);
          // Проверяем валидность пользователя через API
          const res = await fetch(`/api/users/${user.uid}`, {
            headers: { "X-User-Id": user.uid },
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(user);
            setUserData(data);
          } else {
            // Сессия невалидна — очищаем
            localStorage.removeItem("lis_user");
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("lis_user");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // 🔷 Логин
  const login = async (loginInput, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginInput, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("lis_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setUserData(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 🔷 Регистрация
  const register = async (username, phone, password, email) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone, password, email }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("lis_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setUserData(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 🔷 Логаут
  const logout = () => {
    localStorage.removeItem("lis_user");
    setCurrentUser(null);
    setUserData(null);
    return { success: true };
  };

  // 🔷 Обновление данных пользователя
  const updateUserData = async (updates) => {
    if (!currentUser) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch(`/api/users/${currentUser.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.uid,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = { ...currentUser, ...updates };
        localStorage.setItem("lis_user", JSON.stringify(updated));
        setCurrentUser(updated);
        setUserData(updated);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
