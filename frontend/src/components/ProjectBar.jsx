import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const ProjectBar = ({ type, getData, onLoad, defaultName }) => {
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(null);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pid = params.get("projeto");
    if (!pid || pid === id) return;
    api.get(`/projects/${pid}`)
      .then(({ data }) => { setId(data.id); setName(data.name); onLoad(data.data); toast.success(`Projeto "${data.name}" carregado`); })
      .catch(() => toast.error("Projeto não encontrado"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const save = async () => {
    if (!name.trim()) return toast.error("Informe um nome para o projeto");
    setSaving(true);
    try {
      const body = { name: name.trim(), type, data: getData() };
      if (id) {
        await api.put(`/projects/${id}`, body);
      } else {
        const { data } = await api.post("/projects", body);
        setId(data.id);
        setParams({ projeto: data.id });
      }
      toast.success("Projeto salvo");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setId(null);
    setName(defaultName);
    setParams({});
    onLoad(null);
  };

  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-44 bg-slate-900 sm:w-56" data-testid={`${type}-project-name-input`} />
      <Button size="sm" onClick={save} disabled={saving} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid={`${type}-save-project-button`}>
        <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
      </Button>
      <Button size="sm" variant="outline" onClick={reset} className="border-slate-700 bg-transparent" data-testid={`${type}-new-project-button`}>
        <FilePlus2 className="mr-1 h-4 w-4" /> Novo
      </Button>
    </div>
  );
};
