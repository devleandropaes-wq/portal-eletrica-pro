const c = (id, type, tag, x, y) => ({ id, type, tag, x, y });
const w = (a, b, i) => ({ id: `ex-w${i}`, a, b });

const COMPS = [
  c("ex-x1", "fonte", "X1", 305, 20),
  c("ex-q1", "disjuntor", "Q1", 40, 110),
  c("ex-s0", "botoeira_nf", "S0", 25, 230),
  c("ex-s1", "botoeira_na", "S1", 25, 370),
  c("ex-k1", "contator", "K1", 200, 520),
  c("ex-f1", "rele_termico", "F1", 300, 680),
  c("ex-h1", "lampada", "H1", 560, 520),
  c("ex-m1", "motor", "M1", 295, 840),
];

const PAIRS = [
  ["ex-x1:L1", "ex-q1:1"], ["ex-q1:2", "ex-s0:1"], ["ex-s0:2", "ex-s1:3"], ["ex-s1:3", "ex-k1:13"],
  ["ex-s1:4", "ex-k1:14"], ["ex-s1:4", "ex-k1:A1"], ["ex-k1:A2", "ex-f1:95"], ["ex-f1:96", "ex-x1:N"],
  ["ex-k1:A1", "ex-h1:X1"], ["ex-h1:X2", "ex-x1:N"],
  ["ex-x1:L1", "ex-k1:1"], ["ex-x1:L2", "ex-k1:3"], ["ex-x1:L3", "ex-k1:5"],
  ["ex-k1:2", "ex-f1:1"], ["ex-k1:4", "ex-f1:3"], ["ex-k1:6", "ex-f1:5"],
  ["ex-f1:2", "ex-m1:U1"], ["ex-f1:4", "ex-m1:V1"], ["ex-f1:6", "ex-m1:W1"],
];

export const exampleDiagram = () => ({
  comps: COMPS.map((x) => ({ ...x })),
  wires: PAIRS.map(([a, b], i) => w(a, b, i)),
});
