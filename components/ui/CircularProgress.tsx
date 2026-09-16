interface Props {
  value: number;
  size?: number;
  label?: string;
  /** Threshold below which the ring turns red. */
  target?: number;
  decimals?: boolean;
}

export default function CircularProgress({ value, size = 88, label, target = 75, decimals = false }: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  const stroke = Math.max(6, size / 12);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped < target ? "rgb(var(--danger))" : clamped < target + 5 ? "rgb(var(--warning))" : "rgb(var(--success))";
  const text = decimals ? clamped.toFixed(1) : String(Math.round(clamped));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-hand font-bold leading-none text-ink" style={{ fontSize: size * 0.3 }}>
          {text}%
        </span>
        {label && <span className="mt-0.5 text-[10px] text-muted">{label}</span>}
      </div>
    </div>
  );
}
