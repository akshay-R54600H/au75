"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav";
import Logo from "@/components/ui/Logo";

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface px-3 py-6 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-3">
        <Logo />
      </Link>
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-accent-soft text-accent-deep" : "text-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Icon size={18} strokeWidth={2.2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
