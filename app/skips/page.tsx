"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SubjectCard from "@/components/dashboard/SubjectCard";
import SubjectDetail from "@/components/subjects/SubjectDetail";
import { useApp } from "@/lib/context/AppContext";

function SkipsContent() {
  const { state } = useApp();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subject");

  if (subjectId) return <SubjectDetail subjectId={subjectId} />;

  return (
    <AppShell title="Plan your skips">
      <div className="flex flex-col gap-3">
        {state.subjects.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-muted">
            No subjects found. Please sync your attendance first.
          </div>
        ) : (
          state.subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} baseHref="/skips" />
          ))
        )}
      </div>
    </AppShell>
  );
}

export default function SkipsPage() {
  return (
    <Suspense fallback={null}>
      <SkipsContent />
    </Suspense>
  );
}
