import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, PanelTop, Calculator, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MemorialButton } from "@/components/MemorialButton";
import { memorialFromNbr, memorialFromQdc } from "@/lib/memorial";

const loadMemorial = async (p) => {
  const { data } = await api.get(`/projects/${p.id}`);
  return (p.type === "qdc" ? memorialFromQdc : memorialFromNbr)(data.data, data.name);
};

const TYPES = {
  comandos: { label: "Comandos", icon: Cpu, path: "/comandos" },
  qdc: { label: "QDC", icon: PanelTop, path: "/qdc" },
  nbr: { label: "NBR 5410", icon: Calculator, path: "/dimensionamento" },
};
const FILTERS = [["", "Todos"], ["comandos", "Comandos"], ["qdc", "QDC"], ["nbr", "NBR 5410"]];

export default function Projetos() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");

  useEffect(() => {
    api.get("/projects", { params: type ? { type } : {} }).then(({ data }) => setItems(data)).catch((e) => toast.error(errMsg(e)));
  }, [type]);

  const remove = async (p) => {
    if (!window.confirm(`Excluir o projeto "${p.name}"?`)) return;
    try {
      await api.delete(`/projects/${p.id}`);
      setItems((xs) => xs.filter((x) => x.id !== p.id));
      toast.success("Projeto excluído");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Arquivo" title="Meus Projetos" desc="Somente você tem acesso aos projetos salvos na sua conta." />
      <div className="p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} data-testid={`projects-filter-${v || "all"}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${type === v ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-700 text-slate-400 hover:text-slate-100"}`}>{l}</button>
          ))}
        </div>
        {!items.length ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-12 text-center" data-testid="projects-empty">
            <FolderOpen className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-slate-400">Nenhum projeto salvo ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="projects-list">
            {items.map((p) => {
              const t = TYPES[p.type];
              return (
                <div key={p.id} className="flex items-center gap-4 rounded-lg border border-slate-800 bg-[#111827] p-4 transition-colors hover:border-slate-600" data-testid={`project-card-${p.id}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-500"><t.icon className="h-5 w-5" /></div>
                  <Link to={`${t.path}?projeto=${p.id}`} className="min-w-0 flex-1" data-testid={`project-open-${p.id}`}>
                    <p className="truncate font-medium text-slate-100 hover:text-amber-400">{p.name}</p>
                    <p className="text-xs font-mono text-slate-500">{t.label} · {fmtDate(p.updated_at)}</p>
                  </Link>
                  {p.type !== "comandos" && <MemorialButton compact size="icon" tid={`project-memorial-${p.id}`} load={() => loadMemorial(p)} />}
                  <Button size="icon" variant="ghost" onClick={() => remove(p)} className="text-slate-500 hover:text-red-400" data-testid={`project-delete-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
