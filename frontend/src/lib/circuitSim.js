import { SPECS, termKey } from "@/components/comandos/specs";

const SOURCE_LABELS = ["L1", "L2", "L3", "N"];

export const emptySim = () => ({ pressed: {}, off: {}, tripped: {}, coils: {} });

export function internalLinks(c, s) {
  switch (c.type) {
    case "disjuntor": return s.off[c.id] ? [] : [["1", "2"]];
    case "disjuntor3": return s.off[c.id] ? [] : [["1", "2"], ["3", "4"], ["5", "6"]];
    case "botoeira_na": return s.pressed[c.id] ? [["3", "4"]] : [];
    case "botoeira_nf": return s.pressed[c.id] ? [] : [["1", "2"]];
    case "contator": return s.coils[c.id] ? [["13", "14"], ["1", "2"], ["3", "4"], ["5", "6"]] : [];
    case "rele_termico": return [["1", "2"], ["3", "4"], ["5", "6"], s.tripped[c.id] ? ["97", "98"] : ["95", "96"]];
    default: return [];
  }
}

function solve(comps, wires, s) {
  const parent = {};
  const find = (k) => {
    if (parent[k] === undefined) parent[k] = k;
    while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; }
    return k;
  };
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[ra] = rb; };
  comps.forEach((c) => internalLinks(c, s).forEach(([a, b]) => union(termKey(c.id, a), termKey(c.id, b))));
  wires.forEach((w) => union(w.a, w.b));
  const labels = {};
  comps.filter((c) => c.type === "fonte").forEach((c) => SOURCE_LABELS.forEach((l) => {
    const r = find(termKey(c.id, l));
    (labels[r] = labels[r] || new Set()).add(l);
  }));
  return { labels, pot: (k) => labels[find(k)] || new Set() };
}

const across = (a, b) => a.size === 1 && b.size === 1 && [...a][0] !== [...b][0];

export function simulate(comps, wires, s) {
  const contactors = comps.filter((c) => c.type === "contator");
  let coils = { ...s.coils };
  for (let i = 0; i < 20; i += 1) {
    const net = solve(comps, wires, { ...s, coils });
    const next = {};
    contactors.forEach((c) => { next[c.id] = across(net.pot(termKey(c.id, "A1")), net.pot(termKey(c.id, "A2"))); });
    const stable = contactors.every((c) => !!next[c.id] === !!coils[c.id]);
    coils = next;
    if (stable) break;
  }
  const net = solve(comps, wires, { ...s, coils });
  const shorts = Object.values(net.labels).filter((l) => l.size > 1).map((l) => [...l].join(" ↔ "));
  const lamps = {};
  const motors = {};
  comps.forEach((c) => {
    if (c.type === "lampada") lamps[c.id] = across(net.pot(termKey(c.id, "X1")), net.pot(termKey(c.id, "X2")));
    if (c.type === "motor") {
      const ph = ["U1", "V1", "W1"].map((t) => net.pot(termKey(c.id, t)));
      const names = ph.map((p) => (p.size === 1 ? [...p][0] : null));
      const ok = names.every((n) => n && n !== "N") && new Set(names).size === 3;
      motors[c.id] = ok ? "on" : ph.some((p) => [...p].some((x) => x !== "N")) ? "falta" : "off";
    }
  });
  const wireState = {};
  wires.forEach((w) => {
    const p = net.pot(w.a);
    wireState[w.id] = p.size > 1 ? "short" : p.has("N") ? "neutral" : p.size ? "phase" : "none";
  });
  return { coils, lamps, motors, shorts, wireState };
}

const forceAll = (comps, patch) => {
  const s = emptySim();
  comps.forEach((c) => patch(c, s));
  return s;
};

export function analyze(comps, wires) {
  const has = (t) => comps.some((c) => c.type === t);
  const ks = comps.filter((c) => c.type === "contator");
  const checks = [
    { id: "fonte", label: "Alimentação (fase e neutro) posicionada", ok: has("fonte") },
    { id: "contator", label: "Contator posicionado", ok: ks.length > 0 },
  ];
  if (!has("fonte") || !ks.length) return checks;
  const coilsOn = (c, s) => { if (c.type === "contator") s.coils[c.id] = true; };
  const probe = (s) => solve(comps, wires, s);
  const a1 = (net) => ks.some((k) => [...net.pot(termKey(k.id, "A1"))].some((x) => x !== "N"));
  const a2 = (net) => ks.some((k) => net.pot(termKey(k.id, "A2")).has("N") || net.pot(termKey(k.id, "A2")).size === 1);

  const pressedOn = probe(forceAll(comps, (c, s) => { if (c.type === "botoeira_na") s.pressed[c.id] = true; }));
  checks.push({ id: "fase", label: "Fase chega à bobina A1 ao pulsar a botoeira Ligar", ok: a1(pressedOn) });
  checks.push({ id: "neutro", label: "Retorno da bobina A2 ligado ao neutro / outra fase", ok: a2(pressedOn) });

  const sealed = probe(forceAll(comps, coilsOn));
  checks.push({ id: "selo", label: "Contato de selo 13-14 retém a bobina após soltar a botoeira", ok: has("botoeira_na") && a1(sealed) && !a1(probe(emptySim())) });

  const stop = probe(forceAll(comps, (c, s) => { coilsOn(c, s); if (c.type === "botoeira_nf" || c.type === "botoeira_na") s.pressed[c.id] = c.type === "botoeira_nf"; }));
  checks.push({ id: "desliga", label: "Botoeira Desligar (NF) interrompe o comando", ok: has("botoeira_nf") && !(a1(stop) && a2(stop)) });

  if (has("rele_termico")) {
    const trip = probe(forceAll(comps, (c, s) => { coilsOn(c, s); if (c.type === "rele_termico") s.tripped[c.id] = true; }));
    checks.push({ id: "termico", label: "Relé térmico 95-96 em série com a bobina", ok: !(a1(trip) && a2(trip)) });
  }
  if (has("motor")) {
    const r = simulate(comps, wires, forceAll(comps, coilsOn));
    checks.push({ id: "motor", label: "Motor recebe L1, L2 e L3 pelos contatos de força", ok: Object.values(r.motors).some((m) => m === "on") });
  }
  if (has("lampada")) {
    const r = simulate(comps, wires, forceAll(comps, coilsOn));
    checks.push({ id: "lampada", label: "Lâmpada sinalizadora acende com o contator", ok: Object.values(r.lamps).some(Boolean) });
  }
  return checks;
}
