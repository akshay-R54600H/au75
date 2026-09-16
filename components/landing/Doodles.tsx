import React from "react";

/**
 * Hand-drawn doodle illustrations for AU75.
 * Crafted in sketch/hand-drawn line style to match the homepage mockup.
 */

export const HeroLeftDoodle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width="160"
        height="120"
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[#1f2430]"
      >
        {/* Pencil Top Left */}
        <g transform="translate(15, 10) rotate(-25)">
          <path d="M5 0 L15 0 L15 35 L10 42 L5 35 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#fdfcf7" />
          <path d="M10 35 L10 42" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8 L15 8" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
          {/* Eraser */}
          <path d="M5 0 L15 0 L15 -4 L5 -4 Z" stroke="currentColor" strokeWidth="1.2" fill="#ffd9e2" />
        </g>

        {/* Lightbulb Top Left */}
        <g transform="translate(42, 5)">
          <path d="M12 2 C6 2 2 6 2 12 C2 16 5 19 7 21 L7 25 L17 25 L17 21 C19 19 22 16 22 12 C22 6 18 2 12 2 Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="#fffbeb" />
          <path d="M9 25 L15 25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 28 L14 28" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 12 L14 12 L12 16 L12 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          {/* Rays */}
          <path d="M12 -3 L12 -7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M2 -1 L-2 -3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M22 -1 L26 -3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Ruler slanted */}
        <g transform="translate(115, 20) rotate(35)">
          <rect x="0" y="0" width="12" height="50" rx="1" stroke="currentColor" strokeWidth="1.4" fill="#fcfaf3" />
          <line x1="0" y1="10" x2="5" y2="10" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="20" x2="8" y2="20" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="30" x2="5" y2="30" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="40" x2="8" y2="40" stroke="currentColor" strokeWidth="1" />
        </g>

        {/* Open Book */}
        <g transform="translate(60, 40)">
          <path d="M 0 25 C 10 20, 25 20, 35 25 C 45 20, 60 20, 70 25 L 70 50 C 60 45, 45 45, 35 50 C 25 45, 10 45, 0 50 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="#FFFFFF" />
          <path d="M 35 25 L 35 50" stroke="currentColor" strokeWidth="1.5" />
          {/* Lines on left page */}
          <line x1="8" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="8" y1="36" x2="28" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="8" y1="42" x2="22" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          {/* Lines on right page */}
          <line x1="42" y1="30" x2="62" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="42" y1="36" x2="62" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="42" y1="42" x2="56" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        </g>

        {/* Laptop Bottom Left */}
        <g transform="translate(48, 75)">
          <rect x="10" y="0" width="38" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" fill="#FAFAFA" />
          <path d="M14 4 H44 V18 H14 Z" stroke="currentColor" strokeWidth="1" fill="#FFFFFF" />
          {/* Star on screen */}
          <path d="M29 8 L30.5 11 L34 11.5 L31.5 13.5 L32 17 L29 15 L26 17 L26.5 13.5 L24 11.5 L27.5 11 Z" stroke="#e0175c" strokeWidth="1" fill="#fff3f6" />
          {/* Laptop Base */}
          <path d="M2 24 L56 24 C57 24, 58 25, 57 27 L55 29 H3 Z" stroke="currentColor" strokeWidth="1.5" fill="#fef9ef" />
          <line x1="25" y1="26" x2="33" y2="26" stroke="currentColor" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

export const HeroRightDoodle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width="140"
        height="120"
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[#1f2430]"
      >
        {/* Pencil slanted top right */}
        <g transform="translate(25, 10) rotate(40)">
          <path d="M0 0 L10 0 L10 40 L5 48 L0 40 Z" stroke="currentColor" strokeWidth="1.4" fill="#fdfcf7" />
          <path d="M5 40 L5 48" stroke="currentColor" strokeWidth="1.2" />
          <path d="M0 -4 L10 -4 L10 0 L0 0 Z" stroke="currentColor" strokeWidth="1.2" fill="#ffd9e2" />
        </g>

        {/* Lightbulb */}
        <g transform="translate(45, 20)">
          <path d="M15 0 C8 0 3 5 3 12 C3 17 7 21 9 23 L9 28 L21 28 L21 23 C23 21 27 17 27 12 C27 5 22 0 15 0 Z" stroke="currentColor" strokeWidth="1.5" fill="#fffbeb" />
          <line x1="11" y1="28" x2="19" y2="28" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="31" x2="18" y2="31" stroke="currentColor" strokeWidth="1.5" />
          {/* Filament Rays */}
          <line x1="15" y1="-5" x2="15" y2="-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="26" y1="0" x2="30" y2="-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="4" y1="0" x2="0" y2="-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Second Pencil */}
        <g transform="translate(90, 35) rotate(-15)">
          <path d="M0 0 L8 0 L8 32 L4 38 L0 32 Z" stroke="currentColor" strokeWidth="1.4" fill="#fdfcf7" />
          <path d="M4 32 L4 38" stroke="currentColor" strokeWidth="1.2" />
        </g>

        {/* Ruler Right */}
        <g transform="translate(70, 70) rotate(-25)">
          <rect x="0" y="0" width="10" height="42" rx="1" stroke="currentColor" strokeWidth="1.4" fill="#fcfaf3" />
          <line x1="0" y1="8" x2="5" y2="8" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="24" x2="5" y2="24" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="32" x2="8" y2="32" stroke="currentColor" strokeWidth="1" />
        </g>

        {/* Small Binder Clip / Idea spark */}
        <g transform="translate(20, 75)">
          <path d="M10 5 C15 0, 20 0, 25 5 L20 20 L15 20 Z" stroke="currentColor" strokeWidth="1.2" fill="#fef9ef" />
          <rect x="8" y="20" width="19" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" fill="#2f3aa3" />
        </g>
      </svg>
    </div>
  );
};

