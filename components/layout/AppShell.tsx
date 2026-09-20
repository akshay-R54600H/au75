"use client";

import type { ReactNode } from "react";
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

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {state.isOffline && (
          <div role="status" className="bg-warn-soft px-3 py-1.5 text-center text-xs font-bold text-warn">
            Offline — showing your last synced data
          </div>
        )}

        <header className="flex items-center justify-between px-4 pt-4 md:hidden">
          <Link href="/" aria-label="AU75 home">
            <Logo />
          </Link>
          {action}
        </header>

        <main id="main-content" className="flex-1 px-4 pb-28 pt-4 md:px-10 md:pb-12 md:pt-8">
          <div className="mx-auto w-full max-w-3xl">
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
