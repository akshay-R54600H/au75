"use client";

// Sakura theme scenery: soft sky, a swaying blossom branch, distant hills
// and falling cherry-blossom petals. Rendered only while the Sakura theme
// is active. Petals are drawn on two canvases — a dense layer behind the
// page and a few large, soft ones drifting in front for depth.

import { useEffect, useId, useRef } from "react";
import { useApp } from "@/lib/context/AppContext";

// ------------------------------------------------------------------
// Petal sprites
// ------------------------------------------------------------------

/** [base, tip] colour pairs — deeper pink at the base, near-white at the tip. */
const PETAL_TONES: [string, string][] = [
  ["#f7a3bc", "#ffeef3"],
  ["#ffc2d2", "#fff7f9"],
  ["#f28bab", "#ffdbe5"],
  ["#ffd3de", "#ffffff"],
  ["#f9b1c6", "#fff1f5"],
];

const SPRITE = 64;

/** Notched sakura petal, base at (0,0), tip pointing up, length 1. */
function tracePetal(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-0.55, -0.22, -0.56, -0.78, -0.2, -1);
  ctx.lineTo(0, -0.86);
  ctx.lineTo(0.2, -1);
  ctx.bezierCurveTo(0.56, -0.78, 0.55, -0.22, 0, 0);
  ctx.closePath();
}

function makeSprites(): HTMLCanvasElement[] {
  return PETAL_TONES.map(([base, tip]) => {
    const c = document.createElement("canvas");
    c.width = c.height = SPRITE;
    const ctx = c.getContext("2d")!;
    const len = SPRITE * 0.9;
    ctx.translate(SPRITE / 2, SPRITE / 2 + len / 2);
    ctx.scale(len, len);
    const g = ctx.createLinearGradient(0, 0, 0, -1);
    g.addColorStop(0, base);
    g.addColorStop(1, tip);
    tracePetal(ctx);
    ctx.fillStyle = g;
    ctx.fill();
    // Faint centre vein
    ctx.beginPath();
    ctx.moveTo(0, -0.04);
    ctx.quadraticCurveTo(0.03, -0.45, 0, -0.8);
    ctx.lineWidth = 0.025;
    ctx.strokeStyle = "rgba(214, 92, 132, 0.35)";
    ctx.stroke();
    return c;
  });
}

// ------------------------------------------------------------------
// Petal field
// ------------------------------------------------------------------

interface Petal {
  x: number;
  y: number;
  size: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  rot: number;
  vrot: number;
  flip: number;
  vflip: number;
  sprite: number;
  alpha: number;
}

interface FieldOptions {
  count: (w: number, h: number) => number;
  size: [number, number];
  alpha: [number, number];
  speed: number;
}

const BACK: FieldOptions = {
  count: (w, h) => Math.round(Math.min(64, Math.max(20, (w * h) / 24000))),
  size: [9, 17],
  alpha: [0.75, 1],
  speed: 1,
};

const FRONT: FieldOptions = {
  count: (w) => (w < 640 ? 3 : 6),
  size: [24, 36],
  alpha: [0.5, 0.75],
  speed: 1.25,
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function spawn(p: Partial<Petal>, opts: FieldOptions, w: number, h: number, initial: boolean): Petal {
  const size = rand(opts.size[0], opts.size[1]);
  return Object.assign(p, {
    // Wind blows left→right, so new petals enter from the top and left edge.
    x: rand(-w * 0.25, w),
    y: initial ? rand(-h * 0.1, h) : rand(-h * 0.25, -size * 2),
    size,
    vy: (0.35 + size / 28) * opts.speed * rand(0.8, 1.2),
    swayAmp: rand(0.3, 0.9),
    swayFreq: rand(0.0008, 0.0018),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-0.025, 0.025),
    flip: rand(0, Math.PI * 2),
    vflip: rand(0.02, 0.055),
    sprite: Math.floor(Math.random() * PETAL_TONES.length),
    alpha: rand(opts.alpha[0], opts.alpha[1]),
  }) as Petal;
}

