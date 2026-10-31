import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const out = () => setUser(false);
    window.addEventListener("auth:logout", out);
    window.addEventListener("auth:access", reload);
    return () => {
      window.removeEventListener("auth:logout", out);
      window.removeEventListener("auth:access", reload);
    };
  }, [reload]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(false);
  };

  return <AuthContext.Provider value={{ user, login, logout, reload }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
