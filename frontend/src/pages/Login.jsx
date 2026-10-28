import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Zap, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Visual = () => (
  <div className="relative hidden overflow-hidden border-r border-slate-800 bg-[#0F172A] lg:flex lg:flex-col lg:justify-between lg:p-12">
    <div className="grid-bg absolute inset-0" />
    <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
      <path d="M60 120 H300 V340 H520" stroke="#F59E0B" strokeWidth="2" fill="none" className="wire-phase" />
      <path d="M60 220 H200 V560 H520" stroke="#3B82F6" strokeWidth="2" fill="none" />
      <path d="M380 340 V700" stroke="#F59E0B" strokeWidth="2" fill="none" strokeDasharray="6 6" />
      <circle cx="380" cy="560" r="44" stroke="#CBD5E1" strokeWidth="2" fill="none" />
      <text x="380" y="566" textAnchor="middle" fill="#CBD5E1" fontFamily="JetBrains Mono" fontSize="22">M 3~</text>
    </svg>
    <div className="relative flex items-center gap-2">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-amber-500 text-slate-950"><Zap className="h-5 w-5" /></div>
      <span className="font-['Outfit'] text-xl font-bold">Portal Elétrica Pro</span>
    </div>
    <div className="relative max-w-md">
      <p className="text-xs font-mono uppercase tracking-[0.25em] text-amber-500">Comandos · QDC · NBR 5410</p>
      <h2 className="mt-3 font-['Outfit'] text-4xl font-bold leading-tight text-slate-50">Monte, simule e dimensione instalações elétricas.</h2>
      <p className="mt-4 text-slate-400">Editor de diagramas com simulação real, quadro de distribuição interativo e cálculo de circuitos conforme a norma.</p>
    </div>
  </div>
);

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.access_state === "active" ? "/" : "/acesso-expirado"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#0A0E17] text-slate-100 lg:grid-cols-2">
      <Visual />
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="fade-up w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-amber-500">Acesso restrito</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Entrar</h1>
            <p className="mt-2 text-sm text-slate-400">Use as credenciais fornecidas pelo administrador.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-slate-900 pl-9" data-testid="login-email-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-slate-900 pl-9" data-testid="login-password-input" />
            </div>
          </div>
          {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400" data-testid="login-error">{error}</p>}
          <Button type="submit" disabled={loading} className="h-11 w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400" data-testid="login-submit-button">
            {loading ? "Entrando..." : "Entrar"} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-slate-500">Não tem acesso? Solicite ao administrador do portal.</p>
        </form>
      </div>
    </div>
  );
}
