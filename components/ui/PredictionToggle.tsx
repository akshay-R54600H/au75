import type { PredictionState } from "@/lib/models/types";
import { haptic } from "@/lib/haptics";

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
  // `sm` stays compact on desktop but keeps a ~36px touch target on phones.
  const pad = size === "sm" ? "min-h-9 px-3.5 text-xs md:min-h-0 md:px-2.5 md:py-1" : "min-h-10 px-4 text-sm";
  return (
    <div role="radiogroup" className="inline-flex gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => {
            if (o.value === value) return;
            haptic();
            onChange(o.value);
          }}
          className={`pressable rounded-full border-2 font-semibold ${pad} ${
            value === o.value ? o.active : "border-line-strong text-muted hover:border-ink/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
