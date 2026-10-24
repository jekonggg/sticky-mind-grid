import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types/user";
import { TOKEN_STORAGE_KEY } from "@/config/api";
import { isJwtExpired } from "@/utils/authUtils";
import { authApi } from "@/services/authApi";
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

const getInitialAuthState = (): { user: User | null; token: string | null } => {
  try {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && !isJwtExpired(savedToken) && savedUser) {
      return {
        token: savedToken,
        user: JSON.parse(savedUser) as User,
      };
    } else if (savedToken && isJwtExpired(savedToken)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem("auth_user");
    }
  } catch {
    // Corrupted localStorage entry
  }
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialState] = useState(getInitialAuthState);
  const [user, setUser] = useState<User | null>(initialState.user);
  const [token, setToken] = useState<string | null>(initialState.token);
  const [loading, setLoading] = useState(false);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    sessionStorage.removeItem("login_prefill_email");
    sessionStorage.removeItem("dismiss_legacy_banner");
  };

  const logout = useCallback((showNotice: boolean = false) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("auth_user");
    sessionStorage.removeItem("login_prefill_email");
    sessionStorage.removeItem("dismiss_legacy_banner");
    sessionStorage.removeItem("dismiss_legacy_banner");
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
        // Synchronize fresh user profile and verification status from backend
        authApi.getMe(savedToken).then((freshUser) => {
          if (freshUser && freshUser.id) {
            setUser(freshUser);
            localStorage.setItem("auth_user", JSON.stringify(freshUser));
          }
        }).catch(() => {});
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
