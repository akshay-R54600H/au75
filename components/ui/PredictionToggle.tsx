import type { PredictionState } from "@/lib/models/types";

interface Props {
  value: PredictionState;
  onChange: (state: PredictionState) => void;
  size?: "sm" | "md";
}

const OPTIONS: { value: PredictionState; label: string; active: string }[] = [
  { value: "present", label: "Attend", active: "bg-success text-white border-success" },
  { value: "absent", label: "Skip", active: "bg-danger text-white border-danger" },
  { value: "ignore", label: "Ignore", active: "bg-faint text-white border-faint" },
];

export default function PredictionToggle({ value, onChange, size = "md" }: Props) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <div role="radiogroup" className="inline-flex gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border-2 font-semibold transition-colors ${pad} ${
            value === o.value ? o.active : "border-line-strong text-muted hover:border-ink/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