export const FeedbackLeftDoodle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width="130"
        height="110"
        viewBox="0 0 130 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[#1f2430]"
      >
        {/* Open Notebook sketch */}
        <g transform="translate(10, 10)">
          <path d="M0 20 C10 16, 20 16, 30 20 C40 16, 50 16, 60 20 L60 45 C50 41, 40 41, 30 45 C20 41, 10 41, 0 45 Z" stroke="currentColor" strokeWidth="1.4" fill="#FFFFFF" />
          <line x1="30" y1="20" x2="30" y2="45" stroke="currentColor" strokeWidth="1.4" />
          <line x1="8" y1="26" x2="24" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="8" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="36" y1="26" x2="52" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        </g>

        {/* Laptop */}
        <g transform="translate(25, 55)">
          <rect x="8" y="0" width="36" height="22" rx="2" stroke="currentColor" strokeWidth="1.4" fill="#FFFFFF" />
          <path d="M12 4 H40 V16 H12 Z" stroke="currentColor" strokeWidth="1" fill="#F0EDED" />
          <circle cx="26" cy="10" r="3" stroke="#2f3aa3" strokeWidth="1.2" fill="#e9edfa" />
          <path d="M0 22 H52 L49 26 H3 Z" stroke="currentColor" strokeWidth="1.4" fill="#E2E1E1" />
        </g>

        {/* Pencil pointing down */}
        <g transform="translate(80, 20) rotate(135)">
          <path d="M0 0 L8 0 L8 28 L4 34 L0 28 Z" stroke="currentColor" strokeWidth="1.3" fill="#fdfcf7" />
          <line x1="4" y1="28" x2="4" y2="34" stroke="currentColor" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

