import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface UserT {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  bio?: string;
  total_paid?: number;
  bills_sponsored?: number;
}

interface AuthContextType {
  user: UserT | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "register";
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
  login: (handle: string, password: string) => Promise<void>;
  register: (name: string, handle: string, password: string, bio?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserT | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  // Load persisted user & token on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("help_me_pay_token");
      const storedUser = localStorage.getItem("help_me_pay_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token with backend
        api
          .getMe()
          .then((res) => {
            if (res.user) {
              setUser(res.user);
              localStorage.setItem("help_me_pay_user", JSON.stringify(res.user));
            }
          })
          .catch(() => {
            // Token expired or invalid, reset
            api.logout();
            setUser(null);
            setToken(null);
          });
      }
    } catch (e) {
      console.warn("Failed restoring auth session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (handle: string, password: string) => {
    const res = await api.login({ handle, password });
    localStorage.setItem("help_me_pay_token", res.token);
    localStorage.setItem("help_me_pay_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsAuthModalOpen(false);
    toast.success(`Welcome back, ${res.user.name}! 👋`, {
      description: "Signed in successfully.",
    });
  };

  const register = async (name: string, handle: string, password: string, bio?: string) => {
    const res = await api.register({ name, handle, password, bio });
    localStorage.setItem("help_me_pay_token", res.token);
    localStorage.setItem("help_me_pay_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsAuthModalOpen(false);
    toast.success(`Welcome to HelpMePay, ${name}! 🎉`, {
      description: "Your account is ready. Start sponsoring or posting wishes.",
    });
  };

  const logout = () => {
    api.logout();
    setToken(null);
    setUser(null);
    toast.info("Signed out successfully.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
