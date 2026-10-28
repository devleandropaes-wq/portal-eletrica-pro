import { Navigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const FullLoader = () => (
  <div className="min-h-screen grid place-items-center bg-[#0A0E17]" data-testid="app-loader">
    <Zap className="h-10 w-10 text-amber-500 animate-pulse" />
  </div>
);

export const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.access_state !== "active") return <Navigate to="/acesso-expirado" replace />;
  return children;
};

export const RequireAdmin = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
};
