"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { LucideIcon, AlertTriangle, Info, RefreshCw } from "lucide-react";

export interface DisclaimerNotice {
  type: "nptel" | "erp" | "sync";
  title: string;
  message: string;
  border: string;
  bg: string;
  icon: LucideIcon;
  iconColor: string;
}

export const NOTICES: DisclaimerNotice[] = [
  {
    type: "nptel",
    title: "NPTEL Notice",
    message:
      "Please do not consider NPTEL subject attendance, as regular classes are not conducted till the end of the semester.",
    border: "border-warn/40",
    bg: "bg-warn-soft/40",
    icon: AlertTriangle,
    iconColor: "text-warn",
  },
  {
    type: "erp",
    title: "AU ERP Data",
    message:
      "AU75 only displays data from AU ERP. Any changes in AU ERP will reflect here.",
    border: "border-pen/30",
    bg: "bg-pen-soft/40",
    icon: Info,
    iconColor: "text-pen",
  },
  {
    type: "sync",
    title: "Sync Notice",
    message:
      "Always sync to get the latest data. AU75 cannot update AU ERP data independently.",
    border: "border-marker/30",
    bg: "bg-marker-soft/35",
    icon: RefreshCw,
    iconColor: "text-marker",
  },
];

export default function DisclaimerCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const isTransitioningRef = useRef(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Rolling step on tap or auto-timer: cards visibly slide from bottom to top
  const step = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const current = activeIndexRef.current;
    const next = (current + 1) % NOTICES.length;

    // Trigger departure of current card upward & arrival of next card from the bottom
    setExitingIndex(current);
    setIncomingIndex(next);

    // 500ms duration for the slide-from-bottom physical transition
    setTimeout(() => {
      setActiveIndex(next);
      setExitingIndex(null);
      setIncomingIndex(null);
      isTransitioningRef.current = false;
    }, 500);
  }, []);

  // Automatic interval (4.5s per card)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const startTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (!isHovered && document.visibilityState === "visible") {
          step();
        }
      }, 4500);
    };

    startTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startTimer();
      } else if (timer) {
        clearInterval(timer);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isHovered, step]);

  // Reduced motion: clean non-sliding switch
  if (prefersReducedMotion) {
    const notice = NOTICES[activeIndex];
    const Icon = notice.icon;
    return (
      <div
        role="region"
        aria-label="Important notices"
        className="card mb-6 cursor-pointer select-none overflow-hidden transition-colors"
        onClick={step}
        title="Tap to see next notice"
      >
        <div
          className={`flex items-start gap-2.5 ${notice.border} ${notice.bg} px-3.5 py-2.5 text-xs text-ink sm:gap-3 sm:px-4 sm:py-3 sm:text-sm`}
        >
          <Icon size={16} className={`mt-0.5 shrink-0 ${notice.iconColor}`} aria-hidden="true" />
          <div className="min-w-0 flex-1 leading-snug">
            <strong className="font-bold text-ink">{notice.title}: </strong>
            <span>{notice.message}</span>
          </div>
        </div>
      </div>
    );
  }

  const isAnimating = exitingIndex !== null && incomingIndex !== null;

  return (
    <div
      role="region"
      aria-label="Important notices"
      className="relative mb-6 cursor-pointer select-none group"
      onClick={step}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Tap to see next notice"
    >
      <style>{`
        @keyframes au75SlideFromBottom {
          0% {
            transform: translateY(48px) scale(0.94);
            opacity: 0.1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
        }
        @keyframes au75SlideToTop {
          0% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-24px) scale(0.96);
            opacity: 0;
          }
        }
        .anim-slide-from-bottom {
          animation: au75SlideFromBottom 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
        .anim-slide-to-top {
          animation: au75SlideToTop 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Sizer: guarantees zero layout shift */}
      <div
        className="card invisible pointer-events-none px-3.5 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm"
        aria-hidden="true"
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 leading-snug">
            <strong className="font-bold">{NOTICES[0].title}: </strong>
            <span>{NOTICES[0].message}</span>
          </div>
        </div>
      </div>
      {/* 20px bottom stack spacer */}
      <div className="h-5 pointer-events-none" aria-hidden="true" />

      {/* Stacked cards container */}
      <div className="absolute inset-0 bottom-5">
        {/* Foundation/Back card in stack */}
        {(() => {
          const backNotice =
            NOTICES[
              (isAnimating ? incomingIndex! + 1 : activeIndex + 2) %
                NOTICES.length
            ];
          const BackIcon = backNotice.icon;
          return (
            <div
              key={`back-${backNotice.type}`}
              className={`card absolute inset-0 overflow-hidden shadow-sm ${backNotice.border}`}
              style={{
                transform: "translateY(16px) scale(0.94)",
                transformOrigin: "top center",
                opacity: 0.6,
                zIndex: 1,
                transition: "transform 400ms ease, opacity 400ms ease",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <div
                className={`absolute inset-0 pointer-events-none ${backNotice.bg}`}
              />
              <div className="relative z-10 flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-ink sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                <BackIcon
                  size={16}
                  className={`mt-0.5 shrink-0 ${backNotice.iconColor}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 leading-snug">
                  <strong className="font-bold text-ink">
                    {backNotice.title}:{" "}
                  </strong>
                  <span className="text-ink/90">{backNotice.message}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Middle card in stack */}
        {(() => {
          const middleNotice =
            NOTICES[
              (isAnimating ? incomingIndex! + 1 : activeIndex + 1) %
                NOTICES.length
            ];
          const MiddleIcon = middleNotice.icon;
          return (
            <div
              key={`middle-${middleNotice.type}`}
              className={`card absolute inset-0 overflow-hidden shadow-sm ${middleNotice.border}`}
              style={{
                transform: "translateY(8px) scale(0.97)",
                transformOrigin: "top center",
                opacity: 0.8,
                zIndex: 2,
                transition: "transform 400ms ease, opacity 400ms ease",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <div
                className={`absolute inset-0 pointer-events-none ${middleNotice.bg}`}
              />
              <div className="relative z-10 flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-ink sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                <MiddleIcon
                  size={16}
                  className={`mt-0.5 shrink-0 ${middleNotice.iconColor}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 leading-snug">
                  <strong className="font-bold text-ink">
                    {middleNotice.title}:{" "}
                  </strong>
                  <span className="text-ink/90">{middleNotice.message}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* If transitioning: Render the outgoing card sliding upward */}
        {isAnimating &&
          (() => {
            const outNotice = NOTICES[exitingIndex!];
            const OutIcon = outNotice.icon;
            return (
              <div
                key={`outgoing-${outNotice.type}`}
                className={`card absolute inset-0 overflow-hidden shadow-md anim-slide-to-top ${outNotice.border}`}
                style={{
                  transformOrigin: "top center",
                  zIndex: 4,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                <div
                  className={`absolute inset-0 pointer-events-none ${outNotice.bg}`}
                />
                <div className="relative z-10 flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-ink sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                  <OutIcon
                    size={16}
                    className={`mt-0.5 shrink-0 ${outNotice.iconColor}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 leading-snug">
                    <strong className="font-bold text-ink">
                      {outNotice.title}:{" "}
                    </strong>
                    <span className="text-ink/90">{outNotice.message}</span>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Front / Incoming card: visibly slides up from the bottom */}
        {(() => {
          const frontNotice = isAnimating
            ? NOTICES[incomingIndex!]
            : NOTICES[activeIndex];
          const FrontIcon = frontNotice.icon;
          return (
            <div
              key={`front-${frontNotice.type}-${
                isAnimating ? "incoming" : "idle"
              }`}
              role="note"
              aria-label={frontNotice.title}
              className={`card absolute inset-0 overflow-hidden shadow-md ${
                frontNotice.border
              } ${isAnimating ? "anim-slide-from-bottom" : ""}`}
              style={{
                transform: isAnimating ? undefined : "translateY(0px) scale(1)",
                transformOrigin: "top center",
                opacity: 1,
                zIndex: 3,
                pointerEvents: "auto",
              }}
            >
              <div
                className={`absolute inset-0 pointer-events-none ${frontNotice.bg}`}
              />
              <div className="relative z-10 flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-ink sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                <FrontIcon
                  size={16}
                  className={`mt-0.5 shrink-0 ${frontNotice.iconColor}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 leading-snug">
                  <strong className="font-bold text-ink">
                    {frontNotice.title}:{" "}
                  </strong>
                  <span className="text-ink/90">{frontNotice.message}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
