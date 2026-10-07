import React from "react";

/**
 * Hand-drawn doodle illustrations for AU75.
 * Individual scattered stationery doodles with organic float animations.
 */

export const DoodlePencilLeft: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 50 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-12 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(10, 8) rotate(-25)">
      {/* Pencil Body */}
      <path
        d="M5 0 L15 0 L15 35 L10 42 L5 35 Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#fdfcf7"
        className="dark:fill-[#2a2d3d]"
      />
      {/* Lead Tip */}
      <path d="M10 35 L10 42" strokeWidth="1.8" />
      {/* Ridge marks */}
      <path d="M5 8 L15 8" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.7" />
      {/* Eraser */}
      <path
        d="M5 0 L15 0 L15 -5 L5 -5 Z"
        strokeWidth="1.6"
        fill="#ffd9e2"
        className="dark:fill-[#6e2942]"
      />
    </g>
  </svg>
);

export const DoodleLightbulb: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 44 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-10 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(10, 8)">
      {/* Bulb body */}
      <path
        d="M12 2 C6 2 2 6 2 12 C2 16 5 19 7 21 L7 25 L17 25 L17 21 C19 19 22 16 22 12 C22 6 18 2 12 2 Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#fffbeb"
        className="dark:fill-[#3a331e]"
      />
      {/* Base screw lines */}
      <path d="M9 25 L15 25" strokeWidth="1.8" />
      <path d="M10 28 L14 28" strokeWidth="1.8" />
      {/* Filament */}
      <path d="M10 12 L14 12 L12 16 L12 8" strokeWidth="1.4" strokeLinecap="round" />
      {/* Glowing rays */}
      <path d="M12 -2 L12 -6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 0 L-2 -2" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 0 L26 -2" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  </svg>
);

export const DoodleRulerLeft: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 55 65"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-11 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(18, 5) rotate(32)">
      <rect
        x="0"
        y="0"
        width="13"
        height="52"
        rx="2"
        strokeWidth="1.8"
        fill="#fcfaf3"
        className="dark:fill-[#252839]"
      />
      <line x1="0" y1="10" x2="6" y2="10" strokeWidth="1.4" />
      <line x1="0" y1="20" x2="9" y2="20" strokeWidth="1.4" />
      <line x1="0" y1="30" x2="6" y2="30" strokeWidth="1.4" />
      <line x1="0" y1="40" x2="9" y2="40" strokeWidth="1.4" />
    </g>
  </svg>
);

export const DoodleBook: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 85 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-18 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(6, 4)">
      {/* Open pages */}
      <path
        d="M 0 25 C 10 19, 26 19, 36 25 C 46 19, 62 19, 72 25 L 72 50 C 62 44, 46 44, 36 50 C 26 44, 10 44, 0 50 Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="#FFFFFF"
        className="dark:fill-[#222536]"
      />
      {/* Center spine */}
      <path d="M 36 25 L 36 50" strokeWidth="1.8" />
      {/* Left ruled lines */}
      <line x1="8" y1="30" x2="28" y2="30" strokeWidth="1.2" opacity="0.65" />
      <line x1="8" y1="36" x2="28" y2="36" strokeWidth="1.2" opacity="0.65" />
      <line x1="8" y1="42" x2="22" y2="42" strokeWidth="1.2" opacity="0.65" />
      {/* Right ruled lines */}
      <line x1="44" y1="30" x2="64" y2="30" strokeWidth="1.2" opacity="0.65" />
      <line x1="44" y1="36" x2="64" y2="36" strokeWidth="1.2" opacity="0.65" />
      <line x1="44" y1="42" x2="58" y2="42" strokeWidth="1.2" opacity="0.65" />
    </g>
  </svg>
);

export const DoodleLaptop: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 70 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-16 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(6, 8)">
      {/* Screen casing */}
      <rect
        x="9"
        y="0"
        width="40"
        height="26"
        rx="2"
        strokeWidth="1.8"
        fill="#FAFAFA"
        className="dark:fill-[#202334]"
      />
      <path
        d="M13 4 H45 V20 H13 Z"
        strokeWidth="1.2"
        fill="#FFFFFF"
        className="dark:fill-[#181a27]"
      />
      {/* Star on screen */}
      <path
        d="M29 8 L30.5 11 L34 11.5 L31.5 13.5 L32 17 L29 15 L26 17 L26.5 13.5 L24 11.5 L27.5 11 Z"
        stroke="#e0175c"
        strokeWidth="1.2"
        fill="#ffeef4"
        className="dark:fill-[#521b33] dark:stroke-[#ff609e]"
      />
      {/* Laptop base */}
      <path
        d="M1 26 L57 26 C58 26, 59 27, 58 29 L56 31 H2 Z"
        strokeWidth="1.8"
        fill="#fef9ef"
        className="dark:fill-[#272a3d]"
      />
      <line x1="24" y1="28" x2="34" y2="28" strokeWidth="1.2" />
    </g>
  </svg>
);

