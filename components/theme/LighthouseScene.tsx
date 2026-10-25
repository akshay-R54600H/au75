"use client";

// Lighthouse theme scenery: Kaup Beach lighthouse (Udupi) at sunset, drawn
// as vector art modelled on the classic view from the headland — a crimson to
// gold sky with dark cloud streaks, the sea catching the orange light, the
// tall black-and-white tower with its red dome on the right, the keeper's
// building and satellite dishes at its foot, a lamp-lit walkway snaking
// through dark rocks, the yellow stairway on the right, and surf breaking on
// rocks at the bottom left. Rendered only while the Lighthouse theme is active
// (itself offered only to specific students — see lib/themes.ts).

import { useApp } from "@/lib/context/AppContext";

/** Scene is 1440×900; horizon at y=440. */
const HORIZON = 440;

/** Tower: x centre, base y, gallery y, base / top half-widths. */
const CX = 1050;
const BASE_Y = 625;
const TOP_Y = 200;
const BASE_HW = 40;
const TOP_HW = 34;

const BLACK = "#16141a";
const WHITE = "#f3eee8";

function halfWidth(y: number): number {
  const t = (BASE_Y - y) / (BASE_Y - TOP_Y);
  return BASE_HW + (TOP_HW - BASE_HW) * t;
}

function yAt(fraction: number): number {
  return TOP_Y + (BASE_Y - TOP_Y) * fraction;
}

/** Bands from the gallery down, as fractions of the tower height. */
const BANDS: [number, number, string][] = [
  [0, 0.1, WHITE],
  [0.1, 0.3, BLACK],
  [0.3, 0.5, WHITE],
  [0.5, 0.68, BLACK],
  [0.68, 0.85, WHITE],
  [0.85, 1, BLACK],
];

function bandPath(from: number, to: number): string {
  const y1 = yAt(from);
  const y2 = yAt(to);
  const w1 = halfWidth(y1);
  const w2 = halfWidth(y2);
  return `M${CX - w1} ${y1} H${CX + w1} L${CX + w2} ${y2} H${CX - w2} Z`;
}

/** Dark, ragged cloud masses: [path, colour, opacity]. */
const DARK_CLOUDS: [string, string, number][] = [
  // Heavy clouds top right
  ["M760 40 Q860 0 980 20 Q1080 -10 1180 30 Q1300 10 1460 40 L1460 150 Q1380 170 1300 150 Q1220 190 1120 160 Q1020 120 940 110 Q840 100 760 40 Z", "#3a1720", 0.75],
  ["M1180 150 Q1260 130 1340 170 Q1400 190 1460 180 L1460 300 Q1380 290 1320 260 Q1250 240 1180 150 Z", "#4a1a20", 0.6],
  ["M1300 230 Q1360 210 1460 230 L1460 320 Q1400 330 1300 230 Z", "#5a1f1c", 0.55],
  // Long crimson band on the left
  ["M-40 250 Q100 230 260 244 Q420 254 560 270 Q480 300 320 304 Q160 306 -40 300 Z", "#8a1f1c", 0.55],
  // Wispy streaks near the top left
  ["M180 210 Q260 196 340 206 Q300 218 220 220 Z", "#6a1c1c", 0.5],
  ["M560 220 Q680 206 800 222 Q700 236 600 234 Z", "#7a201c", 0.45],
];

/** Glowing red / orange cloud bands across the middle of the sky. */
const BRIGHT_CLOUDS: [string, string, number][] = [
  ["M-40 320 Q200 300 460 322 Q640 336 820 318 Q700 350 460 352 Q200 356 -40 346 Z", "#e03a1f", 0.55],
  ["M560 280 Q760 262 980 282 Q860 300 680 300 Z", "#ff9a3a", 0.5],
  ["M-40 372 Q260 360 560 378 Q800 390 1100 372 Q900 400 560 402 Q240 404 -40 396 Z", "#d8301f", 0.5],
  ["M800 300 Q960 286 1120 306 Q1000 318 860 316 Z", "#ff7a2a", 0.45],
];

