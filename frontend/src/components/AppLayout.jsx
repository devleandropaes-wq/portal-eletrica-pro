import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Cpu, PanelTop, Calculator, FolderOpen, ShieldCheck, LogOut, Menu, Zap, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const TECH = [
  { to: "/", label: "Início", icon: LayoutDashboard, tid: "sidebar-link-inicio", end: true },
  { to: "/comandos", label: "Comandos Elétricos", icon: Cpu, tid: "sidebar-link-comandos" },
  { to: "/qdc", label: "Simulador de QDC", icon: PanelTop, tid: "sidebar-link-qdc" },
  { to: "/dimensionamento", label: "Dimensionamento NBR 5410", icon: Calculator, tid: "sidebar-link-dimensionamento" },
  { to: "/projetos", label: "Meus Projetos", icon: FolderOpen, tid: "sidebar-link-projetos" },
];

const Item = ({ item, onNav }) => (
  <NavLink
    to={item.to}
    end={item.end}
    onClick={onNav}
    data-testid={item.tid}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200 ${
        isActive ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-l-2 border-transparent"
      }`
    }
  >
    <item.icon className="h-4 w-4 shrink-0" />
    <span>{item.label}</span>
  </NavLink>
);

const Group = ({ title, children }) => (
  <div className="space-y-1">
    <p className="px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{title}</p>
    {children}
  </div>
);

const SidebarBody = ({ onNav }) => {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500 text-slate-950">
          <Zap className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-['Outfit'] text-lg font-bold leading-none text-slate-50">Elétrica Pro</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Portal técnico</p>
        </div>
      </div>
      <nav className="flex-1 space-y-8 overflow-y-auto px-3" data-testid="sidebar-nav">
        <Group title="Módulos Técnicos">
          {TECH.map((i) => <Item key={i.to} item={i} onNav={onNav} />)}
        </Group>
        {user?.role === "admin" && (
          <Group title="Administração">
            <Item item={{ to: "/admin", label: "Painel Admin", icon: ShieldCheck, tid: "sidebar-link-admin" }} onNav={onNav} />
          </Group>
        )}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <p className="truncate text-sm font-medium text-slate-200" data-testid="sidebar-user-name">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
        <p className="mt-1 text-[11px] font-mono text-amber-400" data-testid="sidebar-license">
          {user?.role === "admin" ? "ADMIN · acesso total" : `LICENÇA · ${user?.days_left ?? 0} dia(s)`}
        </p>
        <button onClick={logout} data-testid="logout-button" className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
};

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0E17] text-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-[#0F172A] lg:block">
        <SidebarBody />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-800 bg-[#0F172A]">
            <button className="absolute right-3 top-5 text-slate-400" onClick={() => setOpen(false)} data-testid="mobile-menu-close">
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-800 bg-[#0F172A] px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} data-testid="mobile-menu-button" className="text-slate-300">
            <Menu className="h-5 w-5" />
          </button>
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="font-['Outfit'] font-semibold">Elétrica Pro</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
