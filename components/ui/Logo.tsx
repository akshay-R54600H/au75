export default function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-5xl" : "text-3xl";
  return (
    <span className={`font-hand font-bold leading-none tracking-tight text-ink ${text}`}>
      AU<span className="text-marker">75</span>
    </span>
  );
}
