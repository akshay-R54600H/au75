"use client";

import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Wrench, RefreshCw, Construction, Clock, Sparkles } from "lucide-react";

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  updatedAt?: string | null;
  onRefresh?: () => void;
  isChecking?: boolean;
}

export default function MaintenanceScreen({
  title = "AU75 is under maintenance",
  message = "We're making a few improvements. Please check back soon.",
  updatedAt,
  onRefresh,
  isChecking = false,
}: MaintenanceScreenProps) {
  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-paper px-4 py-8 text-ink">
      {/* Top bar with AU75 logo */}
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <Logo size="md" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-xs font-bold text-warning">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          Maintenance in progress
        </span>
      </header>

      {/* Main card */}
      <main className="mx-auto my-auto flex w-full max-w-lg flex-col items-center text-center">
        {/* Decorative Tape */}
        <div className="tape -mb-2 h-4 w-28 rounded-sm z-10 opacity-70" />

        <div className="card relative w-full overflow-hidden p-6 sm:p-10 shadow-lg border-2 border-line">
          {/* Visual icon badge */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-pen-soft text-pen shadow-sm sketch rotate-[-2deg]">
            <div className="relative">
              <Construction size={40} strokeWidth={2.2} className="text-pen" />
              <Wrench
                size={22}
                strokeWidth={2.4}
                className="absolute -bottom-2 -right-3 text-marker rotate-45"
              />
            </div>
          </div>

          {/* Heading with highlighter stroke */}
          <h1 className="font-hand text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            {title}
          </h1>

          {/* Message */}
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            {message}
          </p>

          {/* Status info bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-line bg-surface/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-faint">
              <Clock size={16} />
              <span>
                {formattedTime ? `Updated at ${formattedTime}` : "We'll be back online shortly"}
              </span>
            </div>

            {onRefresh && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={isChecking}
                className="w-full sm:w-auto"
                aria-label="Check if maintenance is finished"
              >
                <RefreshCw
                  size={15}
                  className={isChecking ? "animate-spin text-marker" : "text-muted"}
                />
                <span>{isChecking ? "Checking…" : "Check again"}</span>
              </Button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-faint">
            <Sparkles size={13} className="text-marker" />
            <span>Attendance predictor will resume automatically when live</span>
          </div>
        </div>
      </main>

      {/* Footer note */}
      <footer className="mx-auto text-center text-xs text-faint">
        <p>AU75 · Alliance University Attendance & Timetable Companion</p>
      </footer>
    </div>
  );
}
