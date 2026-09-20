"use client";

import AppShell from "@/components/layout/AppShell";
import DemoBanner from "@/components/dashboard/DemoBanner";
import StatStrip from "@/components/dashboard/StatStrip";
import HomeTimetable from "@/components/dashboard/HomeTimetable";
import SyncButton from "@/components/dashboard/SyncButton";
import { useApp } from "@/lib/context/AppContext";

export default function DashboardPage() {
  const { state } = useApp();

  return (
    <AppShell title="Attendance" action={<SyncButton compact />}>
      {state.isLoading ? (
        <div className="py-10 text-center text-sm text-muted">Loading…</div>
      ) : (
        <>
          <DemoBanner />
          <StatStrip />
          <HomeTimetable />
        </>
      )}
    </AppShell>
  );
}
