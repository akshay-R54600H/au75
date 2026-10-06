"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Clock,
  User,
  Database,
  Save,
  Loader2,
  RefreshCw,
  Power,
  ShieldCheck,
  Check,
} from "lucide-react";

interface AdminDashboardProps {
  adminEmail: string;
  onLogout: () => void;
}

interface MaintenanceData {
  maintenanceMode: boolean;
  title: string;
  message: string;
  updatedAt: string;
  updatedBy?: string | null;
  isSupabaseConnected?: boolean;
}

export default function AdminDashboard({ adminEmail, onLogout }: AdminDashboardProps) {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMessage, setSavingMessage] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Form fields for customizable message
  const [titleInput, setTitleInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/maintenance", {
        headers: { "Cache-Control": "no-cache" },
        cache: "no-store",
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      if (res.ok) {
        const json = await res.json();
        setData(json);
        setTitleInput(json.title || "AU75 is under maintenance");
        setMessageInput(json.message || "We're making a few improvements. Please check back soon.");
      }
    } catch (err) {
      console.error("[admin] Failed to fetch maintenance config:", err);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      onLogout();
    }
  };

  const handleToggleMaintenance = async () => {
    if (!data) return;
    setTogglingStatus(true);
    setFeedback(null);
    setIsConfirmModalOpen(false);

    const targetMode = !data.maintenanceMode;

    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceMode: targetMode,
          title: titleInput,
          message: messageInput,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: result.error || "Unable to update maintenance status. Please try again.",
        });
        return;
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              maintenanceMode: targetMode,
              updatedAt: result.data?.updatedAt || new Date().toISOString(),
              updatedBy: adminEmail,
            }
          : null
      );

      setFeedback({
        type: "success",
        text: targetMode
          ? "AU75 is now in MAINTENANCE mode. All students will see the maintenance screen."
          : "AU75 is now LIVE! Normal application access restored.",
      });
    } catch (err) {
      console.error("[admin] Toggle error:", err);
      setFeedback({
        type: "error",
        text: "Unable to update maintenance status. Please try again.",
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSaveMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setSavingMessage(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleInput,
          message: messageInput,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: result.error || "Unable to save maintenance message.",
        });
        return;
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              title: titleInput,
              message: messageInput,
              updatedAt: result.data?.updatedAt || new Date().toISOString(),
              updatedBy: adminEmail,
            }
          : null
      );

      setFeedback({
        type: "success",
        text: "Maintenance message updated successfully.",
      });
    } catch (err) {
      console.error("[admin] Save message error:", err);
      setFeedback({
        type: "error",
        text: "Unable to save message. Please try again.",
      });
    } finally {
      setSavingMessage(false);
    }
  };

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return "Unknown";
    try {
      return new Date(iso).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-20 pt-6 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div className="border-l-2 border-line pl-3">
              <span className="eyebrow block">Administrator</span>
              <h1 className="font-hand text-2xl font-bold tracking-tight text-ink">
                AU75 ADMIN PANEL
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-muted">
              <User size={14} className="text-pen" />
              <span className="font-semibold text-ink">{adminEmail}</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchConfig}
              disabled={loading}
              title="Refresh status"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-semibold border animate-fade-in ${
              feedback.type === "success"
                ? "border-success/30 bg-success-soft text-success"
                : "border-danger/30 bg-danger-soft text-danger"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{feedback.text}</div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Grid: Status Card + Main Control Card */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: Application Status */}
          <section className="card p-6 shadow-sm border-2 border-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow flex items-center gap-1.5">
                  <Radio size={14} className="text-pen" />
                  Application Status
                </span>
                <span className="text-xs text-faint flex items-center gap-1">
                  <Clock size={12} />
                  Live Polling: 10s
                </span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-muted flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-marker" />
                  <span>Loading system status…</span>
                </div>
              ) : data?.maintenanceMode ? (
                <div className="rounded-2xl border-2 border-warning/40 bg-warning-soft p-5 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-warning" />
                    </span>
                    <h2 className="font-hand text-3xl font-bold tracking-tight text-warning">
                      MAINTENANCE MODE
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-ink font-medium">
                    AU75 is currently offline for all students. The global maintenance screen is active across all routes.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-success/40 bg-success-soft p-5 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success" />
                    </span>
                    <h2 className="font-hand text-3xl font-bold tracking-tight text-success">
                      LIVE
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-ink font-medium">
                    Application is operational. Students can sync, calculate skips, and view timetables normally.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-line text-xs text-muted flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-semibold text-ink">
                  {formatTimestamp(data?.updatedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Updated By:</span>
                <span className="font-semibold text-ink">{data?.updatedBy || "system"}</span>
              </div>
            </div>
          </section>

          {/* Card 2: Maintenance Control Toggle */}
          <section className="card p-6 shadow-sm border-2 border-line flex flex-col justify-between">
            <div>
              <span className="eyebrow flex items-center gap-1.5 mb-4">
                <Power size={14} className="text-marker" />
                Maintenance Control
              </span>

              <h2 className="font-hand text-2xl font-bold text-ink">
                Global Maintenance Switch
              </h2>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                Toggling this switch updates the server database immediately. Within 10 seconds, all open student sessions automatically transition.
              </p>
            </div>

            <div className="mt-6 pt-4">
              {data?.maintenanceMode ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={loading || togglingStatus}
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="bg-success border-success hover:bg-success/90 min-h-14 text-base font-bold shadow-sm"
                >
                  {togglingStatus ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      <span>Taking App Live…</span>
                    </>
                  ) : (
                    <>
                      <Check size={20} className="mr-1 stroke-[3]" />
                      <span>TAKE APP LIVE</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  disabled={loading || togglingStatus}
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="min-h-14 text-base font-bold shadow-sm"
                >
                  {togglingStatus ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      <span>Enabling Maintenance…</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} className="mr-1" />
                      <span>PUT APP INTO MAINTENANCE</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </section>
        </div>

        {/* Usage Analytics Section */}
        <AdminAnalytics onSessionExpired={onLogout} />

        {/* Card 3: Customizable Maintenance Message */}
        <section className="card p-6 sm:p-8 shadow-sm border-2 border-line">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="eyebrow">Public Maintenance Message</span>
              <h2 className="font-hand text-2xl font-bold text-ink">
                Customize Screen Text
              </h2>
              <p className="text-xs text-muted">
                These words will appear on the student maintenance screen when maintenance mode is active.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveMessage} className="space-y-4">
            <div>
              <label
                htmlFor="maintenance-title"
                className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
              >
                Screen Title Heading
              </label>
              <input
                id="maintenance-title"
                type="text"
                required
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="AU75 is under maintenance"
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-faint transition focus:border-pen focus:outline-none font-medium"
                disabled={loading || savingMessage}
              />
            </div>

            <div>
              <label
                htmlFor="maintenance-message"
                className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
              >
                Detailed Message to Students
              </label>
              <textarea
                id="maintenance-message"
                rows={3}
                required
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="We're making a few improvements. Please check back soon."
                className="w-full rounded-xl border-2 border-line bg-surface p-4 text-sm text-ink placeholder:text-faint transition focus:border-pen focus:outline-none font-medium resize-none"
                disabled={loading || savingMessage}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading || savingMessage}
                className="px-6"
              >
                {savingMessage ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Message</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* Card 4: System & Database Diagnostics */}
        <section className="card p-6 shadow-sm border border-line bg-surface/60">
          <span className="eyebrow flex items-center gap-1.5 mb-3">
            <Database size={13} className="text-pen" />
            Backend Storage Status
          </span>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
              <span className="text-muted">Database Engine:</span>
              <span className="flex items-center gap-1.5 font-bold text-ink">
                {data?.isSupabaseConnected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span>Supabase (PostgreSQL)</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-pen" />
                    <span>Local Disk Persistence (.data)</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
              <span className="text-muted">Admin Session Security:</span>
              <span className="flex items-center gap-1 font-bold text-success">
                <ShieldCheck size={14} />
                <span>AES-256-GCM (HttpOnly)</span>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={
          data?.maintenanceMode
            ? "Take AU75 live again?"
            : "Put AU75 into maintenance mode?"
        }
      >
        <div className="p-6 text-left space-y-4">
          <p className="text-sm text-ink leading-relaxed">
            {data?.maintenanceMode ? (
              <span>
                Normal AU75 application access will be restored for all students. Their attendance calculations and timetables will become immediately available again.
              </span>
            ) : (
              <span>
                All users currently using AU75 will automatically see the maintenance screen within approximately 10 seconds. You will still retain full access to this administrator panel.
              </span>
            )}
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={togglingStatus}
            >
              Cancel
            </Button>

            {data?.maintenanceMode ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleToggleMaintenance}
                disabled={togglingStatus}
                className="bg-success border-success hover:bg-success/90"
              >
                {togglingStatus ? "Taking Live…" : "Take Live"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleToggleMaintenance}
                disabled={togglingStatus}
              >
                {togglingStatus ? "Enabling…" : "Enable Maintenance"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