/** Rocks out on the water: [x, waterline y, width, height] — drawn as lumpy mounds. */
const SEA_ROCKS: [number, number, number, number][] = [
  [432, 452, 14, 4], [514, 451, 10, 3], [602, 452, 12, 3], [846, 453, 30, 5],
  [752, 528, 84, 20], [784, 552, 44, 12], [524, 612, 76, 18],
];

function rockPath([x, y, w, h]: [number, number, number, number]): string {
  return `M${x} ${y} Q${x + w * 0.1} ${y - h * 0.8} ${x + w * 0.35} ${y - h} Q${x + w * 0.55} ${y - h * 1.1} ${x + w * 0.7} ${y - h * 0.7} Q${x + w * 0.9} ${y - h * 0.5} ${x + w} ${y} Z`;
}

/** Lamp posts: [x, base y, height]. */
const LAMPS: [number, number, number][] = [
  [700, 640, 44], [1170, 640, 40], [1240, 618, 52], [1290, 600, 50], [1350, 590, 48], [1180, 720, 42],
];

/** Visitors along the walkway: [x, y]. */
const PEOPLE: [number, number][] = [
  [680, 680], [712, 668], [760, 652], [790, 648], [850, 744], [880, 752], [910, 760], [990, 770],
  [1110, 700], [1250, 650], [1300, 640], [1330, 652],
];

/** Small lighthouse for the theme picker. */
export function LighthouseIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size * 0.5} height={size} viewBox="0 0 20 40" className={className} aria-hidden="true">
      <path d="M7.5 4 Q10 0.5 12.5 4 Z" fill="#c8302a" />
      <rect x="7" y="4" width="6" height="4" fill="#ffe9a8" stroke={WHITE} strokeWidth="0.6" />
      <rect x="5.8" y="8" width="8.4" height="1.4" fill={BLACK} />
      <path d="M6.5 9.4 H13.5 L14.4 38 H5.6 Z" fill={WHITE} />
      <path d="M6.4 12.2 H13.6 L13.8 17.8 H6.2 Z M6.1 23.4 H13.9 L14.1 28.4 H5.9 Z M5.8 33.4 H14.2 L14.4 38 H5.6 Z" fill={BLACK} />
    </svg>
  );
}

