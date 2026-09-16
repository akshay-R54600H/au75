import type { SubjectStatus } from "@/lib/models/types";

const STYLE: Record<SubjectStatus, string> = {
  safe: "bg-success-soft text-success",
  warning: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

export default function StatusBadge({ status, children }: { status: SubjectStatus; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLE[status]}`}>
      {children}
    </span>
  );
}
