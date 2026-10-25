"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav";

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-surface/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              // Tapping the tab you're on scrolls back to the top, like native apps.
              if (active && !window.location.search) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={`group flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
              active ? "text-accent-deep" : "text-faint"
            }`}
          >
            <span
              className={`rounded-full px-4 py-1 transition-[background-color,transform] duration-200 group-active:scale-90 ${
                active ? "bg-accent-soft" : "bg-transparent"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
