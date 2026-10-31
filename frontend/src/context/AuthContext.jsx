import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("portal_user");
    try {
      return savedUser ? JSON.parse(savedUser) : false;
    } catch {
      return false;
    }
  });

  const reload = useCallback(async () => {
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
    const response = await api.post("/auth/login", { email, password });
    
    // Captura os dados do utilizador independentemente de vir em response.data.user ou direto em response.data
    const responseData = response.data;
    const userData = responseData.user || responseData;

    // Se a API retornar um token separado, garante que ele fica anexado ao objeto do utilizador
    if (responseData.token && !userData.token) {
      userData.token = responseData.token;
    }

    setUser(userData);
    localStorage.setItem("portal_user", JSON.stringify(userData));
    return userData;
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
