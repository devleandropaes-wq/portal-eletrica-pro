import { useRef, useState } from "react";
import { SPECS, termKey, termPos } from "@/components/comandos/specs";
import { ComponentSymbol } from "@/components/comandos/Symbols";

export const CANVAS_W = 1400;
export const CANVAS_H = 1000;
const snap = (v) => Math.max(0, Math.round(v / 10) * 10);

const wirePath = (a, b) => {
  const ay = a.y + a.dir * 15;
  const by = b.y + b.dir * 15;
  let my;
  if (a.dir === b.dir) my = a.dir > 0 ? Math.max(ay, by) : Math.min(ay, by);
  else my = (ay + by) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${my} L ${b.x} ${my} L ${b.x} ${b.y}`;
};

const WIRE_COLOR = { phase: "#F59E0B", neutral: "#3B82F6", short: "#EF4444", none: "#475569" };

const keyPos = (comps, key) => {
  const [id, t] = key.split(":");
  const comp = comps.find((c) => c.id === id);
  return comp ? termPos(comp, t) : null;
};

const Wire = ({ w, comps, mode, state, selected, onSelect }) => {
  const a = keyPos(comps, w.a);
  const b = keyPos(comps, w.b);
  if (!a || !b) return null;
  const d = wirePath(a, b);
  const color = mode === "sim" ? WIRE_COLOR[state] : selected ? "#F59E0B" : "#94A3B8";
  return (
    <g data-testid={`wire-${w.id}`} onPointerDown={(e) => { if (mode === "edit") { e.stopPropagation(); onSelect(); } }} style={{ cursor: mode === "edit" ? "pointer" : "default" }}>
      <path d={d} stroke="transparent" strokeWidth="12" fill="none" />
      <path d={d} stroke={color} strokeWidth={selected || state === "phase" ? 3 : 2} fill="none" strokeLinejoin="round"
        strokeDasharray={mode === "sim" && state === "none" ? "5 5" : undefined} className={mode === "sim" && state === "phase" ? "wire-phase" : ""} />
    </g>
  );
};

const Terminal = ({ comp, t, mode, onStart }) => {
  const top = t.y === 0;
  return (
    <g data-term={termKey(comp.id, t.id)} data-testid={`terminal-${comp.tag}-${t.id}`}
      onPointerDown={(e) => { if (mode === "edit") { e.stopPropagation(); onStart(termKey(comp.id, t.id), comp.x + t.x, comp.y + t.y); } }}
      style={{ cursor: mode === "edit" ? "crosshair" : "default" }}>
      <circle cx={t.x} cy={t.y} r="9" fill="transparent" />
      <circle cx={t.x} cy={t.y} r="4" fill="#0A0E17" stroke="#F59E0B" strokeWidth="1.5" />
      <text x={t.x + 6} y={top ? t.y + 13 : t.y - 5} fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">{t.id}</text>
    </g>
  );
};

export const Canvas = ({ comps, wires, mode, zoom, selected, setSelected, sim, simState, onMoveComp, onAddWire, onDropComp, onSimDown, onSimUp }) => {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [wiring, setWiring] = useState(null);

  const pt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };

  const onMove = (e) => {
    if (drag) { const p = pt(e); onMoveComp(drag.id, snap(p.x - drag.dx), snap(p.y - drag.dy)); }
    if (wiring) setWiring({ ...wiring, ...pt(e) });
  };

  const onUp = (e) => {
    if (wiring) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-term]");
      const key = el?.getAttribute("data-term");
      if (key && key !== wiring.from) onAddWire(wiring.from, key);
      setWiring(null);
    }
    setDrag(null);
    if (mode === "sim") onSimUp();
  };

  const startComp = (e, c) => {
    e.stopPropagation();
    if (mode === "sim") { onSimDown(c); return; }
    setSelected({ kind: "comp", id: c.id });
    const p = pt(e);
    setDrag({ id: c.id, dx: p.x - c.x, dy: p.y - c.y });
  };

  const compState = (c) => (mode === "sim"
    ? { off: simState.off[c.id], pressed: simState.pressed[c.id], tripped: simState.tripped[c.id], coil: sim.coils[c.id], lamp: sim.lamps[c.id], motor: sim.motors[c.id] }
    : {});

  const onDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("comp-type");
    if (!SPECS[type]) return;
    const p = pt(e);
    onDropComp(type, snap(p.x - SPECS[type].w / 2), snap(p.y - SPECS[type].h / 2));
  };

  return (
    <svg ref={svgRef} width={CANVAS_W * zoom} height={CANVAS_H * zoom} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerDown={() => setSelected(null)}
      onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
      style={{ touchAction: "none", userSelect: "none" }} data-testid="canvas-comandos">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#1E293B" />
        </pattern>
      </defs>
      <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />
      {wires.map((w) => (
        <Wire key={w.id} w={w} comps={comps} mode={mode} state={sim?.wireState[w.id]}
          selected={selected?.kind === "wire" && selected.id === w.id} onSelect={() => setSelected({ kind: "wire", id: w.id })} />
      ))}
      {comps.map((c) => {
        const spec = SPECS[c.type];
        const sel = selected?.kind === "comp" && selected.id === c.id;
        return (
          <g key={c.id} transform={`translate(${c.x},${c.y})`} data-testid={`comp-${c.tag}`}>
            <g onPointerDown={(e) => startComp(e, c)} style={{ cursor: mode === "edit" ? "move" : "pointer" }}>
              <rect x={-6} y={-6} width={spec.w + 12} height={spec.h + 12} rx="6" fill={sel ? "rgba(245,158,11,0.06)" : "transparent"}
                stroke={sel ? "#F59E0B" : "transparent"} strokeDasharray="4 4" />
              <ComponentSymbol comp={c} st={compState(c)} />
            </g>
            {spec.terms.map((t) => <Terminal key={t.id} comp={c} t={t} mode={mode} onStart={(from, x, y) => setWiring({ from, sx: x, sy: y, x, y })} />)}
          </g>
        );
      })}
      {wiring && <line x1={wiring.sx} y1={wiring.sy} x2={wiring.x} y2={wiring.y} stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 4" pointerEvents="none" />}
    </svg>
  );
};
