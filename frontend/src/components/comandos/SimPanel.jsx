import { CheckCircle2, XCircle, AlertTriangle, Power, RotateCcw } from "lucide-react";

const Checklist = ({ checks }) => (
  <div data-testid="sim-checklist">
    <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Análise do circuito</p>
    <ul className="space-y-1.5">
      {checks.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-xs" data-testid={`sim-check-${c.id}`} data-ok={c.ok}>
          {c.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
          <span className={c.ok ? "text-slate-300" : "text-red-300"}>{c.label}</span>
        </li>
      ))}
    </ul>
  </div>
);

const HoldButton = ({ comp, onDown, onUp, color }) => (
  <button onPointerDown={() => onDown(comp)} onPointerUp={onUp} onPointerLeave={onUp}
    className={`w-full select-none rounded-md border px-3 py-2 text-left text-xs font-medium transition-transform active:scale-95 ${color}`}
    data-testid={`sim-press-${comp.tag}`} style={{ touchAction: "none" }}>
    {comp.tag} · segure para {comp.type === "botoeira_na" ? "LIGAR" : "DESLIGAR"}
  </button>
);

export const SimPanel = ({ comps, sim, simState, checks, onDown, onUp, onToggle }) => {
  const by = (t) => comps.filter((c) => c.type === t);
  const motors = by("motor");
  return (
    <div className="space-y-5" data-testid="sim-panel">
      {sim.shorts.length > 0 && (
        <div className="flex gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300" data-testid="sim-short-alert">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Curto-circuito entre {sim.shorts.join(", ")}. Corrija as ligações no modo Edição.
        </div>
      )}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Comandos</p>
        {by("botoeira_na").map((c) => <HoldButton key={c.id} comp={c} onDown={onDown} onUp={onUp} color="border-emerald-500/40 bg-emerald-500/10 text-emerald-300" />)}
        {by("botoeira_nf").map((c) => <HoldButton key={c.id} comp={c} onDown={onDown} onUp={onUp} color="border-red-500/40 bg-red-500/10 text-red-300" />)}
        {[...by("disjuntor"), ...by("disjuntor3")].map((c) => (
          <button key={c.id} onClick={() => onToggle("off", c)} data-testid={`sim-breaker-${c.tag}`}
            className="flex w-full items-center justify-between rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500">
            <span>{c.tag} · disjuntor</span>
            <span className={simState.off[c.id] ? "text-red-400" : "text-emerald-400"}><Power className="mr-1 inline h-3 w-3" />{simState.off[c.id] ? "DESLIGADO" : "LIGADO"}</span>
          </button>
        ))}
        {by("rele_termico").map((c) => (
          <button key={c.id} onClick={() => onToggle("tripped", c)} data-testid={`sim-trip-${c.tag}`}
            className="flex w-full items-center justify-between rounded-md border border-amber-500/40 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10">
            <span>{c.tag} · relé térmico</span>
            <span>{simState.tripped[c.id] ? <><RotateCcw className="mr-1 inline h-3 w-3" />REARMAR</> : "SIMULAR DESARME"}</span>
          </button>
        ))}
      </div>
      <div className="space-y-1.5" data-testid="sim-status">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Estado</p>
        {by("contator").map((c) => (
          <p key={c.id} className="flex justify-between font-mono text-xs" data-testid={`sim-status-${c.tag}`}>
            <span className="text-slate-400">{c.tag} bobina</span><span className={sim.coils[c.id] ? "text-amber-400" : "text-slate-500"}>{sim.coils[c.id] ? "ENERGIZADA" : "DESENERGIZADA"}</span>
          </p>
        ))}
        {motors.map((c) => (
          <p key={c.id} className="flex justify-between font-mono text-xs" data-testid={`sim-status-${c.tag}`}>
            <span className="text-slate-400">{c.tag} motor</span>
            <span className={sim.motors[c.id] === "on" ? "text-amber-400" : sim.motors[c.id] === "falta" ? "text-red-400" : "text-slate-500"}>
              {sim.motors[c.id] === "on" ? "LIGADO · 1730 rpm" : sim.motors[c.id] === "falta" ? "FALTA DE FASE" : "PARADO"}
            </span>
          </p>
        ))}
        {by("lampada").map((c) => (
          <p key={c.id} className="flex justify-between font-mono text-xs" data-testid={`sim-status-${c.tag}`}>
            <span className="text-slate-400">{c.tag} lâmpada</span><span className={sim.lamps[c.id] ? "text-emerald-400" : "text-slate-500"}>{sim.lamps[c.id] ? "ACESA" : "APAGADA"}</span>
          </p>
        ))}
      </div>
      <Checklist checks={checks} />
      <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-amber-500 align-middle" />FASE</span>
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-blue-500 align-middle" />NEUTRO</span>
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-slate-600 align-middle" />SEM TENSÃO</span>
      </div>
    </div>
  );
};
