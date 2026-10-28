export const PageHeader = ({ eyebrow, title, desc, children }) => (
  <div className="flex flex-col gap-4 border-b border-slate-800 px-4 py-6 sm:px-8 md:flex-row md:items-end md:justify-between">
    <div className="fade-up">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-amber-500">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
      {desc && <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">{desc}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);
