"use client";

import { useEffect } from "react";
import { trackAppVisit } from "@/lib/analytics/client";

/**
 * Lightweight client component mounted in RootLayout.
 * Records anonymous app visit event once per session.
 */
export default function AnalyticsTracker() {
  useEffect(() => {
    trackAppVisit();
  }, []);

  return null;
}
