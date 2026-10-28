import { useMemo, useState } from "react";
import { Plus, Trash2, Zap, ShieldAlert, Activity, CloudLightning, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBar } from "@/components/ProjectBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RATINGS = [25, 32, 40, 50, 63, 70, 80, 100];
const BREAKERS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
const PRESETS = {
  iluminacao: { name: "Iluminação", power: 600, voltage: 127, breaker: 10 },
  tug: { name: "Tomadas de uso geral", power: 1200, voltage: 127, breaker: 20 },
  chuveiro: { name: "Chuveiro", power: 5500, voltage: 220, breaker: 32 },
  ar: { name: "Ar-condicionado", power: 1800, voltage: 220, breaker: 16 },
};
const POLES = { 1: { label: "Monofásico", sys: "127 V · F+N", div: 127 }, 2: { label: "Bifásico", sys: "127/220 V · 2F+N", div: 220 }, 3: { label: "Trifásico", sys: "127/220 V · 3F+N", div: Math.sqrt(3) * 220 } };

const uid = () => Math.random().toString(36).slice(2, 9);
const mk = (kind, extra = {}) => ({ id: uid(), ...PRESETS[kind], on: true, tripped: false, ...extra });
const initial = () => ({
  main: { poles: 2, rating: 63, on: true, tripped: false },
  dr: { on: true },
  dps: { installed: true, surges: 0 },
  circuits: [mk("iluminacao"), mk("tug", { name: "TUGs sala/quartos" }), mk("tug", { name: "TUGs cozinha/serviço", power: 1500 }), mk("chuveiro"), mk("ar")],
});

const amps = (c) => c.power / c.voltage;
const supported = (q, c) => !(q.main.poles === 1 && c.voltage === 220);
const live = (q, c) => q.main.on && q.dr.on && c.on && supported(q, c);

function evaluate(q) {
  const events = [];
  const circuits = q.circuits.map((c) => {
    if (c.on && amps(c) > c.breaker) {
      events.push(`Disjuntor "${c.name}" desarmou: ${amps(c).toFixed(1)} A > ${c.breaker} A`);
      return { ...c, on: false, tripped: true };
    }
    return c;
  });
  let next = { ...q, circuits };
  const P = circuits.filter((c) => live(next, c)).reduce((s, c) => s + Number(c.power), 0);
  const I = P / POLES[q.main.poles].div;
  if (q.main.on && I > q.main.rating) {
    events.push(`SOBRECARGA! Disjuntor geral desarmou: ${I.toFixed(1)} A > ${q.main.rating} A`);
    next = { ...next, main: { ...next.main, on: false, tripped: true } };
  }
  return { next, events };
}

const Lever = ({ on, onClick, tid, size = "h-14" }) => (
  <button onClick={onClick} data-testid={tid} aria-pressed={on}
    className={`relative ${size} w-7 rounded-sm border border-slate-600 bg-slate-950 transition-colors`}>
    <span className={`absolute left-0.5 right-0.5 h-1/2 rounded-sm transition-all duration-200 ${on ? "top-0.5 bg-emerald-500" : "bottom-0.5 bg-red-500"}`} />
  </button>
);

const Module = ({ w = "w-24", title, sub, children, tid, alert }) => (
  <div className={`${w} flex shrink-0 flex-col items-center gap-2 rounded-md border ${alert ? "border-red-500/60" : "border-slate-600"} bg-gradient-to-b from-slate-200 to-slate-300 p-2 text-slate-900`} data-testid={tid}>
    <p className="w-full truncate text-center text-[10px] font-bold uppercase" title={title}>{title}</p>
    {children}
    <p className="w-full truncate text-center font-mono text-[10px]">{sub}</p>
  </div>
);

const Meter = ({ P, I, rating, poles }) => {
  const pct = Math.min(130, (I / rating) * 100);
  const color = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-5" data-testid="qdc-load-meter">
      <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500"><Activity className="h-3.5 w-3.5" />Monitor de carga total</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div><p className="font-['Outfit'] text-3xl font-bold" data-testid="qdc-total-power">{P.toLocaleString("pt-BR")}<span className="ml-1 text-sm text-slate-400">W</span></p><p className="text-xs text-slate-500">potência ativa</p></div>
        <div><p className="font-['Outfit'] text-3xl font-bold text-amber-400" data-testid="qdc-total-current">{I.toFixed(1)}<span className="ml-1 text-sm text-slate-400">A</span></p><p className="text-xs text-slate-500">por fase · {POLES[poles].sys}</p></div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800"><div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <p className="mt-2 flex justify-between font-mono text-xs text-slate-400"><span data-testid="qdc-load-percent">{pct.toFixed(0)}% do geral</span><span>{rating} A</span></p>
      {pct > 80 && pct <= 100 && <p className="mt-3 text-xs text-amber-400" data-testid="qdc-load-warning">Atenção: carga acima de 80% da capacidade do disjuntor geral.</p>}
    </div>
  );
};

