import { useState } from "react";
import { FileText, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildMemorialPdf, memorialFilename } from "@/lib/memorial";

const TECH_KEY = "memorial_tech";
const readTech = () => {
  try { return JSON.parse(localStorage.getItem(TECH_KEY)) || {}; } catch { return {}; }
};

const F = ({ label, value, onChange, tid, placeholder }) => (
  <div className="space-y-1"><Label className="text-xs text-slate-400">{label}</Label>
    <Input value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="bg-slate-900" data-testid={tid} /></div>
);

export const MemorialButton = ({ load, size = "sm", compact = false, tid = "memorial-open-button" }) => {
  const [open, setOpen] = useState(false);
  const [memorial, setMemorial] = useState(null);
  const [tech, setTech] = useState(readTech);
  const [client, setClient] = useState({});
  const [busy, setBusy] = useState(false);

  const openDialog = async () => {
    try {
      const m = await load();
      if (!m) return;
      if (!m.circuits.length) return toast.error("Adicione ao menos um circuito antes de gerar o memorial");
      setMemorial(m);
      setOpen(true);
    } catch {
      toast.error("Não foi possível carregar o projeto");
    }
  };

  const make = () => {
    localStorage.setItem(TECH_KEY, JSON.stringify(tech));
    const doc = buildMemorialPdf(memorial, tech, client);
    return { doc, filename: memorialFilename(memorial.name) };
  };

  const download = () => {
    setBusy(true);
    try {
      const { doc, filename } = make();
      doc.save(filename);
      toast.success("PDF gerado");
    } finally { setBusy(false); }
  };

  const share = async () => {
    const { doc, filename } = make();
    const file = new File([doc.output("blob")], filename, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `Memorial - ${memorial.name}` }); } catch { /* cancelado */ }
    } else {
      doc.save(filename);
      toast.info("Compartilhamento não suportado neste navegador. O PDF foi baixado.");
    }
  };

  return (
    <>
      <Button size={size} onClick={openDialog} className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500" data-testid={tid}>
        <FileText className={compact ? "h-4 w-4" : "mr-1 h-4 w-4"} />{!compact && "Gerar Memorial Descritivo / PDF"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-[#111827] text-slate-100" data-testid="memorial-dialog">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Memorial Descritivo / PDF</DialogTitle>
            <DialogDescription className="text-slate-400">{memorial?.name} · campos em branco ficam como linha para preencher à mão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-500">Responsável técnico</p>
              <F label="Nome" value={tech.name} onChange={(v) => setTech({ ...tech, name: v })} tid="memorial-tech-name" />
              <div className="grid gap-2 sm:grid-cols-2">
                <F label="Registro (CFT / CREA)" value={tech.registry} onChange={(v) => setTech({ ...tech, registry: v })} tid="memorial-tech-registry" />
                <F label="Telefone / e-mail" value={tech.contact} onChange={(v) => setTech({ ...tech, contact: v })} tid="memorial-tech-contact" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-500">Cliente / local da instalação</p>
              <F label="Cliente" value={client.name} onChange={(v) => setClient({ ...client, name: v })} tid="memorial-client-name" />
              <F label="Endereço" value={client.address} onChange={(v) => setClient({ ...client, address: v })} tid="memorial-client-address" />
              <F label="Cidade / UF" value={client.city} onChange={(v) => setClient({ ...client, city: v })} tid="memorial-client-city" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={download} disabled={busy} className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="memorial-download-button"><Download className="mr-1 h-4 w-4" />Baixar PDF</Button>
              <Button onClick={share} variant="outline" className="flex-1 border-emerald-500/50 bg-transparent text-emerald-300" data-testid="memorial-share-button"><Share2 className="mr-1 h-4 w-4" />Compartilhar (WhatsApp)</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
