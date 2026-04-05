function AlertBanner({ active, co2 }) {
  if (!active) {
    return null;
  }

  return (
    <div className="animate-pulse rounded-3xl border border-rose-400/40 bg-rose-500/12 px-5 py-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-200">
            Sustained CO2 Alert
          </p>
          <p className="mt-1 text-sm text-rose-100">
            CO2 has remained above 1200 ppm for at least 10 seconds. Increase ventilation now.
          </p>
        </div>
        <div className="rounded-2xl border border-rose-300/30 bg-black/15 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-rose-200">Current</p>
          <p className="font-display text-2xl font-semibold text-white">{co2} ppm</p>
        </div>
      </div>
    </div>
  );
}

export default AlertBanner;
