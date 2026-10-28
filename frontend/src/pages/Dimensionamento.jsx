import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Trash2, Calculator, AlertTriangle, ListPlus, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBar } from "@/components/ProjectBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dimensionar, FCA } from "@/lib/nbr5410";

const INIT = { name: "", voltage: 127, iluminacao: 0, tugQty: 0, tugVa: 100, tues: [], length: 15, grouping: 1, dropMax: 4 };
const STEPS = ["Identificação", "Cargas", "Instalação", "Resultado"];
const fmt = (n, d = 2) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const Stepper = ({ step }) => (
  <div className="flex gap-2" data-testid="nbr-stepper">
    {STEPS.map((s, i) => (
      <div key={s} className="flex-1">
        <div className={`h-1 rounded-full transition-colors ${i < step ? "bg-amber-500" : "bg-slate-800"}`} />
        <p className={`mt-2 text-[10px] font-mono uppercase tracking-wider ${i < step ? "text-amber-400" : "text-slate-500"}`}>{i + 1}. {s}</p>
      </div>
    ))}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5"><Label className="text-slate-300">{label}</Label>{children}{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
);

const Seg = ({ value, options, onChange, tid }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} data-testid={`${tid}-${v}`}
        className={`rounded-md border px-4 py-2 text-sm transition-colors ${value === v ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>{l}</button>
    ))}
  </div>
);

const Step1 = ({ f, set }) => (
  <div className="space-y-6">
    <Field label="Nome do cômodo / circuito"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Cozinha – Tomadas" className="bg-slate-900" data-testid="nbr-circuit-name-input" /></Field>
    <Field label="Tensão do circuito" hint="127 V: fase + neutro · 220 V: fase + fase (ou fase + neutro em redes 220 V)">
      <Seg value={f.voltage} options={[[127, "127 V"], [220, "220 V"]]} onChange={(v) => set("voltage", v)} tid="nbr-voltage" />
    </Field>
  </div>
);

const Step2 = ({ f, set }) => {
  const [tue, setTue] = useState({ name: "", power: "" });
  const add = () => {
    if (!tue.name || !Number(tue.power)) return toast.error("Informe nome e potência da TUE");
    set("tues", [...f.tues, { name: tue.name, power: Number(tue.power) }]);
    setTue({ name: "", power: "" });
  };
  return (
    <div className="space-y-6">
      <Field label="Iluminação (VA)" hint="NBR 5410: mínimo 100 VA para os primeiros 6 m² e +60 VA a cada 4 m² inteiros.">
        <Input type="number" min="0" value={f.iluminacao} onChange={(e) => set("iluminacao", e.target.value)} className="bg-slate-900" data-testid="nbr-ilum-input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantidade de TUGs"><Input type="number" min="0" value={f.tugQty} onChange={(e) => set("tugQty", e.target.value)} className="bg-slate-900" data-testid="nbr-tug-qty-input" /></Field>
        <Field label="Potência por TUG (VA)" hint="100 VA (geral) · 600 VA (cozinha/serviço, até 3 pontos)"><Input type="number" min="0" value={f.tugVa} onChange={(e) => set("tugVa", e.target.value)} className="bg-slate-900" data-testid="nbr-tug-va-input" /></Field>
      </div>
      <Field label="Tomadas de Uso Específico (TUEs)">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Ex.: Chuveiro" value={tue.name} onChange={(e) => setTue({ ...tue, name: e.target.value })} className="bg-slate-900" data-testid="nbr-tue-name-input" />
          <Input type="number" placeholder="Potência (W)" value={tue.power} onChange={(e) => setTue({ ...tue, power: e.target.value })} className="bg-slate-900 sm:w-40" data-testid="nbr-tue-power-input" />
          <Button type="button" variant="outline" onClick={add} className="border-slate-700 bg-transparent" data-testid="nbr-tue-add-button"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
        {f.tues.map((t, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm" data-testid={`nbr-tue-item-${i}`}>
            <span>{t.name}</span>
            <span className="flex items-center gap-3 font-mono text-slate-400">{t.power} W
              <button onClick={() => set("tues", f.tues.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400" data-testid={`nbr-tue-remove-${i}`}><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
      </Field>
    </div>
  );
};

const Step3 = ({ f, set }) => (
  <div className="space-y-6">
    <Field label="Comprimento do circuito (m)" hint="Distância do quadro até a carga mais distante."><Input type="number" min="1" value={f.length} onChange={(e) => set("length", e.target.value)} className="bg-slate-900" data-testid="nbr-length-input" /></Field>
    <Field label="Circuitos agrupados no mesmo eletroduto" hint={`Fator de agrupamento (FCA): ${FCA[f.grouping]}`}>
      <Seg value={f.grouping} options={[1, 2, 3, 4, 5, 6].map((n) => [n, String(n)])} onChange={(v) => set("grouping", v)} tid="nbr-grouping" />
    </Field>
    <Field label="Queda de tensão máxima admitida" hint="NBR 5410 (6.2.7): 4% nos circuitos terminais a partir do quadro (instalação alimentada por rede pública BT).">
      <Seg value={f.dropMax} options={[[2, "2%"], [3, "3%"], [4, "4%"]]} onChange={(v) => set("dropMax", v)} tid="nbr-drop" />
    </Field>
    <p className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">Premissas: condutor de cobre, isolação PVC 70 °C, método de instalação B1 (eletroduto embutido em alvenaria), 2 condutores carregados, temperatura ambiente 30 °C, ρ = 1/56 Ω·mm²/m.</p>
  </div>
);

const Big = ({ label, value, unit, tid, accent }) => (
  <div className="bg-[#0A0E17] p-5">
    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className={`mt-2 font-['Outfit'] text-3xl font-bold ${accent}`} data-testid={tid}>{value}<span className="ml-1 text-base text-slate-400">{unit}</span></p>
  </div>
);

const Ok = ({ v }) => (v ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <span className="text-red-400">✕</span>);

const Result = ({ f, r }) => (
  <div className="space-y-6" data-testid="nbr-result">
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 md:grid-cols-4">
      <Big label="Corrente de projeto Ib" value={fmt(r.Ib)} unit="A" tid="nbr-result-ib" accent="text-slate-50" />
      <Big label="Bitola do condutor" value={r.section ? fmt(r.section, 1) : "—"} unit="mm²" tid="nbr-result-bitola" accent="text-amber-400" />
      <Big label="Disjuntor" value={r.In ?? "—"} unit="A" tid="nbr-result-disjuntor" accent="text-emerald-400" />
      <Big label="Queda de tensão" value={r.dv !== null ? fmt(r.dv) : "—"} unit="%" tid="nbr-result-queda" accent={r.dv !== null && r.dv <= f.dropMax ? "text-blue-400" : "text-red-400"} />
    </div>
    <div className="grid gap-4 text-sm md:grid-cols-3">
      <p className="rounded-md border border-slate-800 p-3 text-slate-400">Potência total: <b className="text-slate-100" data-testid="nbr-result-power">{fmt(r.P, 0)} VA</b><br />Ilum. {r.pIlum} · TUG {r.pTug} · TUE {r.pTue}</p>
      <p className="rounded-md border border-slate-800 p-3 text-slate-400">Seção mínima ({r.tipo === "iluminacao" ? "iluminação" : "força"}): <b className="text-slate-100">{fmt(r.minSec, 1)} mm²</b><br />Por capacidade: {r.byCap ?? "—"} mm² · Por queda: {r.byDrop ?? "—"} mm²</p>
      <p className="rounded-md border border-slate-800 p-3 text-slate-400">Coordenação Ib ≤ In ≤ Iz:<br /><b className="font-mono text-slate-100">{fmt(r.Ib)} ≤ {r.In ?? "—"} ≤ {r.Iz ?? "—"} A</b> (FCA {r.fca})</p>
    </div>
    {r.warnings.map((w) => (
      <p key={w} className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200" data-testid="nbr-warning"><AlertTriangle className="h-4 w-4 shrink-0" />{w}</p>
    ))}
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[560px] text-left font-mono text-xs" data-testid="nbr-criteria-table">
        <thead className="border-b border-slate-800 text-slate-500"><tr><th className="px-3 py-2">Seção</th><th className="px-3 py-2">Iz corrigida</th><th className="px-3 py-2">ΔV %</th><th className="px-3 py-2">Mínima</th><th className="px-3 py-2">Capacidade</th><th className="px-3 py-2">Proteção</th><th className="px-3 py-2">Queda</th></tr></thead>
        <tbody>
          {r.rows.slice(0, 7).map((row) => (
            <tr key={row.S} className={`border-b border-slate-800/60 ${row.S === r.section ? "bg-amber-500/10 text-amber-200" : "text-slate-300"}`}>
              <td className="px-3 py-2">{fmt(row.S, 1)} mm²</td><td className="px-3 py-2">{row.Iz} A</td><td className="px-3 py-2">{fmt(row.dv)}</td>
              <td className="px-3 py-2"><Ok v={row.okMin} /></td><td className="px-3 py-2"><Ok v={row.okCap} /></td><td className="px-3 py-2"><Ok v={row.okProt} /></td><td className="px-3 py-2"><Ok v={row.okDrop} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CircuitList = ({ list, onRemove }) => (
  <div className="rounded-lg border border-slate-800 bg-[#111827]" data-testid="nbr-circuit-list">
    <p className="border-b border-slate-800 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Quadro de cargas ({list.length})</p>
    {!list.length && <p className="p-4 text-sm text-slate-500">Os circuitos calculados aparecem aqui.</p>}
    {list.map((c, i) => (
      <div key={i} className="flex items-center gap-3 border-b border-slate-800/60 px-4 py-3 text-sm last:border-0" data-testid={`nbr-circuit-item-${i}`}>
        <span className="font-mono text-xs text-amber-500">C{i + 1}</span>
        <div className="min-w-0 flex-1"><p className="truncate">{c.input.name}</p><p className="font-mono text-xs text-slate-500">{c.input.voltage} V · {fmt(c.result.P, 0)} VA · Ib {fmt(c.result.Ib)} A</p></div>
        <span className="font-mono text-xs text-slate-300">{c.result.section ?? "—"} mm² · {c.result.In ?? "—"} A</span>
        <button onClick={() => onRemove(i)} className="text-slate-500 hover:text-red-400" data-testid={`nbr-circuit-remove-${i}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    ))}
  </div>
);

