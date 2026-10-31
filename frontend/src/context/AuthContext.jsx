import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Recupera o utilizador do localStorage de forma segura
    const savedUser = localStorage.getItem("portal_user");
    try {
      return savedUser ? JSON.parse(savedUser) : false;
    } catch {
      return false;
    }
  });

  const reload = useCallback(async () => {
    // Como é um app estático, apenas revalida o que está no localStorage
    const savedUser = localStorage.getItem("portal_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(false);
      }
    } else {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    const out = () => {
      setUser(false);
      localStorage.removeItem("portal_user");
    };

    const access = (event) => {
      if (event.detail) {
        setUser(event.detail);
        localStorage.setItem("portal_user", JSON.stringify(event.detail));
      }
    };

    window.addEventListener("auth:logout", out);
    window.addEventListener("auth:access", access);
    return () => {
      window.removeEventListener("auth:logout", out);
      window.removeEventListener("auth:access", access);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    localStorage.setItem("portal_user", JSON.stringify(data));
    return data;
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(false);
    localStorage.removeItem("portal_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, reload }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
