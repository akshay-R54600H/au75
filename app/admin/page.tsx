"use client";

import { useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";
import Logo from "@/components/ui/Logo";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/admin/session", {
        headers: { "Cache-Control": "no-cache" },
        cache: "no-store",
      });
      const data = await res.json();
      if (data.authenticated && data.email) {
        setAdminEmail(data.email);
      } else {
        setAdminEmail(null);
      }
    } catch {
      setAdminEmail(null);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper text-ink p-4">
        <div className="mb-4">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 size={18} className="animate-spin text-marker" />
          <span>Verifying admin session…</span>
        </div>
      </div>
    );
  }

  if (adminEmail) {
    return (
      <AdminDashboard
        adminEmail={adminEmail}
        onLogout={() => setAdminEmail(null)}
      />
    );
  }

  return <AdminLoginForm onSuccess={(email) => setAdminEmail(email)} />;
}
