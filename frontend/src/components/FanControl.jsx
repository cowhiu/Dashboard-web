function FanControl({ fanEnabled, manualMode, pending, onToggleAuto, onToggleFan }) {
  const fanButtonDisabled = pending || !manualMode;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Ventilation Fan
            </p>
            <button
              type="button"
              onClick={onToggleAuto}
              disabled={pending}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {manualMode ? "AUTO OFF" : "AUTO ON"}
            </button>
          </div>
          <p className="mt-3 font-display text-2xl font-semibold text-white">
            {fanEnabled ? "Running" : "Standby"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Use manual override to simulate classroom ventilation control.
          </p>
        </div>
        <span
          className={`h-3.5 w-3.5 rounded-full ${
            fanEnabled ? "bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" : "bg-slate-500"
          }`}
        />
      </div>

      <button
        type="button"
        onClick={onToggleFan}
        disabled={fanButtonDisabled}
        className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          fanEnabled
            ? "bg-white/8 text-white hover:bg-white/12"
            : "bg-teal-400 text-slate-950 hover:bg-teal-300"
        } ${fanButtonDisabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {pending ? "Updating..." : fanEnabled ? "Turn Fan Off" : "Turn Fan On"}
      </button>
    </section>
  );
}

export default FanControl;
