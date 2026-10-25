// Horizontal swipe detection for touch screens. Returns handlers to spread
// onto the swipeable element. Vertical scrolling is left alone: a gesture
// only counts when it is clearly sideways, quick-ish and long enough.

import { useRef } from "react";

const MIN_DISTANCE = 56;
const MAX_DURATION = 600;

/** True if the touch began inside something that scrolls sideways itself. */
function inHorizontalScroller(target: EventTarget | null, root: Element): boolean {
  for (let el = target as Element | null; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  return {
    onTouchStart(e: React.TouchEvent) {
      if (e.touches.length !== 1 || inHorizontalScroller(e.target, e.currentTarget)) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    onTouchEnd(e: React.TouchEvent) {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > MAX_DURATION) return;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
