const statusStyles = {
  good: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  critical: "border-rose-400/30 bg-rose-500/10 text-rose-200",
};

const statusLabels = {
  good: "Fresh Air",
  warning: "Needs Attention",
  critical: "Poor Air Quality",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
        statusStyles[status] ?? statusStyles.good
      }`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
      {statusLabels[status] ?? statusLabels.good}
    </span>
  );
}

export default StatusBadge;
