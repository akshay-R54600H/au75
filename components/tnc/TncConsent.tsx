"use client";

import { useEffect, useRef, useState } from "react";
import { hasAcceptedTnC, acceptTnC } from "@/lib/tnc";
import { POLICY_TITLE } from "@/lib/policy";
import PolicyContent from "@/components/policy/PolicyContent";

export default function TncConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!hasAcceptedTnC()) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      if (!el || el.scrollHeight === 0) return;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining <= 8) setReachedEnd(true);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const timer = window.setInterval(check, 500);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      window.clearInterval(timer);
    };
  }, [visible]);

  function handleAgree() {
    acceptTnC();
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={POLICY_TITLE}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-fade-in" />

      <div className="card relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden animate-pop-in">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-hand text-2xl font-bold text-ink">
            {POLICY_TITLE}
          </h2>
          <p className="mt-1 text-xs text-faint">
            Please read the policy carefully. Scroll to the end to continue.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          <PolicyContent />
        </div>

        <div className="border-t border-line px-6 py-4">
          <p
            className={`mb-3 text-center text-xs font-medium ${
              reachedEnd ? "text-accent-deep" : "text-faint"
            }`}
          >
            {reachedEnd
              ? "You have read the full policy."
              : "Scroll to the end to enable Continue."}
          </p>
          <button
            type="button"
            disabled={!reachedEnd}
            onClick={handleAgree}
            className={`inline-flex w-full items-center justify-center rounded-xl border-2 px-6 py-3 text-base font-bold transition-colors ${
              reachedEnd
                ? "border-marker bg-marker text-white hover:bg-marker-deep"
                : "cursor-not-allowed border-transparent bg-line/50 text-muted"
            }`}
          >
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
