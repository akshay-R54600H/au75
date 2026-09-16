interface Props {
  value: number;
  target?: number;
  label?: string;
}

export default function ProgressBar({ value, target = 75, label }: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped < target ? "bg-danger" : clamped < target + 5 ? "bg-warn" : "bg-success";
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
