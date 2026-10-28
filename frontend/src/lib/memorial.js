import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BREAKERS, sizeCircuit } from "@/lib/nbr5410";

const NAVY = [15, 23, 42];
const AMBER = [217, 119, 6];
const GREY = [100, 116, 139];
const n = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? "-" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const SYSTEMS = { 1: { label: "Monofásico 127 V (F+N)", div: 127 }, 2: { label: "Bifásico 127/220 V (2F+N)", div: 220 }, 3: { label: "Trifásico 127/220 V (3F+N)", div: Math.sqrt(3) * 220 } };
const polesOf = (v) => (v === 220 ? "2P" : "1P");

export function memorialFromNbr(data, name) {
  const circuits = (data.circuits || []).map((c) => ({
    name: c.input.name, voltage: c.input.voltage, power: c.result.P, Ib: c.result.Ib, In: c.result.In, section: c.result.section, dv: c.result.dv, length: c.input.length,
  }));
  const poles = circuits.some((c) => c.voltage === 220) ? 2 : 1;
  const P = circuits.reduce((s, c) => s + c.power, 0);
  const I = P / SYSTEMS[poles].div;
  const rating = BREAKERS.find((b) => b >= I) ?? null;
  const devices = [
    ["Disjuntor geral", `${poles}P - ${rating ?? "-"} A - curva C (recomendado)`, "Proteção geral contra sobrecarga e curto-circuito"],
    ["Interruptor DR", `${poles === 1 ? "2P" : "4P"} - ${Math.max(40, rating || 0)} A - 30 mA (recomendado)`, "Proteção contra choques elétricos (NBR 5410, 5.1.3.2.2)"],
    ["DPS", "Classe II - 275 V - 20 kA, um por condutor vivo (recomendado)", "Proteção contra surtos de tensão (NBR 5410, 5.4.2)"],
    ...circuits.map((c, i) => [`Disjuntor C${i + 1}`, `${polesOf(c.voltage)} - ${c.In ?? "-"} A - curva C`, `Proteção do circuito ${c.name}`]),
  ];
  return { origin: "Dimensionamento NBR 5410", name, circuits, main: { system: SYSTEMS[poles].label, P, I, rating, note: "sugerido pela carga instalada, sem fator de demanda" }, devices };
}

export function memorialFromQdc(data, name) {
  const circuits = (data.circuits || []).map((c) => {
    const r = sizeCircuit({ power: c.power, voltage: c.voltage, length: c.length ?? 15, lighting: c.kind ? c.kind === "iluminacao" : /ilumin/i.test(c.name), breaker: c.breaker });
    return { name: c.name, voltage: c.voltage, power: Number(c.power), length: c.length ?? 15, ...r };
  });
  const poles = data.main.poles;
  const P = circuits.reduce((s, c) => s + c.power, 0);
  const I = P / SYSTEMS[poles].div;
  const devices = [
    ["Disjuntor geral", `${poles}P - ${data.main.rating} A - curva C`, "Proteção geral contra sobrecarga e curto-circuito"],
    ["Interruptor DR", `${poles === 1 ? "2P" : "4P"} - 63 A - 30 mA`, "Proteção contra choques elétricos (NBR 5410, 5.1.3.2.2)"],
    ["DPS", data.dps?.installed ? "Classe II - 275 V - 20 kA, um por condutor vivo" : "NÃO INSTALADO - instalação recomendada", "Proteção contra surtos de tensão (NBR 5410, 5.4.2)"],
    ...circuits.map((c, i) => [`Disjuntor C${i + 1}`, `${polesOf(c.voltage)} - ${c.In} A - curva C`, `Proteção do circuito ${c.name}`]),
  ];
  return { origin: "Simulador de QDC", name, circuits, main: { system: SYSTEMS[poles].label, P, I, rating: data.main.rating, note: `utilização de ${n((I / data.main.rating) * 100, 0)}% da capacidade` }, devices };
}

