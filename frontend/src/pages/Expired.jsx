import { Navigate } from "react-router-dom";
import { Clock, ShieldOff, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { FullLoader } from "@/components/RouteGuards";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/api";

export default function Expired() {
  const { user, logout } = useAuth();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.access_state === "active") return <Navigate to="/" replace />;
  const blocked = user.access_state === "blocked";
  const Icon = blocked ? ShieldOff : Clock;

  return (
    <div className="grid-bg grid min-h-screen place-items-center bg-[#0A0E17] p-6 text-slate-100">
      <div className="fade-up w-full max-w-lg rounded-xl border border-red-500/30 bg-[#111827] p-8" data-testid="expired-access-banner">
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-red-500/10 text-red-400">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-mono uppercase tracking-[0.2em] text-red-400">{blocked ? "Conta bloqueada" : "Licença vencida"}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" data-testid="expired-title">
          {blocked ? "Acesso Bloqueado" : "Acesso Expirado"}
        </h1>
        <p className="mt-3 text-slate-400">
          {blocked
            ? "Seu acesso foi bloqueado pelo administrador. Contate o Administrador para regularizar a sua conta."
            : `Sua licença de acesso venceu${user.expires_at ? ` em ${fmtDate(user.expires_at)}` : ""}. Contate o Administrador para adicionar um novo crédito de 30 dias.`}
        </p>
        <div className="mt-6 rounded-md border border-slate-800 bg-slate-900/60 p-4 font-mono text-xs text-slate-400">
          <p>USUÁRIO: <span className="text-slate-200">{user.email}</span></p>
          <p>CRÉDITOS USADOS: <span className="text-slate-200">{user.credits}</span></p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="expired-contact-admin-button">
            <a href="mailto:devleandropaes@gmail.com?subject=Renovação de acesso - Portal Elétrica Pro"><Mail className="mr-2 h-4 w-4" /> Contatar Administrador</a>
          </Button>
          <Button variant="outline" onClick={logout} className="border-slate-700 bg-transparent" data-testid="expired-logout-button">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