function Scene() {
  const lanternTop = TOP_Y - 58;
  const domeTop = TOP_Y - 88;
  return (
    <svg className="lighthouse-scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="au75-lh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8e1f17" />
          <stop offset="0.28" stopColor="#d2441d" />
          <stop offset="0.58" stopColor="#f2862a" />
          <stop offset="0.8" stopColor="#f06a2a" />
          <stop offset="1" stopColor="#e2462a" />
        </linearGradient>
        {/* The hidden sun's glow, left of centre */}
        <radialGradient id="au75-lh-sun" cx="0.36" cy="0.62" r="0.5">
          <stop offset="0" stopColor="#ffd45e" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#ffb040" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffb040" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="au75-lh-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8573a" />
          <stop offset="0.22" stopColor="#c8493a" />
          <stop offset="0.5" stopColor="#7a3a44" />
          <stop offset="0.78" stopColor="#3a3646" />
          <stop offset="1" stopColor="#24303c" />
        </linearGradient>
        {/* Sunlight reflected on the water below the glow */}
        <radialGradient id="au75-lh-glint" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#ffb860" stopOpacity="0.75" />
          <stop offset="0.6" stopColor="#ff8a40" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="au75-lh-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a2a" />
          <stop offset="0.5" stopColor="#221a1c" />
          <stop offset="1" stopColor="#141012" />
        </linearGradient>
        <radialGradient id="au75-lh-lamp">
          <stop offset="0" stopColor="#fff2b0" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffd060" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffd060" stopOpacity="0" />
        </radialGradient>
        <clipPath id="au75-lh-water">
          <rect x="0" y={HORIZON} width="1440" height={900 - HORIZON} />
        </clipPath>
        {/* Ragged, soft cloud edges */}
        <filter id="au75-lh-cloud" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="3" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G" result="ragged" />
          <feGaussianBlur in="ragged" stdDeviation="3" />
        </filter>
        {/* Rough natural rock edges */}
        <filter id="au75-lh-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="au75-lh-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="1440" height={HORIZON + 2} fill="url(#au75-lh-sky)" />
      <rect x="0" y="0" width="1440" height={HORIZON + 2} fill="url(#au75-lh-sun)" />
      <g filter="url(#au75-lh-cloud)">
        {BRIGHT_CLOUDS.map(([d, color, opacity], i) => (
          <path key={`b${i}`} d={d} fill={color} opacity={opacity} />
        ))}
        {DARK_CLOUDS.map(([d, color, opacity], i) => (
          <path key={`d${i}`} d={d} fill={color} opacity={opacity} />
        ))}
      </g>

      {/* Sea with the sunset reflected on it */}
      <rect x="0" y={HORIZON} width="1440" height={900 - HORIZON} fill="url(#au75-lh-sea)" />
      <ellipse cx="560" cy={HORIZON} rx="420" ry="260" fill="url(#au75-lh-glint)" clipPath="url(#au75-lh-water)" />
      <g stroke="#ffb070" strokeLinecap="round" opacity="0.35">
        {Array.from({ length: 16 }, (_, i) => {
          const y = HORIZON + 14 + i * 16;
          const x = 120 + ((i * 97) % 420);
          return <line key={i} x1={x} y1={y} x2={x + 120 + (i % 3) * 50} y2={y} strokeWidth={1 + i * 0.08} />;
        })}
      </g>
      <path d="M1250 441 Q1270 434 1296 436 Q1306 438 1312 441 Z" fill="#3a2430" />

      {/* Rocks out on the water, with a little surf at their base */}
      <g fill="#1c1418">
        {SEA_ROCKS.map((r) => (
          <path key={`${r[0]}-${r[1]}`} d={rockPath(r)} />
        ))}
      </g>
      <g stroke="#ffe4d0" strokeOpacity="0.45" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M744 530 Q790 524 842 532 M780 554 Q806 550 832 556 M516 614 Q560 608 606 616" />
      </g>

      <g filter="url(#au75-lh-rough)">
        {/* Mound behind the tower with vegetation */}
        <path d="M930 640 Q940 560 1000 536 Q1060 518 1130 522 Q1200 530 1230 580 Q1250 620 1240 660 Z" fill="#2a2420" />
        <path d="M950 590 Q980 548 1040 534 Q1060 560 1020 590 Q990 604 950 590 Z" fill="#3c5230" opacity="0.9" />
        <path d="M1150 540 Q1200 546 1226 590 Q1190 590 1160 570 Z" fill="#344a2a" opacity="0.85" />

        {/* The headland, sweeping from bottom left up to the right */}
        <path
          d="M300 900 Q330 820 400 780 Q450 740 520 720 Q600 690 660 660 Q720 640 800 630 L940 620
             Q1040 612 1140 628 Q1260 600 1360 580 Q1420 572 1480 580 L1480 960 L280 960 Z"
          fill="url(#au75-lh-rock)"
        />
        {/* Big boulders on the sea side, rim-lit by the sunset */}
        <path d="M380 800 Q420 740 500 730 Q560 726 600 760 Q620 800 580 830 Q500 850 420 840 Z" fill="#2c2124" />
        <path d="M560 700 Q620 660 700 668 Q740 690 720 730 Q660 750 590 740 Z" fill="#2a2022" />
        <path d="M150 860 Q180 820 240 826 Q280 840 270 880 Q220 900 160 896 Z" fill="#1e1618" />
        <path d="M230 900 Q260 870 300 876 Q320 890 316 910 Z" fill="#1e1618" />
      </g>

      {/* Warm sunset rim light along the rock edges facing the sea */}
      <g stroke="#e0703a" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M400 778 Q450 738 520 720 Q600 690 660 660" strokeWidth="3" />
        <path d="M388 798 Q420 742 500 730" strokeWidth="2.5" />
        <path d="M566 702 Q620 662 700 668" strokeWidth="2.5" />
        <path d="M160 858 Q190 822 240 826" strokeWidth="2" />
      </g>
      {/* Surf breaking on the rocks at the bottom left */}
      <g stroke="#f4ece6" strokeLinecap="round" fill="none" opacity="0.6">
        <path d="M120 870 Q150 850 170 856 M260 860 Q300 830 340 836 M330 812 Q360 790 392 792" strokeWidth="2.5" />
        <path d="M60 840 Q120 826 180 840 M200 812 Q260 800 320 810" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* Lit plateau around the tower */}
      <path
        d="M880 640 Q1000 622 1140 632 Q1240 622 1320 616 Q1340 640 1320 668 Q1220 694 1100 692 Q960 692 880 670 Z"
        fill="#5a4630"
        opacity="0.7"
        filter="url(#au75-lh-blur)"
      />
      <ellipse cx="1120" cy="660" rx="260" ry="40" fill="#ffc860" opacity="0.18" filter="url(#au75-lh-blur)" />

      {/* Lamp-lit walkway winding through the rocks */}
      <path
        d="M660 690 Q720 660 800 650 M820 720 Q900 770 1000 772 Q1120 770 1200 720 Q1260 690 1320 680"
        stroke="#ffcf5a"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        opacity="0.45"
        filter="url(#au75-lh-blur)"
      />
      <path
        d="M660 690 Q720 660 800 650 M820 720 Q900 770 1000 772 Q1120 770 1200 720 Q1260 690 1320 680"
        stroke="#e6b450"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Railings along the walkway */}
      <path
        d="M656 680 Q716 650 800 640 M816 710 Q900 760 1000 762 Q1120 760 1196 710 Q1258 680 1320 670"
        stroke="#100c0e"
        strokeWidth="2"
        fill="none"
      />

      {/* Keeper's building left of the tower */}
      <rect x="880" y="574" width="110" height="62" fill="#e9d7b4" />
      <rect x="874" y="566" width="122" height="10" fill="#cbb894" />
      <rect x="898" y="592" width="18" height="22" fill="#4a7aa8" />
      <rect x="944" y="592" width="18" height="22" fill="#4a7aa8" />
      <rect x="990" y="600" width="36" height="34" fill="#d6c4a0" />

      {/* Satellite dishes in front of the tower */}
      <ellipse cx="1150" cy="664" rx="26" ry="14" fill="#f2efe8" transform="rotate(-24 1150 664)" />
      <line x1="1150" y1="672" x2="1154" y2="694" stroke="#8a8078" strokeWidth="3" />
      <ellipse cx="1098" cy="676" rx="15" ry="8" fill="#e8e4dc" transform="rotate(-20 1098 676)" />
      <line x1="1098" y1="681" x2="1100" y2="694" stroke="#8a8078" strokeWidth="2.5" />

      {/* Yellow stairway on the right, running down to the bottom corner */}
      <polygon points="1300,660 1336,652 1480,860 1440,880" fill="#2a2224" />
      <g stroke="#0e0a0c" strokeWidth="2">
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i + 1) / 13;
          return (
            <line
              key={i}
              x1={1300 + (1440 - 1300) * t}
              y1={660 + (880 - 660) * t}
              x2={1336 + (1480 - 1336) * t}
              y2={652 + (860 - 652) * t}
            />
          );
        })}
      </g>
      <path d="M1340 650 L1490 850" stroke="#e8c040" strokeWidth="18" strokeLinecap="round" />
      <path d="M1180 638 L1340 650" stroke="#e8c040" strokeWidth="10" strokeLinecap="round" />

      {/* Visitors */}
      <g fill="#120d10">
        {PEOPLE.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y - 11} width="3.5" height="11" rx="1.6" />
        ))}
      </g>

      {/* Lamp posts */}
      {LAMPS.map(([x, y, h]) => (
        <g key={`${x}-${y}`}>
          <line x1={x} y1={y} x2={x} y2={y - h} stroke="#1a1416" strokeWidth="2" />
          <circle cx={x} cy={y - h - 2} r="16" fill="url(#au75-lh-lamp)" />
          <circle cx={x} cy={y - h - 2} r="3" fill="#fffbe8" />
        </g>
      ))}

      {/* Tower */}
      {BANDS.map(([from, to, color]) => (
        <path key={from} d={bandPath(from, to)} fill={color} />
      ))}
      {/* Sunset light on the left face, shade on the right */}
      <path d={`M${CX - TOP_HW} ${TOP_Y} L${CX - BASE_HW} ${BASE_Y} L${CX - BASE_HW + 14} ${BASE_Y} L${CX - TOP_HW + 12} ${TOP_Y} Z`} fill="#ff9a50" opacity="0.18" />
      <path d={`M${CX + TOP_HW - 14} ${TOP_Y} L${CX + BASE_HW - 16} ${BASE_Y} L${CX + BASE_HW} ${BASE_Y} L${CX + TOP_HW} ${TOP_Y} Z`} fill="#000" opacity="0.28" />
      {[0.05, 0.4, 0.59, 0.76].map((f) => (
        <rect key={f} x={CX - 5} y={yAt(f) - 7} width="10" height="14" fill={f === 0.59 ? "#3a3438" : "#4a4048"} stroke={f === 0.59 ? "#5a5058" : "none"} />
      ))}
      <rect x={CX - 7} y={BASE_Y - 28} width="14" height="28" fill="#2a2830" />

      {/* Gallery deck and railing */}
      <rect x={CX - 46} y={TOP_Y - 10} width="92" height="10" fill={BLACK} />
      <g stroke={BLACK} strokeWidth="2">
        <line x1={CX - 46} y1={TOP_Y - 28} x2={CX + 46} y2={TOP_Y - 28} />
        {[-44, -30, -16, -2, 12, 26, 40].map((dx) => (
          <line key={dx} x1={CX + dx + 2} y1={TOP_Y - 28} x2={CX + dx + 2} y2={TOP_Y - 10} />
        ))}
      </g>

      {/* Lantern room: white frame with glowing glass */}
      <circle cx={CX} cy={lanternTop + 24} r="80" fill="url(#au75-lh-lamp)" className="lighthouse-glow" />
      <rect x={CX - 26} y={lanternTop} width="52" height="48" fill={WHITE} />
      <rect x={CX - 21} y={lanternTop + 8} width="12" height="30" fill="#fff0b8" />
      <rect x={CX - 6} y={lanternTop + 8} width="12" height="30" fill="#fff0b8" />
      <rect x={CX + 9} y={lanternTop + 8} width="12" height="30" fill="#fff0b8" />

      {/* Red dome, weathervane and lightning rod */}
      <path d={`M${CX - 30} ${lanternTop} Q${CX - 28} ${domeTop + 4} ${CX} ${domeTop} Q${CX + 28} ${domeTop + 4} ${CX + 30} ${lanternTop} Z`} fill="#c8302a" />
      <path d={`M${CX - 20} ${lanternTop - 6} Q${CX - 14} ${domeTop + 10} ${CX - 2} ${domeTop + 4}`} stroke="#ff8a70" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" />
      <rect x={CX - 32} y={lanternTop - 3} width="64" height="5" fill="#8e1f1a" />
      <line x1={CX} y1={domeTop} x2={CX} y2={domeTop - 22} stroke="#1a1416" strokeWidth="2.5" />
      <path d={`M${CX} ${domeTop - 18} L${CX + 12} ${domeTop - 14} L${CX} ${domeTop - 10} Z`} fill="#1a1416" />
      <line x1={CX + 60} y1={TOP_Y - 24} x2={CX + 60} y2={TOP_Y - 110} stroke="#1a1416" strokeWidth="2" />
    </svg>
  );
}

export default function LighthouseScene() {
  const { state } = useApp();
  if (state.settings.theme !== "lighthouse") return null;
  return (
    <div className="lighthouse-sky" aria-hidden="true">
      <Scene />
    </div>
  );
}
