import { Link } from "react-router-dom";
import { Cpu, PanelTop, Calculator, FolderOpen, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { fmtDate } from "@/lib/api";

const MODULES = [
  { to: "/comandos", icon: Cpu, title: "Comandos Elétricos", desc: "Monte o diagrama de comando e força do zero, puxe os fios e simule a partida direta com selo.", tag: "Editor + Simulação", tid: "home-card-comandos" },
  { to: "/qdc", icon: PanelTop, title: "Simulador de QDC", desc: "Disjuntor geral, DR, DPS e circuitos divisionais com monitor de carga e desarme por sobrecarga.", tag: "Quadro interativo", tid: "home-card-qdc" },
  { to: "/dimensionamento", icon: Calculator, title: "Dimensionamento NBR 5410", desc: "Corrente de projeto, bitola do condutor, queda de tensão e disjuntor recomendado.", tag: "Cálculo passo a passo", tid: "home-card-dimensionamento" },
  { to: "/projetos", icon: FolderOpen, title: "Meus Projetos", desc: "Diagramas, quadros e quadros de carga salvos na sua conta.", tag: "Arquivo", tid: "home-card-projetos" },
];

const License = ({ user }) => (
  <div className="rounded-lg border border-slate-800 bg-[#111827] px-5 py-4" data-testid="home-license-card">
    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Status da licença</p>
    {user.role === "admin" ? (
      <p className="mt-1 flex items-center gap-2 font-['Outfit'] text-lg font-semibold text-amber-400"><ShieldCheck className="h-5 w-5" /> Administrador</p>
    ) : (
      <>
        <p className="mt-1 font-['Outfit'] text-2xl font-bold text-emerald-400">{user.days_left} dia(s)</p>
        <p className="text-xs text-slate-500">válida até {fmtDate(user.expires_at)}</p>
      </>
    )}
  </div>
);

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader eyebrow="Painel técnico" title={`Olá, ${user.name.split(" ")[0]}`} desc="Escolha um módulo para começar. Cada ferramenta funciona de forma independente e salva os projetos na sua conta.">
        <License user={user} />
      </PageHeader>
      <div className="grid gap-px bg-slate-800 sm:grid-cols-2">
        {MODULES.map((m, i) => (
          <Link key={m.to} to={m.to} data-testid={m.tid} style={{ animationDelay: `${i * 70}ms` }}
            className="fade-up group relative bg-[#0A0E17] p-8 transition-colors duration-300 hover:bg-[#111827] sm:p-10">
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-md border border-slate-700 text-amber-500 transition-colors group-hover:border-amber-500 group-hover:bg-amber-500/10">
                <m.icon className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-600 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-amber-400" />
            </div>
            <p className="mt-8 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{m.tag}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-50">{m.title}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
