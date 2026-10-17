"use client";

import AppShell from "@/components/layout/AppShell";
import DemoBanner from "@/components/dashboard/DemoBanner";
import StatStrip from "@/components/dashboard/StatStrip";
import DisclaimerCarousel from "@/components/dashboard/DisclaimerCarousel";
import HomeTimetable from "@/components/dashboard/HomeTimetable";
import SyncButton from "@/components/dashboard/SyncButton";
import { useApp } from "@/lib/context/AppContext";

/** Same shape as the loaded dashboard, so nothing jumps when data arrives. */
function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your attendance" className="animate-shimmer">
      <div className="card mb-3 flex items-center gap-5 p-5">
        <div className="skeleton h-[104px] w-[104px] shrink-0 !rounded-full" />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-[92px] p-3">
            <div className="skeleton h-2.5 w-14" />
            <div className="skeleton mt-3 h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="skeleton mb-3 h-7 w-32" />
      {[0, 1].map((i) => (
        <div key={i} className="card mb-3 flex items-start justify-between gap-3 p-4">
          <div className="flex-1 space-y-2.5">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-20 w-20 shrink-0 !rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { state } = useApp();

  return (
    <AppShell title="Attendance" action={<SyncButton compact />}>
      {state.isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DemoBanner />
          <StatStrip />
          <DisclaimerCarousel />
          <HomeTimetable />
        </>
      )}
    </AppShell>
  );
}
