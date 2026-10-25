"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  wide?: boolean;
}

/** Drag distance (px) past which releasing the sheet dismisses it. */
const DISMISS_DISTANCE = 110;
/** Or a fast flick (px/ms) of any length. */
const DISMISS_VELOCITY = 0.6;
const EXIT_MS = 200;

/**
 * Dedicated container for all modals, appended to <body> on first use.
 * Portalling straight into <body> breaks when React re-renders <body> (it is
 * owned by the root layout): the dialog node gets swept away and closing the
 * modal throws "removeChild … not a child of this node". In our own container
 * the dialog stays a child of its portal parent even if the container is
 * detached, and the container is re-attached on the next render.
 */
let modalRoot: HTMLDivElement | null = null;
function getModalRoot(): HTMLDivElement {
  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "au75-modal-root";
  }
  if (!modalRoot.isConnected) document.body.appendChild(modalRoot);
  return modalRoot;
}

/**
 * Bottom sheet on phones (slide up, drag the handle/header down to dismiss),
 * centred dialog from `sm` up. Animates out before unmounting.
 */
export default function Modal({ open, onClose, children, title, wide }: Props) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<{ y: number; t: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount immediately on open; play the exit animation before unmounting.
  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      setDrag(0);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const t = setTimeout(() => {
      setRendered(false);
      setClosing(false);
      setDrag(0);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open, rendered]);

  // Escape to close, lock page scroll, move focus in and restore it after.
  useEffect(() => {
    if (!rendered) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [rendered]);

  if (!rendered || typeof document === "undefined") return null;

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("button, a, input")) return;
    if (window.matchMedia("(min-width: 640px)").matches) return;
    dragStart.current = { y: e.clientY, t: Date.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    setDrag(Math.max(0, e.clientY - dragStart.current.y));
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = dragStart.current;
    dragStart.current = null;
    if (!s) return;
    const dy = Math.max(0, e.clientY - s.y);
    const velocity = dy / Math.max(1, Date.now() - s.t);
    if (dy > DISMISS_DISTANCE || (dy > 24 && velocity > DISMISS_VELOCITY)) onClose();
    else setDrag(0);
  }

  const dragging = dragStart.current !== null;
  const dragHandlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  // Portal out of the page tree: an ancestor with a transform or backdrop
  // filter (the page-in animation, the blurred header, scenic-theme cards)
  // would otherwise become the containing block for `fixed`, trapping the
  // sheet inside it instead of covering the screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center pt-10 sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[2px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        style={drag ? { opacity: Math.max(0.2, 1 - drag / 400) } : undefined}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`card relative flex max-h-[90vh] max-h-[90dvh] w-full flex-col overflow-hidden outline-none max-sm:!rounded-b-none max-sm:!rounded-t-[1.75rem] max-sm:!border-b-0 ${
          wide ? "sm:max-w-3xl" : "sm:max-w-md"
        } ${closing ? "animate-sheet-down sm:animate-pop-out" : "animate-sheet-up sm:animate-pop-in"}`}
        style={{
          ["--sheet-drag" as string]: `${drag}px`,
          ...(drag && !closing ? { transform: `translateY(${drag}px)` } : {}),
          ...(dragging ? { transition: "none" } : { transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }),
        }}
      >
        <div className="shrink-0 touch-none sm:touch-auto" {...dragHandlers}>
          <div className="flex justify-center pb-1 pt-2.5 sm:hidden" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </div>
          {title && (
            <div className="flex items-center justify-between border-b border-line px-5 pb-3 pt-1.5 sm:pt-3.5">
              <h2 className="font-hand text-2xl font-bold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="pressable -mr-1.5 flex h-10 w-10 items-center justify-center rounded-full text-faint hover:bg-ink/5 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">{children}</div>
      </div>
    </div>,
    getModalRoot()
  );
}
