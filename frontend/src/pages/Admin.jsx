import { useEffect, useMemo, useState } from "react";
import { UserPlus, Search, CalendarPlus, Lock, Unlock, Users, UserCheck, Clock, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATE = {
  active: { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  expired: { label: "Expirado", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  blocked: { label: "Bloqueado", cls: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const Stat = ({ icon: Icon, label, value, tid }) => (
  <div className="bg-[#0A0E17] p-5" data-testid={tid}>
    <Icon className="h-4 w-4 text-slate-500" />
    <p className="mt-3 font-['Outfit'] text-3xl font-bold">{value}</p>
    <p className="text-xs font-mono uppercase tracking-wider text-slate-500">{label}</p>
  </div>
);

const EMPTY = { name: "", email: "", password: "", role: "client", credits: "1" };

const CreateDialog = ({ open, onOpenChange, onCreated }) => {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/admin/users", { ...f, credits: Number(f.credits) });
      toast.success(`Usuário ${data.email} criado`);
      onCreated(data);
      setF(EMPTY);
      onOpenChange(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-[#111827] text-slate-100" data-testid="admin-create-user-dialog">
        <DialogHeader><DialogTitle className="font-['Outfit']">Novo usuário</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Nome</Label><Input required value={f.name} onChange={set("name")} className="bg-slate-900" data-testid="admin-new-user-name" /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input required type="email" value={f.email} onChange={set("email")} className="bg-slate-900" data-testid="admin-new-user-email" /></div>
          <div className="space-y-1.5"><Label>Senha (mín. 6)</Label><Input required minLength={6} value={f.password} onChange={set("password")} className="bg-slate-900" data-testid="admin-new-user-password" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={f.role} onValueChange={set("role")}>
                <SelectTrigger className="bg-slate-900" data-testid="admin-new-user-role"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="client">Cliente</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Créditos iniciais</Label>
              <Select value={f.credits} onValueChange={set("credits")}>
                <SelectTrigger className="bg-slate-900" data-testid="admin-new-user-credits"><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 1, 2, 3, 6, 12].map((c) => <SelectItem key={c} value={String(c)}>{c} ({c * 30} dias)</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="admin-create-user-submit">{busy ? "Criando..." : "Criar usuário"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ u, me, onUpdate }) => {
  const [busy, setBusy] = useState(false);
  const act = async (path, msg) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/users/${u.id}/${path}`);
      onUpdate(data);
      toast.success(msg(data));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const st = STATE[u.access_state];
  return (
    <tr className="border-b border-slate-800/70 transition-colors hover:bg-slate-900/50" data-testid={`admin-user-row-${u.id}`}>
      <td className="px-4 py-3"><p className="font-medium text-slate-100">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
      <td className="px-4 py-3 font-mono text-xs uppercase text-slate-400">{u.role === "admin" ? "admin" : "cliente"}</td>
      <td className="px-4 py-3"><span className={`rounded border px-2 py-0.5 text-xs ${st.cls}`} data-testid={`admin-user-state-${u.id}`}>{st.label}</span></td>
      <td className="px-4 py-3 font-mono text-xs text-slate-300" data-testid={`admin-user-expires-${u.id}`}>
        {u.role === "admin" ? "—" : <>{fmtDate(u.expires_at)}<span className="block text-slate-500">{u.days_left ?? 0} dia(s)</span></>}
      </td>
      <td className="px-4 py-3 font-mono text-sm" data-testid={`admin-user-credits-${u.id}`}>{u.credits}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" disabled={busy} onClick={() => act("credit", (d) => `+30 dias para ${d.email} (até ${fmtDate(d.expires_at)})`)}
            className="bg-emerald-600 text-white hover:bg-emerald-500" data-testid={`admin-add-credit-button-${u.id}`}>
            <CalendarPlus className="mr-1 h-4 w-4" /> Adicionar 1 Crédito (+30 dias)
          </Button>
          <Button size="sm" variant="outline" disabled={busy || u.id === me} onClick={() => act("toggle-status", (d) => `${d.email}: ${d.status === "active" ? "ativado" : "bloqueado"}`)}
            className={`bg-transparent ${u.status === "active" ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"}`}
            data-testid={`admin-toggle-status-button-${u.id}`}>
            {u.status === "active" ? <><Lock className="mr-1 h-4 w-4" /> Bloquear</> : <><Unlock className="mr-1 h-4 w-4" /> Ativar</>}
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/admin/users").then(({ data }) => setUsers(data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  const update = (d) => setUsers((us) => us.map((u) => (u.id === d.id ? d : u)));
  const filtered = useMemo(() => users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [users, q]);
  const clients = users.filter((u) => u.role === "client");
  const count = (s) => clients.filter((u) => u.access_state === s).length;

  return (
    <div>
      <PageHeader eyebrow="Administração · SaaS" title="Painel de Licenciamento" desc="Gerencie clientes, créditos de acesso (30 dias cada) e bloqueios.">
        <Button onClick={() => setOpen(true)} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="admin-add-user-button">
          <UserPlus className="mr-2 h-4 w-4" /> Novo usuário
        </Button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-px border-b border-slate-800 bg-slate-800 md:grid-cols-4">
        <Stat icon={Users} label="Clientes" value={clients.length} tid="admin-stat-total" />
        <Stat icon={UserCheck} label="Ativos" value={count("active")} tid="admin-stat-active" />
        <Stat icon={Clock} label="Expirados" value={count("expired")} tid="admin-stat-expired" />
        <Stat icon={ShieldOff} label="Bloqueados" value={count("blocked")} tid="admin-stat-blocked" />
      </div>
      <div className="p-4 sm:p-8">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="bg-slate-900 pl-9" data-testid="admin-search-input" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#111827]">
          <table className="w-full min-w-[860px] text-left text-sm" data-testid="admin-user-table">
            <thead className="border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Validade</th><th className="px-4 py-3">Créditos</th><th className="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody>{filtered.map((u) => <Row key={u.id} u={u} me={user.id} onUpdate={update} />)}</tbody>
          </table>
          {!filtered.length && <p className="p-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>}
        </div>
      </div>
      <CreateDialog open={open} onOpenChange={setOpen} onCreated={(d) => setUsers((us) => [d, ...us])} />
    </div>
  );
}
