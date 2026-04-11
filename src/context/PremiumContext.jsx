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
  const { currentUser } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    const checkPremium = async () => {
      try {
        const res = await fetch("/api/premium/status");
        const data = await res.json();
        setIsPremium(data.isPremium);
        setExpiresAt(data.expiresAt);
      } catch (error) {
        console.error("Premium check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPremium();
  }, [currentUser]);

  const activatePremium = async (paymentMethod) => {
    try {
      // 🔷 ДЛЯ СБП ВРУЧНУЮ — вызываем claim endpoint
      if (paymentMethod === "sbp_manual") {
        const res = await fetch("/api/premium/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionInfo: "СБП перевод на карту",
            paymentProof: "manual_confirmation",
          }),
        });

        const data = await res.json();
        if (data.success) {
          setIsPremium(true);
          setExpiresAt(data.expiresAt);
          return { success: true, message: data.message };
        }
        return { success: false, error: data.error };
      }

      // 🔷 ДЛЯ ДРУГИХ МЕТОДОВ (будущее: Юмани, карты и т.д.)
      const res = await fetch("/api/premium/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });

      const data = await res.json();
      if (data.success) {
        setIsPremium(true);
        setExpiresAt(data.expiresAt);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    isPremium,
    expiresAt,
    loading,
    activatePremium,
    price: 199,
    currency: "RUB",
  };

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}