const memorialText = (m, client) => [
  ["1. Objeto", `O presente memorial descreve a instalação elétrica de baixa tensão referente ao projeto "${m.name}"${client.address ? `, situada em ${client.address}${client.city ? ` - ${client.city}` : ""}` : ""}, e apresenta os critérios técnicos adotados no dimensionamento dos circuitos e dos dispositivos de proteção do quadro de distribuição (QDC).`],
  ["2. Normas de referência", "ABNT NBR 5410 - Instalações elétricas de baixa tensão; ABNT NBR NM 60898 - Disjuntores para proteção de sobrecorrentes; ABNT NBR NM 61008 - Interruptores a corrente diferencial-residual; ABNT NBR IEC 61643-1 - Dispositivos de proteção contra surtos."],
  ["3. Critérios de dimensionamento", "A corrente de projeto foi obtida por Ib = P / V. Os condutores são de cobre, com isolação em PVC 70 °C, instalados em eletroduto embutido em alvenaria (método de referência B1), temperatura ambiente de 30 °C. Foram atendidos os critérios de seção mínima (1,5 mm² para iluminação e 2,5 mm² para força), capacidade de condução de corrente (Tabela 36, com fatores de agrupamento da Tabela 42), queda de tensão máxima de 4% nos circuitos terminais (item 6.2.7) e coordenação entre condutor e proteção Ib <= In <= Iz (item 5.3.4.1)."],
  ["4. Proteção e segurança", "Todos os circuitos são protegidos por disjuntores termomagnéticos. A proteção contra choques elétricos é complementada por dispositivo DR de alta sensibilidade (30 mA), obrigatório para circuitos de áreas molhadas, cozinhas, áreas de serviço e áreas externas (item 5.1.3.2.2). A proteção contra sobretensões transitórias é realizada por DPS instalados no quadro (item 5.4.2). Todos os circuitos devem possuir condutor de proteção (PE), com identificação por cores: neutro azul-claro e proteção verde-amarelo (item 6.1.5.3)."],
  ["5. Declaração de conformidade", "O responsável técnico declara que o dimensionamento apresentado neste memorial foi elaborado de acordo com os critérios da ABNT NBR 5410, visando a segurança de pessoas, animais e bens. A execução deve ser realizada por profissional habilitado, e a instalação deve passar por inspeção visual e ensaios (seção 7 da NBR 5410) antes de ser energizada."],
];

const fieldBox = (doc, x, y, w, title, rows) => {
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x, y, w, 30, 1.5, 1.5);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...AMBER).text(title.toUpperCase(), x + 3, y + 5);
  rows.forEach(([label, value], i) => {
    const ly = y + 12 + i * 7;
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...GREY).text(`${label}:`, x + 3, ly);
    if (value) doc.setFont("helvetica", "normal").setTextColor(15, 23, 42).text(doc.splitTextToSize(value, w - 30)[0], x + 25, ly);
    else { doc.setDrawColor(203, 213, 225); doc.line(x + 25, ly + 0.5, x + w - 3, ly + 0.5); }
  });
};

const sectionTitle = (doc, y, title) => {
  doc.setFillColor(...AMBER).rect(14, y - 4, 1.5, 5, "F");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...NAVY).text(title, 18, y);
  return y + 4;
};

const ensureSpace = (doc, y, h) => {
  if (y + h > 280) { doc.addPage(); return 20; }
  return y;
};

