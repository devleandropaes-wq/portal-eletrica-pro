const S = "#CBD5E1";
const ON = "#10B981";

const Contact = ({ x, top = 0, bottom = 80, closed, nc, mark }) => {
  const a = top + 28;
  const b = bottom - 28;
  let end;
  if (nc) end = closed ? [x + 10, a] : [x - 12, a + 6];
  else end = closed ? [x + 1, a] : [x - 13, a + 4];
  return (
    <g stroke={S} strokeWidth="2" fill="none" strokeLinecap="round">
      <line x1={x} y1={top} x2={x} y2={a} />
      <line x1={x} y1={b} x2={x} y2={bottom} />
      <line x1={x} y1={b} x2={end[0]} y2={end[1]} stroke={closed ? ON : S} strokeWidth="2.5" />
      {nc && <line x1={x} y1={a} x2={x + 11} y2={a} />}
      {mark === "x" && <><line x1={x - 4} y1={a - 4} x2={x + 4} y2={a + 4} /><line x1={x + 4} y1={a - 4} x2={x - 4} y2={a + 4} /></>}
      {mark === "arc" && <path d={`M ${x - 4} ${a} A 4 4 0 0 0 ${x + 4} ${a}`} />}
    </g>
  );
};

const Link = ({ x1, x2, y }) => <line x1={x1} y1={y} x2={x2} y2={y} stroke="#64748B" strokeWidth="1.5" strokeDasharray="4 4" />;

const Tag = ({ x, y, children, anchor = "start" }) => (
  <text x={x} y={y} fill="#F59E0B" fontSize="12" fontFamily="JetBrains Mono" fontWeight="700" textAnchor={anchor}>{children}</text>
);

const PushActuator = ({ x }) => (
  <g stroke={S} strokeWidth="2" fill="none">
    <line x1={x - 6} y1={40} x2={x - 30} y2={40} strokeDasharray="3 3" />
    <path d={`M ${x - 30} 32 L ${x - 36} 32 L ${x - 36} 48 L ${x - 30} 48 M ${x - 30} 32 L ${x - 30} 48`} />
  </g>
);

const Fonte = () => (
  <g>
    <rect x="0" y="0" width="180" height="34" rx="4" fill="#1F2937" stroke="#475569" />
    {[["L1", 20, "#F59E0B"], ["L2", 60, "#F59E0B"], ["L3", 100, "#F59E0B"], ["N", 160, "#3B82F6"]].map(([l, x, c]) => (
      <g key={l}>
        <line x1={x} y1={34} x2={x} y2={50} stroke={c} strokeWidth="2" />
        <text x={x} y={22} fill={c} fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">{l}</text>
      </g>
    ))}
  </g>
);

const Coil = ({ x, on }) => (
  <g stroke={S} strokeWidth="2">
    <line x1={x} y1={0} x2={x} y2={35} />
    <line x1={x} y1={65} x2={x} y2={100} />
    <rect x={x - 12} y={35} width="24" height="30" fill={on ? "rgba(245,158,11,0.45)" : "#111827"} stroke={on ? "#F59E0B" : S} />
  </g>
);

const Thermal = ({ x }) => (
  <g stroke={S} strokeWidth="2" fill="none">
    <line x1={x} y1={0} x2={x} y2={37} />
    <line x1={x} y1={63} x2={x} y2={100} />
    <rect x={x - 9} y={37} width="18" height="26" />
    <path d={`M ${x} 37 V 45 H ${x + 5} V 55 H ${x} V 63`} />
  </g>
);

const Lamp = ({ on }) => (
  <g stroke={S} strokeWidth="2">
    <line x1={30} y1={0} x2={30} y2={26} />
    <line x1={30} y1={54} x2={30} y2={80} />
    <circle cx={30} cy={40} r={14} fill={on ? "#10B981" : "#111827"} stroke={on ? "#34D399" : S} className={on ? "lamp-glow" : ""} />
    <line x1={20} y1={30} x2={40} y2={50} stroke={on ? "#064E3B" : S} />
    <line x1={40} y1={30} x2={20} y2={50} stroke={on ? "#064E3B" : S} />
  </g>
);

const Motor = ({ status }) => (
  <g stroke={S} strokeWidth="2" fill="none">
    <polyline points="30,0 30,28 47,46" />
    <line x1={70} y1={0} x2={70} y2={36} />
    <polyline points="110,0 110,28 93,46" />
    <circle cx={70} cy={72} r={36} fill="#111827" stroke={status === "on" ? "#F59E0B" : status === "falta" ? "#EF4444" : S} />
    {status === "on" && <circle cx={70} cy={72} r={30} stroke="#F59E0B" strokeDasharray="8 10" className="motor-spin" />}
    <text x={70} y={72} fill={S} stroke="none" fontSize="18" fontFamily="JetBrains Mono" textAnchor="middle">M</text>
    <text x={70} y={90} fill={S} stroke="none" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">3~</text>
  </g>
);

export const ComponentSymbol = ({ comp, st }) => {
  const { type, tag } = comp;
  switch (type) {
    case "fonte":
      return <><Fonte /><Tag x={184} y={14}>{tag}</Tag></>;
    case "disjuntor":
      return <><Contact x={30} closed={!st.off} mark="x" /><Tag x={40} y={44}>{tag}</Tag></>;
    case "disjuntor3":
      return (
        <>
          {[30, 70, 110].map((x) => <Contact key={x} x={x} closed={!st.off} mark="x" />)}
          <Link x1={24} x2={110} y={40} /><Tag x={118} y={20}>{tag}</Tag>
        </>
      );
    case "botoeira_na":
      return <><Contact x={45} closed={st.pressed} /><PushActuator x={45} /><Tag x={2} y={14}>{tag}</Tag></>;
    case "botoeira_nf":
      return <><Contact x={45} closed={!st.pressed} nc /><PushActuator x={45} /><Tag x={2} y={14}>{tag}</Tag></>;
    case "contator":
      return (
        <>
          <Coil x={25} on={st.coil} />
          {[75, 125, 165, 205].map((x, i) => <Contact key={x} x={x} top={0} bottom={100} closed={st.coil} mark={i ? "arc" : undefined} />)}
          <Link x1={37} x2={205} y={56} />
          <Tag x={2} y={-6}>{tag}</Tag>
        </>
      );
    case "rele_termico":
      return (
        <>
          {[25, 65, 105].map((x) => <Thermal key={x} x={x} />)}
          <Contact x={150} top={0} bottom={100} closed={!st.tripped} nc />
          <Contact x={190} top={0} bottom={100} closed={!!st.tripped} />
          <Link x1={114} x2={190} y={56} />
          <Tag x={2} y={-6}>{tag}</Tag>
          {st.tripped && <text x={150} y={118} fill="#EF4444" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle" className="blink">DESARMADO</text>}
        </>
      );
    case "lampada":
      return <><Lamp on={st.lamp} /><Tag x={46} y={44}>{tag}</Tag></>;
    case "motor":
      return (
        <>
          <Motor status={st.motor} />
          <Tag x={2} y={124}>{tag}</Tag>
          {st.motor === "on" && <text x={138} y={124} fill="#F59E0B" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">LIGADO</text>}
          {st.motor === "falta" && <text x={138} y={124} fill="#EF4444" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">FALTA FASE</text>}
        </>
      );
    default:
      return null;
  }
};
