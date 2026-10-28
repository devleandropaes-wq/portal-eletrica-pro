export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95];
// NBR 5410 Tabela 36 — cobre/PVC 70°C, método B1, 2 condutores carregados
export const IZ_B1 = { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232 };
export const BREAKERS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125];
// NBR 5410 Tabela 42 — circuitos agrupados em eletroduto
export const FCA = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57 };
const RHO = 1 / 56;

export function dimensionar({ voltage, iluminacao, tugQty, tugVa, tues, length, grouping, dropMax }) {
  const pTue = tues.reduce((s, t) => s + Number(t.power || 0), 0);
  const pIlum = Number(iluminacao || 0);
  const pTug = Number(tugQty || 0) * Number(tugVa || 0);
  const P = pIlum + pTug + pTue;
  const V = Number(voltage);
  const Ib = P / V;
  const fca = FCA[grouping] ?? 0.57;
  const tipo = pTug === 0 && pTue === 0 ? "iluminacao" : "forca";
  const minSec = tipo === "iluminacao" ? 1.5 : 2.5;
  const L = Number(length || 0);
  const In = BREAKERS.find((b) => b >= Ib) ?? null;

  const rows = SECTIONS.map((S) => {
    const Iz = +(IZ_B1[S] * fca).toFixed(1);
    const dv = ((2 * RHO * L * Ib) / S / V) * 100;
    const okMin = S >= minSec;
    const okCap = Iz >= Ib;
    const okProt = In !== null && In <= Iz;
    const okDrop = dv <= dropMax;
    return { S, Iz, dv, okMin, okCap, okProt, okDrop, ok: okMin && okCap && okProt && okDrop };
  });
  const chosen = rows.find((r) => r.ok) || null;
  const byCap = rows.find((r) => r.okMin && r.okCap)?.S ?? null;
  const byDrop = rows.find((r) => r.okMin && r.okDrop)?.S ?? null;

  const warnings = [];
  if (pTue > 0 && (pIlum > 0 || pTug > 0)) warnings.push("NBR 5410 (9.5.3.1): equipamentos com corrente nominal acima de 10 A devem ter circuito independente. Separe a TUE das cargas de iluminação/TUG.");
  if (tipo === "forca" && pIlum > 0) warnings.push("Recomenda-se separar circuitos de iluminação e de tomadas (NBR 5410, 4.2.5.5).");
  if (!chosen) warnings.push("Nenhuma seção da tabela atende aos critérios. Divida o circuito ou reduza o comprimento.");

  return {
    P, Ib, fca, tipo, minSec, In,
    section: chosen?.S ?? null, Iz: chosen?.Iz ?? null, dv: chosen?.dv ?? null,
    byCap, byDrop, rows, warnings, pIlum, pTug, pTue,
  };
}
