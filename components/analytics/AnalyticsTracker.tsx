"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAppVisit } from "@/lib/analytics/client";

/**
 * Lightweight client component mounted in RootLayout.
 * Records anonymous app visit event once per session.
 * Excludes admin routes so that administrative visits never distort student usage metrics.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }
    trackAppVisit();
  }, [pathname]);

  return null;
}
