const t = (id, x, y) => ({ id, x, y });

export const SPECS = {
  fonte: { label: "Alimentação 3F + N", short: "Fonte", prefix: "X", w: 180, h: 50, terms: [t("L1", 20, 50), t("L2", 60, 50), t("L3", 100, 50), t("N", 160, 50)] },
  disjuntor: { label: "Disjuntor / Fusível (1P)", short: "Disjuntor 1P", prefix: "Q", w: 60, h: 80, terms: [t("1", 30, 0), t("2", 30, 80)] },
  disjuntor3: { label: "Disjuntor Tripolar (3P)", short: "Disjuntor 3P", prefix: "Q", w: 140, h: 80, terms: [t("1", 30, 0), t("2", 30, 80), t("3", 70, 0), t("4", 70, 80), t("5", 110, 0), t("6", 110, 80)] },
  botoeira_na: { label: "Botoeira Ligar (NA)", short: "Liga NA", prefix: "S", w: 70, h: 80, terms: [t("3", 45, 0), t("4", 45, 80)] },
  botoeira_nf: { label: "Botoeira Desligar (NF)", short: "Desliga NF", prefix: "S", w: 70, h: 80, terms: [t("1", 45, 0), t("2", 45, 80)] },
  contator: {
    label: "Contator (A1-A2, 13-14, força)", short: "Contator", prefix: "K", w: 230, h: 100,
    terms: [t("A1", 25, 0), t("A2", 25, 100), t("13", 75, 0), t("14", 75, 100), t("1", 125, 0), t("2", 125, 100), t("3", 165, 0), t("4", 165, 100), t("5", 205, 0), t("6", 205, 100)],
  },
  rele_termico: {
    label: "Relé Térmico (95-96 NF)", short: "Relé térmico", prefix: "F", w: 210, h: 100,
    terms: [t("1", 25, 0), t("2", 25, 100), t("3", 65, 0), t("4", 65, 100), t("5", 105, 0), t("6", 105, 100), t("95", 150, 0), t("96", 150, 100), t("97", 190, 0), t("98", 190, 100)],
  },
  lampada: { label: "Lâmpada Sinalizadora", short: "Lâmpada", prefix: "H", w: 60, h: 80, terms: [t("X1", 30, 0), t("X2", 30, 80)] },
  motor: { label: "Motor Trifásico", short: "Motor 3~", prefix: "M", w: 140, h: 110, terms: [t("U1", 30, 0), t("V1", 70, 0), t("W1", 110, 0)] },
};

export const PALETTE = [
  { group: "Alimentação", types: ["fonte"] },
  { group: "Comando e Proteção", types: ["disjuntor", "disjuntor3", "botoeira_na", "botoeira_nf", "contator", "rele_termico", "lampada"] },
  { group: "Carga", types: ["motor"] },
];

export const termKey = (compId, termId) => `${compId}:${termId}`;

export const termPos = (comp, termId) => {
  const tm = SPECS[comp.type].terms.find((x) => x.id === termId);
  return { x: comp.x + tm.x, y: comp.y + tm.y, dir: tm.y === 0 ? -1 : 1 };
};

export const nextTag = (comps, type) => {
  const p = SPECS[type].prefix;
  const used = new Set(comps.map((c) => c.tag));
  let n = 1;
  while (used.has(`${p}${n}`)) n += 1;
  return `${p}${n}`;
};
