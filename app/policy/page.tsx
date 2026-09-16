import AppShell from "@/components/layout/AppShell";
import PolicyContent from "@/components/policy/PolicyContent";
import { POLICY_TITLE, POLICY_UPDATED } from "@/lib/policy";

export default function PolicyPage() {
  return (
    <AppShell title={POLICY_TITLE}>
      <p className="-mt-3 mb-5 text-sm text-faint">Last updated: {POLICY_UPDATED}</p>
      <div className="card p-6 sm:p-8">
        <PolicyContent />
      </div>
    </AppShell>
  );
}
