"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import AppFooter from "./AppFooter";
import Logo from "@/components/ui/Logo";
import { useApp } from "@/lib/context/AppContext";

interface Props {
  children: ReactNode;
  title?: string;
  /** Rendered on the right side of the page header. */
  action?: ReactNode;
}

export default function AppShell({ children, title, action }: Props) {
  const { state } = useApp();
  const [scrolled, setScrolled] = useState(false);

  // Frost the sticky mobile header once content scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen min-h-dvh">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {state.isOffline && (
          <div role="status" className="bg-warn-soft px-3 py-1.5 text-center text-xs font-bold text-warn">
            Offline — showing your last synced data
          </div>
        )}

        <header
          className={`sticky top-0 z-30 flex items-center justify-between gap-3 px-4 pb-2 transition-[background-color,box-shadow,border-color] duration-200 md:hidden ${
            scrolled ? "border-b border-line bg-paper/85 shadow-[0_6px_20px_-16px_rgb(0_0_0/0.5)] backdrop-blur-md" : "border-b border-transparent"
          }`}
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
        >
          <Link href="/" aria-label="AU75 home" className="flex min-w-0 items-center gap-3">
            <Logo />
            {title && (
              <span
                aria-hidden="true"
                className={`truncate font-hand text-xl font-bold text-ink transition-all duration-200 ${
                  scrolled ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                {title}
              </span>
            )}
          </Link>
          {action}
        </header>

        <main
          id="main-content"
          className="flex-1 px-4 pb-[max(7rem,calc(6rem_+_env(safe-area-inset-bottom,0px)))] pt-2 md:px-10 md:pb-12 md:pt-8"
        >
          <div className="mx-auto w-full max-w-3xl animate-page-in">
            {(title || action) && (
              <div className="mb-5 flex items-center justify-between gap-3">
                {title && <h1 className="font-hand text-4xl font-bold text-ink">{title}</h1>}
                <div className="hidden md:block">{action}</div>
              </div>
            )}
            {children}
            <AppFooter />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
