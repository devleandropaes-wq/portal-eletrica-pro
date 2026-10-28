import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth, RequireAdmin } from "@/components/RouteGuards";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Expired from "@/pages/Expired";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Comandos from "@/pages/Comandos";
import Qdc from "@/pages/Qdc";
import Dimensionamento from "@/pages/Dimensionamento";
import Projetos from "@/pages/Projetos";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/acesso-expirado" element={<Expired />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Home />} />
            <Route path="comandos" element={<Comandos />} />
            <Route path="qdc" element={<Qdc />} />
            <Route path="dimensionamento" element={<Dimensionamento />} />
            <Route path="projetos" element={<Projetos />} />
            <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="bottom-right" richColors />
    </AuthProvider>
  );
}

export default App;
