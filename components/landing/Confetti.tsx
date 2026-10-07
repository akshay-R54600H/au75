/** Scattered pastel squiggles/dots behind the hero, stationery-style. Still / static. */
export default function Confetti() {
  const items = [
    { x: 5, y: 16, k: "squig", c: "#ffd9e7", r: -20 },
    { x: 12, y: 68, k: "dot", c: "#d2ecde" },
    { x: 20, y: 28, k: "tri", c: "#e6eaf9", r: 15 },
    { x: 28, y: 84, k: "squig", c: "#ffe9b0", r: 30 },
    { x: 42, y: 10, k: "dot", c: "#ffd9e7" },
    { x: 54, y: 90, k: "tri", c: "#d2ecde", r: -25 },
    { x: 62, y: 18, k: "squig", c: "#cfe4fa", r: 10 },
    { x: 72, y: 78, k: "dot", c: "#e6eaf9" },
    { x: 80, y: 26, k: "tri", c: "#ffe9b0", r: 40 },
    { x: 88, y: 58, k: "squig", c: "#ffd1da", r: -35 },
    { x: 94, y: 14, k: "dot", c: "#cfe4fa" },
    { x: 96, y: 86, k: "squig", c: "#d2ecde", r: 20 },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden select-none opacity-80">
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            transform: `rotate(${it.r ?? 0}deg)`,
          }}
        >
          {it.k === "dot" && (
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: it.c }}
            />
          )}
          {it.k === "tri" && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1 L13 12 L1 12 Z"
                fill="none"
                stroke={it.c}
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {it.k === "squig" && (
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <path
                d="M1 8 C5 1, 9 11, 14 5 C19 -1, 21 8, 23 6"
                fill="none"
                stroke={it.c}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}