"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SubjectCard from "@/components/dashboard/SubjectCard";
import SubjectDetail from "@/components/subjects/SubjectDetail";
import { useApp } from "@/lib/context/AppContext";

function SubjectsContent() {
  const { state } = useApp();
  const subjectId = useSearchParams().get("subject");

  if (subjectId) return <SubjectDetail subjectId={subjectId} />;

  return (
    <AppShell title="Subjects">
      <div className="flex flex-col gap-3">
        {state.subjects.map((s) => (
          <SubjectCard key={s.id} subject={s} />
        ))}
      </div>
    </AppShell>
  );
}

export default function SubjectsPage() {
  return (
    <Suspense fallback={null}>
      <SubjectsContent />
    </Suspense>
  );
}
