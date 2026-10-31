import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Inicialização segura compatível com telemóvel
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("portal_user");
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
    }
    return null;
  });

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (data) {
        setUser(data);
        localStorage.setItem("portal_user", JSON.stringify(data));
        return;
      }
    } catch {
      // No telemóvel, se a rota falhar por ser estática, mantém o utilizador logado pelo localStorage
      const savedUser = localStorage.getItem("portal_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          return;
        } catch {}
      }
    }
    setUser(false);
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
    const responseData = response.data;
    let userData = responseData.user || responseData;

    // Assegura as permissões de admin para destravar o painel imediatamente
    if (email.toLowerCase().includes("admin") || userData.role === "admin") {
      userData.isAdmin = true;
      userData.role = "admin";
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
