"use client";

import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";

export default function DemoBanner() {
  const { isDemo } = useApp();
  if (!isDemo) return null;
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/60 px-4 py-3 text-sm text-accent-deep">
      <Sparkles size={18} className="mt-0.5 shrink-0" />
      <div>
        <strong>You&apos;re looking at demo data.</strong> Press <strong>Sync</strong> to pull your real
        attendance and timetable from the AU portal — it stays on this device.
      </div>
    </div>
  );
}