export function buildMemorialPdf(m, tech, client) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("pt-BR");
  const code = `MD-${Date.now().toString().slice(-6)}`;

  doc.setFillColor(...NAVY).rect(0, 0, 210, 30, "F");
  doc.setFillColor(...AMBER).rect(0, 30, 210, 1.2, "F");
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(245, 158, 11).text("PORTAL ELÉTRICA PRO", 14, 14);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(226, 232, 240).text("Memorial Descritivo de Instalação Elétrica - ABNT NBR 5410", 14, 22);
  doc.setFontSize(8).setTextColor(148, 163, 184).text(`Documento ${code}`, 196, 12, { align: "right" }).text(`Emitido em ${today}`, 196, 17, { align: "right" }).text(`Origem: ${m.origin}`, 196, 22, { align: "right" });

  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...NAVY).text(m.name, 14, 41);
  fieldBox(doc, 14, 46, 89, "Responsável técnico", [["Nome", tech.name], ["Registro", tech.registry], ["Contato", tech.contact]]);
  fieldBox(doc, 107, 46, 89, "Cliente / local da instalação", [["Cliente", client.name], ["Endereço", client.address], ["Cidade/UF", client.city]]);

  let y = sectionTitle(doc, 86, "1. Resumo de cargas e disjuntor geral");
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60, fillColor: [241, 245, 249] } },
    body: [
      ["Sistema de alimentação", m.main.system],
      ["Número de circuitos", String(m.circuits.length)],
      ["Potência instalada total", `${n(m.main.P, 0)} VA`],
      ["Corrente total estimada (por fase)", `${n(m.main.I)} A`],
      ["Disjuntor geral", `${m.main.rating ?? "-"} A (${m.main.note})`],
    ],
  });

  y = sectionTitle(doc, ensureSpace(doc, doc.lastAutoTable.finalY + 10, 30), "2. Quadro de circuitos (NBR 5410)");
  autoTable(doc, {
    startY: y,
    theme: "striped",
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "center" }, 6: { halign: "center" }, 7: { halign: "right" } },
    head: [["#", "Circuito", "Tensão (V)", "Potência (VA)", "Ib (A)", "Disjuntor (A)", "Bitola (mm²)", "Queda (%)"]],
    body: m.circuits.map((c, i) => [`C${i + 1}`, c.name, c.voltage, n(c.power, 0), n(c.Ib), c.In ?? "-", c.section ? n(c.section, 1) : "-", c.dv !== null ? n(c.dv) : "-"]),
    foot: [["", "TOTAL", "", n(m.main.P, 0), "", "", "", ""]],
    footStyles: { fillColor: [241, 245, 249], textColor: NAVY, fontStyle: "bold", fontSize: 8 },
  });
  doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(...GREY)
    .text("Condutores de cobre, PVC 70 °C, método B1, 30 °C. Queda de tensão calculada pelo comprimento informado de cada circuito.", 14, doc.lastAutoTable.finalY + 4);

  y = sectionTitle(doc, ensureSpace(doc, doc.lastAutoTable.finalY + 12, 30), "3. Dispositivos de proteção do QDC");
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 34 } },
    head: [["Dispositivo", "Especificação", "Função"]],
    body: m.devices,
  });

  y = sectionTitle(doc, ensureSpace(doc, doc.lastAutoTable.finalY + 12, 30), "4. Memorial descritivo");
  memorialText(m, client).forEach(([title, body]) => {
    const lines = doc.splitTextToSize(body, 182);
    y = ensureSpace(doc, y + 2, lines.length * 4.2 + 8);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...NAVY).text(title, 14, y + 3);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(51, 65, 85).text(lines, 14, y + 8, { align: "justify", maxWidth: 182 });
    y += 8 + lines.length * 4.2;
  });

  y = ensureSpace(doc, y + 14, 30);
  doc.setDrawColor(...GREY);
  doc.line(20, y + 12, 95, y + 12);
  doc.line(115, y + 12, 190, y + 12);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GREY);
  doc.text(tech.name || "Responsável técnico", 57.5, y + 17, { align: "center" });
  doc.text(tech.registry ? `Registro ${tech.registry}` : "Registro profissional", 57.5, y + 21, { align: "center" });
  doc.text(client.name || "Cliente", 152.5, y + 17, { align: "center" });
  doc.text(`Local e data: ____________________, ${today}`, 105, y + 30, { align: "center" });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240).line(14, 287, 196, 287);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY)
      .text(`Portal Elétrica Pro - ${code} - valores calculados com base nos dados informados pelo usuário`, 14, 291)
      .text(`Página ${p} de ${pages}`, 196, 291, { align: "right" });
  }
  return doc;
}

export const memorialFilename = (name) => `memorial-${(name || "projeto").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}.pdf`;
