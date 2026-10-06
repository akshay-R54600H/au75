"use client";

import { useEffect } from "react";

/** Registers /sw.js in production so the app is installable and works offline. */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});
  }, []);
  return null;
}