function usePetalField(ref: React.RefObject<HTMLCanvasElement>, opts: FieldOptions) {
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprites = makeSprites();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let petals: Petal[] = [];
    let raf = 0;
    let last = performance.now();
    let gust = 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = opts.count(w, h);
      while (petals.length < n) petals.push(spawn({}, opts, w, h, true));
      petals.length = n;
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of petals) {
        ctx!.save();
        ctx!.globalAlpha = p.alpha;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        // Tumbling: squash one axis so the petal appears to turn over.
        ctx!.scale(0.35 + 0.65 * Math.abs(Math.cos(p.flip)), 1);
        ctx!.drawImage(sprites[p.sprite], -p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();
      }
    }

    function frame(now: number) {
      const f = Math.min(3, (now - last) / 16.67);
      last = now;
      gust *= Math.pow(0.97, f);
      // Slowly varying breeze, plus any tap-triggered gust.
      const wind = 0.45 + 0.35 * Math.sin(now * 0.00021) + 0.2 * Math.sin(now * 0.00067 + 1.3) + gust;
      for (const p of petals) {
        p.y += p.vy * f;
        p.x += (wind * (p.size / 14) + Math.sin(now * p.swayFreq + p.phase) * p.swayAmp) * f;
        p.rot += p.vrot * f * (1 + gust);
        p.flip += p.vflip * f;
        if (p.y > h + p.size * 2 || p.x > w + p.size * 2) spawn(p, opts, w, h, false);
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function onTap() {
      gust = Math.min(4, gust + 2.2);
    }

    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    if (!reduced) {
      raf = requestAnimationFrame(frame);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pointerdown", onTap, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onTap);
    };
  }, [ref, opts]);
}

// ------------------------------------------------------------------
// Static scenery
// ------------------------------------------------------------------

const PETAL_PATH = "M0 0 C -4.5 -2.4 -6 -7.6 -2.6 -11 L 0 -9.3 L 2.6 -11 C 6 -7.6 4.5 -2.4 0 0 Z";

/** Five-petal blossom drawn in a -12..12 box. `gid` must be unique per SVG. */
function BlossomDefs({ gid }: { gid: string }) {
  return (
    <defs>
      <radialGradient id={`${gid}-petal`} cx="0" cy="0" r="11" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ef7fa3" />
        <stop offset="0.35" stopColor="#ffbfd0" />
        <stop offset="1" stopColor="#fff3f6" />
      </radialGradient>
      <symbol id={`${gid}-flower`} viewBox="-12 -12 24 24" overflow="visible">
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d={PETAL_PATH} transform={`rotate(${a})`} fill={`url(#${gid}-petal)`} stroke="#f3a5bc" strokeWidth="0.3" />
        ))}
        {[15, 75, 135, 195, 255, 315].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <line x1="0" y1="-1.5" x2="0" y2="-4.6" stroke="#d9507c" strokeWidth="0.45" strokeLinecap="round" />
            <circle cx="0" cy="-4.9" r="0.7" fill="#c23a6a" />
          </g>
        ))}
        <circle r="1.6" fill="#e3608a" />
      </symbol>
    </defs>
  );
}

/** Small standalone blossom, e.g. for the theme picker. */
export function SakuraFlowerIcon({ size = 20, className }: { size?: number; className?: string }) {
  const gid = `sf${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" className={className} aria-hidden="true">
      <BlossomDefs gid={gid} />
      <use href={`#${gid}-flower`} x="-12" y="-12" width="24" height="24" />
    </svg>
  );
}

