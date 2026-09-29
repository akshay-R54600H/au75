"use client";

import { useState, type FormEvent } from "react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Lock, Mail, AlertCircle, Loader2, Shield } from "lucide-react";

interface AdminLoginFormProps {
  onSuccess: (email: string) => void;
}

export default function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your credentials.");
        return;
      }

      onSuccess(data.email || email);
    } catch (err) {
      console.error("[admin] Login network error:", err);
      setError("Network error. Please verify your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Decorative Tape */}
        <div className="mx-auto -mb-2 h-4 w-28 tape rounded-sm z-10 opacity-70" />

        <div className="card relative p-7 sm:p-9 shadow-md border-2 border-line">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo size="md" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-pen-soft px-3 py-1 text-xs font-bold text-pen mb-2">
              <Shield size={13} />
              <span>Restricted Area</span>
            </div>
            <h1 className="font-hand text-3xl font-bold tracking-tight text-ink">
              Admin Access
            </h1>
            <p className="mt-1 text-sm text-muted">
              Enter your administrator credentials to manage AU75
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-xs font-semibold text-danger animate-fade-in"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="leading-tight">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
              >
                Administrator Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-faint">
                  <Mail size={17} />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@au75.vercel.app"
                  className="w-full rounded-xl border-2 border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-faint transition focus:border-pen focus:outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-faint">
                  <Lock size={17} />
                </span>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border-2 border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-faint transition focus:border-pen focus:outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || !email || !password}
                className="h-11"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-1" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <span>Log In to Admin Panel</span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-line pt-4 text-center text-xs text-faint">
            AU75 Administrator Console · Authenticated via secure HTTP-only cookies
          </div>
        </div>
      </div>
    </div>
  );
}
