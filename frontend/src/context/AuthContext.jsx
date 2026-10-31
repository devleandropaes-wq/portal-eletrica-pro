import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("portal_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      localStorage.setItem("portal_user", JSON.stringify(data));
    } catch {
      const savedUser = localStorage.getItem("portal_user");
      if (!savedUser) {
        setUser(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      reload();
    }
    const out = () => {
      setUser(false);
      localStorage.removeItem("portal_user");
    };
    const access = (event) => {
      if (event.detail) {
        setUser(event.detail);
        localStorage.setItem("portal_user", JSON.stringify(event.detail));
      } else {
        reload();
      }
    };

    window.addEventListener("auth:logout", out);
    window.addEventListener("auth:access", access);
    return () => {
      window.removeEventListener("auth:logout", out);
      window.removeEventListener("auth:access", access);
    };
  }, [reload, user]);

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
