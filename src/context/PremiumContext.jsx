import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const PremiumContext = createContext(null);

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}

export function PremiumProvider({ children }) {
  const { user: currentUser } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpires, setPremiumExpires] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsPremium(false);
      setPremiumExpires(null);
      setLoading(false);
      return;
    }

    const checkPremium = async () => {
      try {
        const res = await fetch("/api/premium/status", {
          headers: { "X-User-Id": currentUser.uid },
        });

        if (res.ok) {
          const data = await res.json();
          setIsPremium(data.isPremium || false);
          setPremiumExpires(data.expiresAt || null);
        }
      } catch (error) {
        console.error("Check premium error:", error);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkPremium();
  }, [currentUser]);

  const value = {
    isPremium,
    premiumExpires,
    loading,
    setIsPremium, // для тестов/отладки
  };

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}
