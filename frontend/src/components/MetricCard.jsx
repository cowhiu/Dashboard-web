function MetricCard({ title, value, unit, description, accentClass = "", children }) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur ${accentClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-4xl font-semibold text-white">{value}</span>
            {unit ? <span className="pb-1 text-base text-slate-400">{unit}</span> : null}
          </div>
          {description ? <p className="mt-3 text-sm text-slate-400">{description}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export default MetricCard;
