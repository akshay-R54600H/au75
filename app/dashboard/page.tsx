"use client";

import AppShell from "@/components/layout/AppShell";
import DemoBanner from "@/components/dashboard/DemoBanner";
import StatStrip from "@/components/dashboard/StatStrip";
import TodayStrip from "@/components/dashboard/TodayStrip";
import SubjectCard from "@/components/dashboard/SubjectCard";
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
          <TodayStrip />
          <section aria-labelledby="subjects-heading">
            <h2 id="subjects-heading" className="mb-2 font-hand text-2xl font-bold text-ink">Subjects</h2>
            <div className="flex flex-col gap-3">
              {state.subjects.map((s) => (
                <SubjectCard key={s.id} subject={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