export const DoodleTriangle: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 50 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-10 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(5, 5)">
      <path
        d="M0 32 L36 32 L0 0 Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="#fefcf4"
        className="dark:fill-[#242738]"
      />
      <path
        d="M6 27 L24 27 L6 10 Z"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
      <line x1="0" y1="20" x2="4" y2="20" strokeWidth="1.2" />
      <line x1="0" y1="12" x2="4" y2="12" strokeWidth="1.2" />
      <line x1="12" y1="32" x2="12" y2="28" strokeWidth="1.2" />
      <line x1="20" y1="32" x2="20" y2="28" strokeWidth="1.2" />
    </g>
  </svg>
);

export const DoodlePencilRight: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 45 55"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-11 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(10, 8) rotate(38)">
      <path
        d="M0 0 L10 0 L10 38 L5 45 L0 38 Z"
        strokeWidth="1.8"
        fill="#fdfcf7"
        className="dark:fill-[#2a2d3d]"
      />
      <path d="M5 38 L5 45" strokeWidth="1.4" />
      <path
        d="M0 -5 L10 -5 L10 0 L0 0 Z"
        strokeWidth="1.5"
        fill="#ffd9e2"
        className="dark:fill-[#6e2942]"
      />
    </g>
  </svg>
);

export const DoodleIdeaBulb: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 45 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-11 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(8, 8)">
      <path
        d="M15 0 C8 0 3 5 3 12 C3 17 7 21 9 23 L9 28 L21 28 L21 23 C23 21 27 17 27 12 C27 5 22 0 15 0 Z"
        strokeWidth="1.8"
        fill="#fffbeb"
        className="dark:fill-[#3a331e]"
      />
      <line x1="11" y1="28" x2="19" y2="28" strokeWidth="1.8" />
      <line x1="12" y1="31" x2="18" y2="31" strokeWidth="1.8" />
      {/* Filament Rays */}
      <line x1="15" y1="-4" x2="15" y2="-8" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="26" y1="0" x2="30" y2="-3" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="4" y1="0" x2="0" y2="-3" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  </svg>
);

export const DoodleSlimPen: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 30 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-8 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(10, 5) rotate(-15)">
      <path
        d="M0 0 L8 0 L8 30 L4 36 L0 30 Z"
        strokeWidth="1.6"
        fill="#fdfcf7"
        className="dark:fill-[#2a2d3d]"
      />
      <path d="M4 30 L4 36" strokeWidth="1.4" />
      <line x1="0" y1="6" x2="8" y2="6" strokeWidth="1" strokeDasharray="1 1" />
    </g>
  </svg>
);

export const DoodleRulerRight: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 45 55"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-10 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(18, 5) rotate(-25)">
      <rect
        x="0"
        y="0"
        width="11"
        height="44"
        rx="2"
        strokeWidth="1.8"
        fill="#fcfaf3"
        className="dark:fill-[#252839]"
      />
      <line x1="0" y1="8" x2="5" y2="8" strokeWidth="1.4" />
      <line x1="0" y1="16" x2="8" y2="16" strokeWidth="1.4" />
      <line x1="0" y1="24" x2="5" y2="24" strokeWidth="1.4" />
      <line x1="0" y1="32" x2="8" y2="32" strokeWidth="1.4" />
    </g>
  </svg>
);