export const FeedbackRightDoodle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width="140"
        height="120"
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-[#1f2430]"
      >
        {/* Test Tube / Flask */}
        <g transform="translate(95, 30)">
          <path d="M8 0 L16 0 M10 0 L10 8 L18 20 C20 23, 19 28, 14 28 C9 28, 8 23, 10 20 L14 8 L14 0" stroke="currentColor" strokeWidth="1.4" fill="#eef4ff" strokeLinejoin="round" />
          {/* Bubbles */}
          <circle cx="14" cy="20" r="1.5" fill="#2f3aa3" />
          <circle cx="11" cy="24" r="2" fill="#2f3aa3" />
          <circle cx="16" cy="14" r="1" fill="#e0175c" />
        </g>

        {/* Lightbulb top right */}
        <g transform="translate(25, 10)">
          <path d="M10 2 C5 2 2 6 2 11 C2 15 5 18 7 20 L7 24 L13 24 L13 20 C15 18 18 15 18 11 C18 6 15 2 10 2 Z" stroke="currentColor" strokeWidth="1.3" fill="#fffbeb" />
          <line x1="8" y1="24" x2="12" y2="24" stroke="currentColor" strokeWidth="1.3" />
        </g>

        {/* Paint Palette */}
        <g transform="translate(60, 60)">
          <path d="M5 25 C0 10, 20 0, 35 5 C50 10, 52 25, 45 35 C38 45, 20 45, 15 35 C12 32, 10 32, 8 33 C6 34, 5 30, 5 25 Z" stroke="currentColor" strokeWidth="1.5" fill="#FAF7F5" />
          {/* Thumb hole */}
          <ellipse cx="14" cy="28" rx="3.5" ry="2.5" stroke="currentColor" strokeWidth="1.2" fill="#fef9ef" />
          {/* Color blobs */}
          <circle cx="22" cy="12" r="3" fill="#e0175c" />
          <circle cx="32" cy="15" r="3" fill="#2f3aa3" />
          <circle cx="38" cy="25" r="3" fill="#d97706" />
          <circle cx="28" cy="35" r="3" fill="#1976d2" />
        </g>

        {/* Pencil slanted */}
        <g transform="translate(10, 65) rotate(-30)">
          <path d="M0 0 L8 0 L8 30 L4 36 L0 30 Z" stroke="currentColor" strokeWidth="1.3" fill="#fdfcf7" />
          <line x1="4" y1="30" x2="4" y2="36" stroke="currentColor" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

export const MagentaDoodleStar: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2L13.8 8.2L20 9L15 13.2L16.8 19.5 L12 16L7.2 19.5L9 13.2L4 9L10.2 8.2L12 2Z"
      stroke="#e0175c"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#ffeef4"
    />
  </svg>
);

export const DoodleAndroid: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Antennae */}
    <line x1="10" y1="5" x2="7" y2="1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="22" y1="5" x2="25" y2="1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    {/* Android Head */}
    <path d="M7 13 C7 7, 25 7, 25 13 Z" stroke="currentColor" strokeWidth="1.8" fill="#e9edfa" strokeLinejoin="round" />
    {/* Eyes */}
    <circle cx="12" cy="10" r="1.2" fill="#2f3aa3" />
    <circle cx="20" cy="10" r="1.2" fill="#2f3aa3" />
    {/* Android Body */}
    <path d="M7 15 H25 V26 C25 28, 23 29, 21 29 H11 C9 29, 7 28, 7 26 Z" stroke="currentColor" strokeWidth="1.8" fill="#FFFFFF" />
    {/* Arms */}
    <path d="M4 16 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M28 16 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DoodleWebApp: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Browser Window sketch */}
    <rect x="2" y="5" width="28" height="22" rx="3" stroke="currentColor" strokeWidth="1.8" fill="#FFFFFF" />
    <line x1="2" y1="12" x2="30" y2="12" stroke="currentColor" strokeWidth="1.5" />
    {/* Window buttons */}
    <circle cx="6" cy="8.5" r="1.2" fill="#e0175c" />
    <circle cx="10" cy="8.5" r="1.2" fill="#d97706" />
    <circle cx="14" cy="8.5" r="1.2" fill="#2f3aa3" />
    {/* Globe or Cursor inside */}
    <path d="M20 18 L25 23 L22 23 L20 27 Z" stroke="currentColor" strokeWidth="1.5" fill="#dbe7ff" />
    <line x1="6" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="6" y1="21" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
);