export default function Dimensionamento() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(INIT);
  const [result, setResult] = useState(null);
  const [list, setList] = useState([]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const next1 = () => { if (!f.name.trim()) return toast.error("Informe o nome do cômodo/circuito"); setStep(2); };
  const next2 = () => {
    const P = Number(f.iluminacao) + Number(f.tugQty) * Number(f.tugVa) + f.tues.reduce((s, t) => s + t.power, 0);
    if (P <= 0) return toast.error("Informe ao menos uma carga");
    setStep(3);
  };
  const calc = () => {
    if (!(Number(f.length) > 0)) return toast.error("Informe o comprimento do circuito");
    setResult(dimensionar(f));
    setStep(4);
  };
  const addToList = () => { setList((l) => [...l, { input: f, result: { P: result.P, Ib: result.Ib, section: result.section, In: result.In, dv: result.dv } }]); toast.success("Circuito adicionado ao quadro de cargas"); };
  const restart = () => { setF(INIT); setResult(null); setStep(1); };

  return (
    <div>
      <PageHeader eyebrow="Módulo · Residencial" title="Dimensionamento NBR 5410" desc="Calcule a corrente de projeto, a bitola do condutor e o disjuntor de cada circuito.">
        <ProjectBar type="nbr" defaultName="Quadro de cargas" getData={() => ({ circuits: list })} onLoad={(d) => { setList(d?.circuits || []); restart(); }} />
      </PageHeader>
      <div className="grid gap-6 p-4 sm:p-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8 rounded-lg border border-slate-800 bg-[#111827] p-5 sm:p-8">
          <Stepper step={step} />
          <div className="fade-up" key={step}>
            {step === 1 && <Step1 f={f} set={set} />}
            {step === 2 && <Step2 f={f} set={set} />}
            {step === 3 && <Step3 f={f} set={set} />}
            {step === 4 && result && <Result f={f} r={result} />}
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-5">
            {step > 1 ? <Button variant="ghost" onClick={() => setStep(step - 1)} data-testid="nbr-back-button"><ChevronLeft className="mr-1 h-4 w-4" />Voltar</Button> : <span />}
            {step === 1 && <Button onClick={next1} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="nbr-step1-next">Próximo <ChevronRight className="ml-1 h-4 w-4" /></Button>}
            {step === 2 && <Button onClick={next2} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="nbr-step2-next">Próximo <ChevronRight className="ml-1 h-4 w-4" /></Button>}
            {step === 3 && <Button onClick={calc} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="nbr-calculate-btn"><Calculator className="mr-1 h-4 w-4" />Calcular</Button>}
            {step === 4 && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={restart} className="border-slate-700 bg-transparent" data-testid="nbr-new-calc-button"><RotateCcw className="mr-1 h-4 w-4" />Novo cálculo</Button>
                <Button onClick={addToList} className="bg-amber-500 text-slate-950 hover:bg-amber-400" data-testid="nbr-add-to-list-button"><ListPlus className="mr-1 h-4 w-4" />Adicionar ao quadro</Button>
              </div>
            )}
          </div>
        </div>
        <CircuitList list={list} onRemove={(i) => setList((l) => l.filter((_, j) => j !== i))} />
      </div>
    </div>
  );
}