export const DoodleBinderClip: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-9 h-auto text-ink stroke-current ${className}`}
  >
    <g transform="translate(6, 6)">
      {/* Wire loop */}
      <path
        d="M8 5 C12 0, 16 0, 20 5 L16 18 L12 18 Z"
        strokeWidth="1.6"
        fill="#fef9ef"
        className="dark:fill-[#2a2c3a]"
      />
      {/* Clip body */}
      <rect
        x="6"
        y="18"
        width="16"
        height="12"
        rx="2"
        strokeWidth="1.8"
        fill="#2f3aa3"
        className="dark:fill-[#5a68e8]"
      />
    </g>
  </svg>
);

export const DoodleSquiggle: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = "w-16 h-auto", color = "#ff609e" }) => (
  <svg
    viewBox="0 0 60 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none ${className}`}
  >
    <path
      d="M3 14 C 10 4, 18 20, 28 10 C 38 0, 46 18, 57 11"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DoodleSparkleStar: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = "w-6 h-6", color = "#e0175c" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`select-none ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2 L13.8 8.2 L20 9 L15 13.2 L16.8 19.5 L12 16 L7.2 19.5 L9 13.2 L4 9 L10.2 8.2 L12 2 Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity="0.15"
    />
  </svg>
);

export const DoodlePastelBlob: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = "w-5 h-4", color = "#ffd9e7" }) => (
  <div
    className={`rounded-[40%_60%_70%_30%/40%_50%_60%_50%] transition-transform ${className}`}
    style={{ backgroundColor: color }}
  />
);

/**
 * HeroFloatingDoodles:
 * The complete scattered, floating doodles system framing the hero section.
 * Responsive, interactive (hover wobble/pop), with asynchronous floating keyframes.
 */
export const HeroFloatingDoodles: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 mx-auto max-w-6xl overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ===================== LEFT SIDE SCATTER ===================== */}

      {/* 1. Far Top-Left Pink Squiggle */}
      <div
        className="absolute left-[2%] sm:left-[4%] lg:left-[6%] top-[8%] sm:top-[12%] z-10"
        title="Doodle squiggle"
      >
        <DoodleSquiggle color="#ff609e" className="w-12 sm:w-16 h-auto -rotate-12" />
      </div>

      {/* 2. Top-Left Glowing Idea Lightbulb */}
      <div
        className="absolute left-[10%] sm:left-[13%] lg:left-[16%] top-[14%] sm:top-[16%] z-10"
        title="Bright idea!"
      >
        <DoodleLightbulb className="w-9 sm:w-11 rotate-12" />
      </div>

      {/* 3. Mid-Left Tilted Pencil */}
      <div
        className="absolute left-[4%] sm:left-[8%] lg:left-[11%] top-[28%] sm:top-[30%] z-10"
        title="Exam pencil"
      >
        <DoodlePencilLeft className="w-11 sm:w-13 -rotate-12" />
      </div>

      {/* 4. Mid-Left Slanted Measuring Ruler */}
      <div
        className="absolute left-[1%] sm:left-[4%] lg:left-[7%] top-[45%] sm:top-[46%] z-10"
        title="Attendance ruler"
      >
        <DoodleRulerLeft className="w-10 sm:w-12 rotate-6" />
      </div>

      {/* 5. Mid-Left Open Notebook */}
      <div
        className="absolute left-[8%] sm:left-[12%] lg:left-[15%] top-[54%] sm:top-[56%] z-10"
        title="Class notes"
      >
        <DoodleBook className="w-16 sm:w-20 -rotate-6" />
      </div>

      {/* 6. Lower-Left Laptop with Pink Star */}
      <div
        className="absolute left-[4%] sm:left-[7%] lg:left-[10%] top-[70%] sm:top-[72%] z-10"
        title="Portal sync laptop"
      >
        <DoodleLaptop className="w-14 sm:w-18 rotate-6" />
      </div>

      {/* 7. Lower-Left Set-Square Triangle */}
      <div
        className="absolute left-[12%] sm:left-[15%] lg:left-[18%] top-[82%] sm:top-[84%] z-10"
        title="Geometry doodle"
      >
        <DoodleTriangle className="w-9 sm:w-11 -rotate-12" />
      </div>

      {/* 8. Bottom-Left Soft Mint Oval Blob */}
      <div
        className="absolute left-[3%] sm:left-[5%] top-[86%] opacity-75"
      >
        <DoodlePastelBlob color="#d2ecde" className="w-5 h-3.5 dark:opacity-60" />
      </div>

      {/* ===================== CENTER SCATTER (ABOVE TITLE) ===================== */}

      {/* 9. Floating Pink Pastel Blob (Above 'e' in 'exactly') */}
      <div
        className="absolute left-[35%] sm:left-[39%] top-[7%] sm:top-[9%] z-10"
        title="Pastel confetti"
      >
        <DoodlePastelBlob color="#ffd9e7" className="w-5 h-3.5 dark:opacity-80" />
      </div>

      {/* 10. Floating Sparkle Star near center top */}
      <div
        className="absolute left-[56%] sm:left-[58%] top-[10%] sm:top-[12%] z-10"
        title="Sparkle"
      >
        <DoodleSparkleStar color="#ff609e" className="w-5 h-5 sm:w-6 sm:h-6 rotate-12" />
      </div>

      {/* ===================== RIGHT SIDE SCATTER ===================== */}

      {/* 11. Top-Right Angled Sharp Pencil */}
      <div
        className="absolute right-[11%] sm:right-[14%] lg:right-[17%] top-[12%] sm:top-[14%] z-10"
        title="Sketch pencil"
      >
        <DoodlePencilRight className="w-10 sm:w-12 rotate-12" />
      </div>

      {/* 12. Top-Right Radiating Idea Bulb */}
      <div
        className="absolute right-[5%] sm:right-[8%] lg:right-[11%] top-[20%] sm:top-[22%] z-10"
        title="Idea spark!"
      >
        <DoodleIdeaBulb className="w-10 sm:w-12 -rotate-12" />
      </div>

      {/* 13. Far-Right Soft Blue Pastel Blob */}
      <div
        className="absolute right-[2%] sm:right-[4%] lg:right-[6%] top-[25%] opacity-75"
      >
        <DoodlePastelBlob color="#cfe4fa" className="w-5 h-4 dark:opacity-60" />
      </div>

      {/* 14. Mid-Right Second Pencil / Stylus */}
      <div
        className="absolute right-[13%] sm:right-[16%] lg:right-[19%] top-[34%] sm:top-[36%] z-10"
        title="Pen"
      >
        <DoodleSlimPen className="w-8 sm:w-9 rotate-6" />
      </div>

      {/* 15. Mid-Right Slanted Ruler */}
      <div
        className="absolute right-[7%] sm:right-[10%] lg:right-[13%] top-[46%] sm:top-[48%] z-10"
        title="Ruler"
      >
        <DoodleRulerRight className="w-9 sm:w-11 -rotate-6" />
      </div>

      {/* 16. Lower Mid-Right Binder Clip */}
      <div
        className="absolute right-[12%] sm:right-[15%] lg:right-[17%] top-[60%] sm:top-[62%] z-10"
        title="Binder clip"
      >
        <DoodleBinderClip className="w-9 sm:w-10 rotate-12" />
      </div>

      {/* 17. Lower-Right Geometry Triangle */}
      <div
        className="absolute right-[8%] sm:right-[11%] lg:right-[14%] top-[72%] sm:top-[74%] z-10"
        title="Triangle doodle"
      >
        <DoodleTriangle className="w-9 sm:w-11 rotate-12" />
      </div>

      {/* 18. Bottom-Right Pink Wavy Squiggle */}
      <div
        className="absolute right-[2%] sm:right-[5%] lg:right-[7%] top-[84%] sm:top-[86%] z-10"
        title="Doodle squiggle"
      >
        <DoodleSquiggle color="#ff609e" className="w-12 sm:w-16 h-auto rotate-12" />
      </div>
    </div>
  );
};

/**
 * Backwards-compatible cluster doodles for existing imports.
 */
export const HeroLeftDoodle: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex items-center justify-center select-none ${className}`}>
    <div className="relative w-full h-auto">
      <DoodlePencilLeft className="absolute -top-3 left-2" />
      <DoodleLightbulb className="absolute -top-6 left-12" />
      <DoodleRulerLeft className="absolute top-2 right-2" />
      <DoodleBook className="relative z-10 mt-6" />
      <DoodleLaptop className="relative z-0 -mt-2 ml-4" />
    </div>
  </div>
);

