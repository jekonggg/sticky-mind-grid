import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types/user";
import { TOKEN_STORAGE_KEY } from "@/config/api";
import { isJwtExpired } from "@/utils/authUtils";
import { toast } from "sonner";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: (showNotice?: boolean) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    localStorage.setItem("auth_user", JSON.stringify(userData));
  };

  const logout = useCallback((showNotice: boolean = false) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("auth_user");
    if (showNotice) {
      toast.info("Your session has expired. Please log in again.");
    }
  }, []);

  // 1. Initial token & session validation on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && !isJwtExpired(savedToken) && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        logout();
      }
    } else if (savedToken && isJwtExpired(savedToken)) {
      // Immediate clean-up for expired session with zero network delay
      logout();
    }
    setLoading(false);
  }, [logout]);

  // 2. Fast Session Inactivity Check on Tab Focus, Visibility Change, and interval
  useEffect(() => {
    const checkSession = () => {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken && isJwtExpired(currentToken)) {
        logout(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    const handleSessionExpiredEvent = () => {
      logout(true);
    };

    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("auth:session-expired", handleSessionExpiredEvent);

    // Periodic check every 15 seconds
    const intervalId = setInterval(checkSession, 15000);

    return () => {
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("auth:session-expired", handleSessionExpiredEvent);
      clearInterval(intervalId);
    };
  }, [logout]);

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem("auth_user", JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
