"use client";

// Batman theme scenery: a night sky with a crescent moon, a bat-signal
// projected from the rooftops, a few bats drifting past and a Gotham skyline
// with scattered lit windows. Kept dim so it never competes with the content.
// Rendered only while the Batman theme is active.

import { useApp } from "@/lib/context/AppContext";

/** Bat emblem in a 100×50 box. */
const BAT_PATH =
  "M50 10 L53 4 L55 13 C60 12 64 10 66 6 C76 8 90 12 98 24 C90 20 84 22 82 28 C78 24 72 24 69 30 " +
  "C64 28 58 34 50 44 C42 34 36 28 31 30 C28 24 22 24 18 28 C16 22 10 20 2 24 C10 12 24 8 34 6 " +
  "C36 10 40 12 45 13 L47 4 Z";

/** Skyline as [right edge x, roof y] steps across a 1440×200 box. */
const SKYLINE: [number, number][] = [
  [40, 120], [70, 90], [110, 130], [125, 70], [140, 55], [160, 70], [210, 110], [260, 80], [300, 140],
  [320, 60], [330, 40], [350, 60], [400, 100], [440, 130], [490, 85], [530, 120], [545, 50], [555, 30],
  [570, 50], [620, 95], [660, 135], [710, 75], [760, 110], [780, 65], [800, 45], [820, 65], [870, 120],
  [920, 90], [960, 140], [1010, 70], [1050, 105], [1065, 55], [1075, 35], [1090, 55], [1140, 115],
  [1190, 85], [1230, 130], [1280, 65], [1320, 100], [1370, 125], [1440, 80],
];

const SKYLINE_PATH = `M0 200 ${SKYLINE.map(([x, y]) => `V${y} H${x}`).join(" ")} V200 Z`;

/** A sparse, fixed scatter of lit windows (deterministic so SSR and client match). */
const WINDOWS: [number, number][] = (() => {
  const lit: [number, number][] = [];
  let left = 0;
  SKYLINE.forEach(([right, roof], b) => {
    if (right - left >= 30) {
      for (let x = left + 7; x <= right - 10; x += 11) {
        for (let y = roof + 12; y <= 185; y += 15) {
          // Integer hash, so lit windows scatter instead of lining up in rows.
          const h = Math.imul(x * 374761393 + y * 668265263 + b * 1442695041, 1274126177) >>> 0;
          if (h % 9 === 0) lit.push([x, y]);
        }
      }
    }
    left = right;
  });
  return lit;
})();

/** Drifting bats: [top %, size px, duration s, delay s]. */
const BATS: [number, number, number, number][] = [
  [14, 26, 38, 0],
  [26, 18, 46, 12],
  [9, 14, 52, 27],
];

/** Small bat emblem, e.g. for the theme picker. */
export function BatIcon({ size = 24, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size / 2} viewBox="0 0 100 50" className={className} aria-hidden="true">
      <path d={BAT_PATH} fill={color} />
    </svg>
  );
}

/** Bat-signal: a searchlight beam rising from the rooftops onto the clouds. */
function Signal() {
  return (
    <svg className="batman-signal" viewBox="0 0 300 900" preserveAspectRatio="xMaxYMin meet">
      <defs>
        <linearGradient id="au75-bat-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#facc15" stopOpacity="0.01" />
          <stop offset="1" stopColor="#facc15" stopOpacity="0.06" />
        </linearGradient>
        <radialGradient id="au75-bat-glow">
          <stop offset="0.6" stopColor="#facc15" stopOpacity="0.12" />
          <stop offset="1" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
      </defs>
      <polygon points="247,900 253,900 236,104 84,104" fill="url(#au75-bat-beam)" />
      <ellipse cx="160" cy="70" rx="128" ry="74" fill="url(#au75-bat-glow)" />
      <ellipse cx="160" cy="70" rx="96" ry="54" fill="#facc15" fillOpacity="0.12" />
      <path d={BAT_PATH} fill="#0d0d0f" fillOpacity="0.7" transform="translate(91 41) scale(1.38)" />
    </svg>
  );
}

function Skyline() {
  return (
    <svg className="batman-skyline" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice">
      <path d={SKYLINE_PATH} fill="#18181c" />
      <g fill="#facc15" fillOpacity="0.28">
        {WINDOWS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="5" />
        ))}
      </g>
    </svg>
  );
}

function BatmanScene() {
  return (
    <div className="batman-sky" aria-hidden="true">
      <div className="batman-moon" />
      <Signal />
      {BATS.map(([top, size, duration, delay]) => (
        <div
          key={top}
          className="batman-bat"
          style={{ top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
        >
          <BatIcon size={size} color="#3a3a44" />
        </div>
      ))}
      <Skyline />
    </div>
  );
}

export default function BatmanBackdrop() {
  const { state } = useApp();
  return state.settings.theme === "batman" ? <BatmanScene /> : null;
}