export const HeroRightDoodle: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex items-center justify-center select-none ${className}`}>
    <div className="relative w-full h-auto">
      <DoodlePencilRight className="absolute -top-4 left-3" />
      <DoodleIdeaBulb className="absolute -top-2 left-12" />
      <DoodleSlimPen className="absolute top-4 right-2" />
      <DoodleRulerRight className="relative z-10 mt-8 ml-8" />
      <DoodleBinderClip className="relative z-0 mt-2 ml-2" />
    </div>
  </div>
);

export const FeedbackLeftDoodle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <DoodleBook className="w-24 h-auto" />
    </div>
  );
};

export const FeedbackRightDoodle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <DoodleIdeaBulb className="w-16 h-auto" />
    </div>
  );
};

export const MagentaDoodleStar = DoodleSparkleStar;

export const DoodleAndroid: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="5" x2="7" y2="1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="22" y1="5" x2="25" y2="1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 13 C7 7, 25 7, 25 13 Z" stroke="currentColor" strokeWidth="1.8" fill="#e9edfa" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="1.2" fill="#2f3aa3" />
    <circle cx="20" cy="10" r="1.2" fill="#2f3aa3" />
    <path d="M7 15 H25 V26 C25 28, 23 29, 21 29 H11 C9 29, 7 28, 7 26 Z" stroke="currentColor" strokeWidth="1.8" fill="#FFFFFF" />
    <path d="M4 16 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M28 16 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DoodleWebApp: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="28" height="22" rx="3" stroke="currentColor" strokeWidth="1.8" fill="#FFFFFF" />
    <line x1="2" y1="12" x2="30" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="8.5" r="1.2" fill="#e0175c" />
    <circle cx="10" cy="8.5" r="1.2" fill="#d97706" />
    <circle cx="14" cy="8.5" r="1.2" fill="#2f3aa3" />
    <path d="M20 18 L25 23 L22 23 L20 27 Z" stroke="currentColor" strokeWidth="1.5" fill="#dbe7ff" />
    <line x1="6" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="6" y1="21" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
);