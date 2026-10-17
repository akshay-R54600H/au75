import type { SubjectStatus } from "@/lib/models/types";

interface Props {
  value: number;
  target?: number;
  label?: string;
  /** Exact status from the engine (respects the "strictly above" rule); overrides `target`. */
  status?: SubjectStatus;
}

const STATUS_BG: Record<SubjectStatus, string> = { safe: "bg-success", warning: "bg-warn", danger: "bg-danger" };

export default function ProgressBar({ value, target = 75, label, status }: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = STATUS_BG[status ?? (clamped < target ? "danger" : clamped < target + 5 ? "warning" : "safe")];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="relative h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${clamped}%` }} />
      <div className="absolute top-0 h-full w-px bg-ink/30" style={{ left: `${target}%` }} aria-hidden="true" />
    </div>
  );
}
