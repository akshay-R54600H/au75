/** Scattered pastel squiggles/dots behind the hero, stationery-style. Pure SVG, no JS. */
export default function Confetti() {
  const items = [
    { x: 6, y: 18, k: "squig", c: "#ffd9e7", r: -20 },
    { x: 14, y: 70, k: "dot", c: "#d2ecde" },
    { x: 22, y: 30, k: "tri", c: "#e6eaf9", r: 15 },
    { x: 30, y: 82, k: "squig", c: "#ffe9b0", r: 30 },
    { x: 40, y: 12, k: "dot", c: "#ffd9e7" },
    { x: 52, y: 88, k: "tri", c: "#d2ecde", r: -25 },
    { x: 60, y: 20, k: "squig", c: "#cfe4fa", r: 10 },
    { x: 70, y: 75, k: "dot", c: "#e6eaf9" },
    { x: 78, y: 28, k: "tri", c: "#ffe9b0", r: 40 },
    { x: 86, y: 60, k: "squig", c: "#ffd1da", r: -35 },
    { x: 92, y: 15, k: "dot", c: "#cfe4fa" },
    { x: 95, y: 85, k: "squig", c: "#d2ecde", r: 20 },
  ];
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
      {items.map((it, i) => (
        <g key={i} transform={`translate(${it.x} ${it.y}) rotate(${it.r ?? 0})`} style={{ vectorEffect: "non-scaling-stroke" }}>
          {it.k === "dot" && <circle r="0.9" fill={it.c} />}
          {it.k === "tri" && <path d="M0 -1.4 L1.3 1 L-1.3 1 Z" fill="none" stroke={it.c} strokeWidth="0.35" strokeLinejoin="round" />}
          {it.k === "squig" && <path d="M-2 0 q1 -1.5 2 0 t2 0" fill="none" stroke={it.c} strokeWidth="0.4" strokeLinecap="round" />}
        </g>
      ))}
    </svg>
  );
}