const CircuitRow = ({ c, i, q, upd, remove }) => (
  <tr className="border-b border-slate-800/60" data-testid={`qdc-circuit-row-${i}`}>
    <td className="px-3 py-2 font-mono text-xs text-amber-500">C{i + 1}</td>
    <td className="px-3 py-2"><Input value={c.name} onChange={(e) => upd({ name: e.target.value })} className="h-8 bg-slate-900" data-testid={`qdc-circuit-name-${i}`} /></td>
    <td className="px-3 py-2"><Input type="number" min="0" value={c.power} onChange={(e) => upd({ power: Number(e.target.value) })} className="h-8 w-24 bg-slate-900" data-testid={`qdc-circuit-power-${i}`} /></td>
    <td className="px-3 py-2">
      <select value={c.voltage} onChange={(e) => upd({ voltage: Number(e.target.value) })} className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm" data-testid={`qdc-circuit-voltage-${i}`}>
        <option value={127}>127 V</option><option value={220}>220 V</option>
      </select>
    </td>
    <td className="px-3 py-2">
      <select value={c.breaker} onChange={(e) => upd({ breaker: Number(e.target.value) })} className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm" data-testid={`qdc-circuit-breaker-${i}`}>
        {BREAKERS.map((b) => <option key={b} value={b}>{b} A</option>)}
      </select>
    </td>
    <td className="px-3 py-2 font-mono text-xs">
      <span className={amps(c) > c.breaker ? "text-red-400" : "text-slate-300"}>{amps(c).toFixed(1)} A</span>
      {!supported(q, c) && <span className="block text-red-400">requer geral 2P/3P</span>}
    </td>
    <td className="px-3 py-2 text-right"><button onClick={remove} className="text-slate-500 hover:text-red-400" data-testid={`qdc-circuit-remove-${i}`}><Trash2 className="h-4 w-4" /></button></td>
  </tr>
);