// [x, y, size, rotation]
const FLOWERS: [number, number, number, number][] = [
  [420, 20, 20, 30], [380, 32, 24, 5], [330, 36, 26, -20], [300, 62, 36, 10], [268, 10, 28, 15],
  [262, 90, 28, 40], [232, 140, 24, 30], [250, 170, 32, 0], [210, 118, 26, 50], [196, 202, 30, -10],
  [160, 142, 32, 20], [118, 162, 28, -30], [70, 112, 28, 10], [88, 182, 22, 40], [42, 192, 32, 0],
];
const BUDS: [number, number, number][] = [
  [362, 50, -30], [140, 186, 20], [100, 120, -50], [226, 184, 15], [24, 178, -20],
];

function Branch() {
  const gid = "au75-sakura-branch";
  return (
    <svg className="sakura-branch" viewBox="0 0 470 240" aria-hidden="true">
      <BlossomDefs gid={gid} />
      <g fill="none" stroke="#5c3141" strokeLinecap="round">
        <path d="M480 14 C 410 26 345 40 292 70 C 242 98 192 112 132 150 C 100 170 72 184 40 192" strokeWidth="7" />
        <path d="M480 14 C 410 26 345 40 292 70" strokeWidth="9" />
        <path d="M342 42 C 322 22 300 12 268 8" strokeWidth="3.5" />
        <path d="M292 70 C 286 110 272 142 250 168" strokeWidth="3.5" />
        <path d="M214 105 C 206 140 210 172 196 202" strokeWidth="3" />
        <path d="M132 150 C 116 126 96 116 70 112" strokeWidth="3" />
        <path d="M100 172 C 96 178 92 180 88 182" strokeWidth="2" />
      </g>
      <path d="M470 12 C 410 22 350 36 300 62" fill="none" stroke="#8c5466" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      {BUDS.map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse rx="3.6" ry="5.4" fill="#f59ab6" />
          <path d="M-3.4 1.5 Q0 6.5 3.4 1.5 L2 5 Q0 6.4 -2 5 Z" fill="#7a4152" />
        </g>
      ))}
      {FLOWERS.map(([x, y, s, r]) => (
        <use
          key={`${x}-${y}`}
          href={`#${gid}-flower`}
          x={-s / 2}
          y={-s / 2}
          width={s}
          height={s}
          transform={`translate(${x} ${y}) rotate(${r})`}
        />
      ))}
    </svg>
  );
}

function Hills() {
  return (
    <svg className="sakura-hills" viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path
        d="M0 150 C 200 92 380 122 560 102 C 760 78 900 132 1080 106 C 1250 86 1350 112 1440 96 L1440 260 L0 260 Z"
        fill="#f8c6d6"
        opacity="0.35"
      />
      <path
        d="M0 212 C 180 182 300 192 470 172 L 690 70 C 710 62 730 62 750 70 L 970 172 C 1120 190 1260 178 1440 200 L1440 260 L0 260 Z"
        fill="#f2b0c6"
        opacity="0.3"
      />
      <path d="M690 70 C 710 62 730 62 750 70 L 778 83 L 752 80 L 734 92 L 716 81 L 696 90 L 662 83 Z" fill="#ffffff" opacity="0.55" />
      <path
        d="M0 236 C 240 216 420 242 720 228 C 1000 216 1200 240 1440 226 L1440 260 L0 260 Z"
        fill="#f5bccf"
        opacity="0.45"
      />
    </svg>
  );
}

// ------------------------------------------------------------------
// Scene
// ------------------------------------------------------------------

function SakuraScene() {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  usePetalField(back, BACK);
  usePetalField(front, FRONT);

  return (
    <>
      <div className="sakura-sky" aria-hidden="true">
        <div className="sakura-sun" />
        <Hills />
        <canvas ref={back} className="sakura-petals" />
        <Branch />
      </div>
      <canvas ref={front} className="sakura-petals-front" aria-hidden="true" />
    </>
  );
}

export default function SakuraBlossoms() {
  const { state } = useApp();
  return state.settings.theme === "sakura" ? <SakuraScene /> : null;
}
