import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Square, Trash2, ZoomIn, ZoomOut, Sparkles, Eraser, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBar } from "@/components/ProjectBar";
import { Button } from "@/components/ui/button";
import { Canvas } from "@/components/comandos/Canvas";
import { SimPanel } from "@/components/comandos/SimPanel";
import { SPECS, PALETTE, nextTag } from "@/components/comandos/specs";
import { exampleDiagram } from "@/components/comandos/example";
import { simulate, analyze, emptySim } from "@/lib/circuitSim";

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const Palette = ({ onAdd, disabled }) => (
  <div className="space-y-4" data-testid="comandos-palette">
    {PALETTE.map((g) => (
      <div key={g.group}>
        <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{g.group}</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {g.types.map((t) => (
            <button key={t} draggable={!disabled} disabled={disabled} onDragStart={(e) => e.dataTransfer.setData("comp-type", t)} onClick={() => onAdd(t)}
              data-testid={`palette-${t}`}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-amber-500 hover:text-amber-300 disabled:opacity-40">
              {SPECS[t].label}
            </button>
          ))}
        </div>
      </div>
    ))}
    <p className="flex gap-1.5 text-[11px] leading-relaxed text-slate-500"><MousePointerClick className="h-3.5 w-3.5 shrink-0" />Arraste para o canvas (ou clique). Puxe de um terminal até outro para criar o fio.</p>
  </div>
);

export default function Comandos() {
  const [comps, setComps] = useState([]);
  const [wires, setWires] = useState([]);
  const [mode, setMode] = useState("edit");
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(0.8);
  const [simState, setSimState] = useState(emptySim());
  const [checks, setChecks] = useState([]);

  const sim = useMemo(() => (mode === "sim" ? simulate(comps, wires, simState) : null), [mode, comps, wires, simState]);

  const addComp = (type, x, y) => {
    setComps((cs) => {
      const n = cs.length % 8;
      return [...cs, { id: uid(), type, tag: nextTag(cs, type), x: x ?? 60 + n * 30, y: y ?? 60 + n * 30 }];
    });
  };

  const addWire = (a, b) => {
    if (a.split(":")[0] === b.split(":")[0] && a === b) return;
    setWires((ws) => (ws.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a)) ? ws : [...ws, { id: uid(), a, b }]));
  };

  const removeSelected = useCallback(() => {
    if (!selected) return;
    if (selected.kind === "wire") setWires((ws) => ws.filter((w) => w.id !== selected.id));
    else {
      setComps((cs) => cs.filter((c) => c.id !== selected.id));
      setWires((ws) => ws.filter((w) => !w.a.startsWith(`${selected.id}:`) && !w.b.startsWith(`${selected.id}:`)));
    }
    setSelected(null);
  }, [selected]);

  useEffect(() => {
    const onKey = (e) => {
      if (mode !== "edit" || ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "Delete" || e.key === "Backspace") removeSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, removeSelected]);

  const apply = (next) => {
    const r = simulate(comps, wires, next);
    if (r.shorts.length) {
      const off = {};
      comps.filter((c) => c.type.startsWith("disjuntor")).forEach((c) => { off[c.id] = true; });
      const safe = { ...next, off, coils: {} };
      toast.error("Curto-circuito detectado! Disjuntores desarmados.");
      setSimState({ ...safe, coils: simulate(comps, wires, safe).coils });
      return;
    }
    setSimState({ ...next, coils: r.coils });
  };

  const startSim = () => {
    setSelected(null);
    setChecks(analyze(comps, wires));
    setMode("sim");
    apply(emptySim());
  };

  const onSimDown = (c) => {
    if (c.type === "botoeira_na" || c.type === "botoeira_nf") apply({ ...simState, pressed: { ...simState.pressed, [c.id]: true } });
    if (c.type.startsWith("disjuntor")) toggle("off", c);
    if (c.type === "rele_termico") toggle("tripped", c);
  };
  const onSimUp = () => { if (Object.keys(simState.pressed).length) apply({ ...simState, pressed: {} }); };
  const toggle = (k, c) => apply({ ...simState, [k]: { ...simState[k], [c.id]: !simState[k][c.id] } });

  const load = (data) => {
    setMode("edit");
    setSelected(null);
    setComps(data?.comps || []);
    setWires(data?.wires || []);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader eyebrow="Módulo · Comandos Elétricos" title="Editor de Comandos" desc="Monte o diagrama do zero (símbolos IEC/ABNT), ligue os terminais e simule a partida.">
        <ProjectBar type="comandos" defaultName="Partida direta" getData={() => ({ comps, wires })} onLoad={load} />
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-[#0F172A] px-4 py-2 sm:px-8">
        <div className="flex rounded-md border border-slate-700 p-0.5" data-testid="sim-mode-toggle">
          <button onClick={() => setMode("edit")} data-testid="mode-edit-button" className={`rounded px-3 py-1 text-xs font-medium ${mode === "edit" ? "bg-slate-700 text-white" : "text-slate-400"}`}>Edição</button>
          <button onClick={startSim} data-testid="btn-start-simulation" className={`rounded px-3 py-1 text-xs font-medium ${mode === "sim" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>
            <Play className="mr-1 inline h-3 w-3" />Simulação
          </button>
        </div>
        {mode === "sim" ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => apply(emptySim())} data-testid="btn-reset-simulation" className="text-slate-300"><Square className="mr-1 h-3.5 w-3.5" />Reiniciar</Button>
            <span className="flex items-center gap-1.5 text-xs font-mono text-amber-400"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />SIMULANDO</span>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" disabled={!selected} onClick={removeSelected} data-testid="delete-selected-button" className="text-slate-300 hover:text-red-400"><Trash2 className="mr-1 h-3.5 w-3.5" />Apagar seleção</Button>
            <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Limpar todo o diagrama?")) load(null); }} data-testid="clear-canvas-button" className="text-slate-300"><Eraser className="mr-1 h-3.5 w-3.5" />Limpar</Button>
            <Button size="sm" variant="ghost" onClick={() => load(exampleDiagram())} data-testid="load-example-button" className="text-amber-400"><Sparkles className="mr-1 h-3.5 w-3.5" />Exemplo: partida direta</Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))} data-testid="zoom-out-button"><ZoomOut className="h-4 w-4" /></Button>
          <span className="w-10 text-center font-mono text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(1)))} data-testid="zoom-in-button"><ZoomIn className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-slate-800 bg-[#0F172A] p-4 lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <Palette onAdd={(t) => addComp(t)} disabled={mode === "sim"} />
        </aside>
        <div className="min-h-[420px] flex-1 overflow-auto bg-[#0A0E17]" data-testid="canvas-scroll">
          <Canvas comps={comps} wires={wires} mode={mode} zoom={zoom} selected={selected} setSelected={setSelected} sim={sim} simState={simState}
            onMoveComp={(id, x, y) => setComps((cs) => cs.map((c) => (c.id === id ? { ...c, x, y } : c)))}
            onAddWire={addWire} onDropComp={addComp} onSimDown={onSimDown} onSimUp={onSimUp} />
        </div>
        {mode === "sim" && sim && (
          <aside className="shrink-0 border-t border-slate-800 bg-[#0F172A] p-4 lg:w-72 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <SimPanel comps={comps} sim={sim} simState={simState} checks={checks} onDown={onSimDown} onUp={onSimUp} onToggle={toggle} />
          </aside>
        )}
      </div>
    </div>
  );
}