export default function Qdc() {
  const [q, setQ] = useState(initial);

  const commit = (nq) => {
    const { next, events } = evaluate(nq);
    events.forEach((e) => toast.error(e));
    setQ(next);
  };

  const { P, I } = useMemo(() => {
    const p = q.circuits.filter((c) => live(q, c)).reduce((s, c) => s + Number(c.power), 0);
    return { P: p, I: p / POLES[q.main.poles].div };
  }, [q]);

  const updCircuit = (id, patch) => commit({ ...q, circuits: q.circuits.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const toggleMain = () => commit({ ...q, main: { ...q.main, on: !q.main.on, tripped: false } });
  const testDr = () => { setQ({ ...q, dr: { on: false, tested: true } }); toast.success("Botão TESTE: DR desarmou corretamente (fuga simulada de 30 mA)."); };
  const surge = () => {
    if (q.dps.installed) { setQ({ ...q, dps: { ...q.dps, surges: q.dps.surges + 1 } }); toast.success("Surto de tensão drenado para o terra pelo DPS. Equipamentos protegidos."); }
    else toast.error("Sem DPS: o surto atingiu os equipamentos ligados aos circuitos!");
  };
  const load = (d) => setQ(d || initial());

  return (
    <div>
      <PageHeader eyebrow="Módulo · Quadros de Distribuição" title="Simulador de QDC" desc="Monte o quadro, ligue e desligue os disjuntores, teste o DR e acompanhe a carga total em tempo real.">
        <ProjectBar type="qdc" defaultName="QDC residencial" getData={() => q} onLoad={load} />
      </PageHeader>
      <div className="grid gap-6 p-4 sm:p-8 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-[#111827] p-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Disjuntor geral</span>
            {[1, 2, 3].map((p) => (
              <button key={p} onClick={() => commit({ ...q, main: { ...q.main, poles: p } })} data-testid={`qdc-main-poles-${p}`}
                className={`rounded-md border px-3 py-1.5 text-xs ${q.main.poles === p ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-400"}`}>{POLES[p].label} ({p}P)</button>
            ))}
            <select value={q.main.rating} onChange={(e) => commit({ ...q, main: { ...q.main, rating: Number(e.target.value) } })} data-testid="qdc-main-rating-select"
              className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm">
              {RATINGS.map((r) => <option key={r} value={r}>{r} A</option>)}
            </select>
          </div>

          <div className="rounded-xl border-4 border-slate-700 bg-[#1a2233] p-4 sm:p-6" data-testid="qdc-panel">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs text-slate-400">QDC · {POLES[q.main.poles].sys}</p>
              <span className={`flex items-center gap-1.5 font-mono text-xs ${q.main.on && q.dr.on ? "text-emerald-400" : "text-red-400"}`} data-testid="qdc-bus-status">
                <span className={`h-2 w-2 rounded-full ${q.main.on && q.dr.on ? "bg-emerald-500" : "bg-red-500 blink"}`} />{q.main.on && q.dr.on ? "BARRAMENTO ENERGIZADO" : "BARRAMENTO DESENERGIZADO"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 border-y-[6px] border-slate-500/50 bg-slate-800/60 p-3">
              <Module w={q.main.poles === 3 ? "w-32" : "w-24"} title="Geral" sub={`${q.main.poles}P · ${q.main.rating} A`} tid="qdc-main-module" alert={q.main.tripped}>
                <Lever on={q.main.on} onClick={toggleMain} tid="qdc-main-breaker-switch" size="h-16" />
                {q.main.tripped && <span className="text-[9px] font-bold text-red-600" data-testid="qdc-main-tripped">DESARMADO</span>}
              </Module>
              <Module w="w-28" title="DR 30 mA" sub="IDR 63 A" tid="qdc-dr-module" alert={!q.dr.on}>
                <div className="flex items-center gap-2">
                  <Lever on={q.dr.on} onClick={() => commit({ ...q, dr: { on: !q.dr.on } })} tid="qdc-dr-switch" />
                  <button onClick={testDr} disabled={!q.dr.on} data-testid="qdc-dr-test-button" className="grid h-8 w-8 place-items-center rounded-full border-2 border-slate-700 bg-yellow-400 text-xs font-bold text-slate-900 transition-transform active:scale-90 disabled:opacity-50">T</button>
                </div>
              </Module>
              <Module w="w-24" title="DPS" sub={q.dps.installed ? `Classe II · ${q.dps.surges} surto(s)` : "removido"} tid="qdc-dps-module">
                <span className={`h-4 w-10 rounded-sm ${q.dps.installed ? "bg-emerald-500" : "bg-slate-500"}`} data-testid="qdc-dps-status" />
                <button onClick={() => setQ({ ...q, dps: { ...q.dps, installed: !q.dps.installed } })} className="text-[9px] font-bold underline" data-testid="qdc-dps-toggle">{q.dps.installed ? "Remover" : "Instalar"}</button>
              </Module>
              {q.circuits.map((c, i) => (
                <Module key={c.id} w="w-20" title={`C${i + 1} · ${c.name}`} sub={`${c.breaker} A`} tid={`qdc-breaker-module-${i}`} alert={c.tripped}>
                  <Lever on={c.on} onClick={() => updCircuit(c.id, { on: !c.on, tripped: false })} tid={`qdc-breaker-switch-${i}`} />
                  <span className={`h-1.5 w-8 rounded-full ${live(q, c) ? "bg-emerald-500" : "bg-slate-500"}`} data-testid={`qdc-breaker-live-${i}`} />
                </Module>
              ))}
            </div>
            {!q.dr.on && <p className="mt-3 flex items-center gap-2 text-xs text-red-300" data-testid="qdc-dr-tripped"><ShieldAlert className="h-4 w-4" />DR desarmado: todos os circuitos protegidos estão sem energia. Rearme pela alavanca do DR.</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((k) => (
              <Button key={k} size="sm" variant="outline" onClick={() => commit({ ...q, circuits: [...q.circuits, mk(k)] })} className="border-slate-700 bg-transparent" data-testid={`qdc-add-${k}`}>
                <Plus className="mr-1 h-3.5 w-3.5" />{PRESETS[k].name}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={surge} className="border-amber-500/40 bg-transparent text-amber-300" data-testid="qdc-dps-surge-button"><CloudLightning className="mr-1 h-3.5 w-3.5" />Simular surto</Button>
            <Button size="sm" variant="ghost" onClick={() => setQ(initial())} data-testid="qdc-reset-button"><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar padrão</Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#111827]">
            <table className="w-full min-w-[680px] text-left text-sm" data-testid="qdc-circuit-table">
              <thead className="border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Circuito</th><th className="px-3 py-2">Potência (W)</th><th className="px-3 py-2">Tensão</th><th className="px-3 py-2">Disjuntor</th><th className="px-3 py-2">Corrente</th><th /></tr>
              </thead>
              <tbody>
                {q.circuits.map((c, i) => <CircuitRow key={c.id} c={c} i={i} q={q} upd={(p) => updCircuit(c.id, p)} remove={() => setQ({ ...q, circuits: q.circuits.filter((x) => x.id !== c.id) })} />)}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <Meter P={P} I={I} rating={q.main.rating} poles={q.main.poles} />
          <div className="rounded-lg border border-slate-800 bg-[#111827] p-5 text-xs leading-relaxed text-slate-400">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500"><Zap className="h-3.5 w-3.5" />Como funciona</p>
            <p>A corrente de cada circuito é P/V. Se ultrapassar o disjuntor divisional, ele desarma. A corrente do geral considera carga equilibrada entre as fases; acima da capacidade, o geral desarma automaticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
