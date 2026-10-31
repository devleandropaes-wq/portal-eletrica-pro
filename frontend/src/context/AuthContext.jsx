import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("portal_user");
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // Ignora erros de leitura do localStorage no telemóvel
    }
    return null;
  });

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (data) {
        setUser(data);
        localStorage.setItem("portal_user", JSON.stringify(data));
      }
    } catch {
      // No telemóvel, se a API falhar, NUNCA desloga se já houver dados salvos localmente
      const savedUser = localStorage.getItem("portal_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          return;
        } catch {}
      }
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
    const responseData = response.data;
    let userData = responseData.user || responseData;

    // Assegura as permissões de admin se for o seu email
    if (email.toLowerCase().includes("admin") || userData.role === "admin") {
      userData.isAdmin = true;
      userData.role = "admin";
    }

    setUser(userData);
    try {
      localStorage.setItem("portal_user", JSON.stringify(userData));
    } catch (e) {
      console.error("Erro ao gravar no localStorage do telemóvel", e);
    }
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
