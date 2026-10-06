"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Download, Upload, LogOut, ExternalLink, Bell, CheckCircle2, AlertCircle } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import { forgetSavedLogin, loadQuickLogin } from "@/lib/platform/credentials";
import { THEMES } from "@/lib/themes";
import { APP_VERSION } from "@/lib/tnc";
import type { AppSettings, ExamMilestone } from "@/lib/models/types";
import {
  NOTIFICATION_OFFSET_OPTIONS,
  DEFAULT_NOTIFICATION_OFFSET_MINUTES,
  type NotificationOffsetMinutes,
} from "@/lib/notifications/types";
import {
  generateSchedule,
  clearSentNotificationHistory,
} from "@/lib/notifications/scheduler";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  sendTodayClassAlert,
} from "@/lib/notifications/manager";
import Button from "@/components/ui/Button";
import InstallButton from "@/components/pwa/InstallButton";

const INPUT = "w-full min-h-11 rounded-xl border-2 border-paper-edge bg-surface px-3.5 py-2.5 text-base text-ink focus:border-pen focus:outline-none transition";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card mb-4 p-5">
      <h2 className="font-hand text-2xl font-bold text-ink">{title}</h2>
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="text-sm font-semibold text-ink">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        checked ? "border-accent bg-accent" : "border-line-strong bg-line"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full border-2 border-line-strong p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${value === o.id ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPanel() {
  const { state, isDemo, updateSettings, clearData, exportAppData, importAppData } = useApp();
  const { settings } = state;
  const [target, setTarget] = useState(String(settings.attendanceTarget));
  const [msg, setMsg] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setHasSaved(Boolean(loadQuickLogin()));
  }, []);

  useEffect(() => {
    setTarget(String(settings.attendanceTarget));
  }, [settings.attendanceTarget]);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  const notifConfig = settings.notifications ?? {
    enabled: true,
    offsetMinutes: DEFAULT_NOTIFICATION_OFFSET_MINUTES,
  };
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [testSending, setTestSending] = useState(false);

  const nextNotification = useMemo(() => {
    if (!notifConfig.enabled) return null;
    const schedule = generateSchedule({
      sessions: state.sessions,
      academicDays: state.academicDays,
      offsetMinutes: notifConfig.offsetMinutes || DEFAULT_NOTIFICATION_OFFSET_MINUTES,
      nowMs: Date.now(),
    });
    return schedule[0] || null;
  }, [state.sessions, state.academicDays, notifConfig.enabled, notifConfig.offsetMinutes]);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  async function handleRequestPermission() {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      flash("Notification permission granted!");
    } else if (perm === "denied") {
      flash("Notification permission was denied in browser settings.");
    }
  }

  async function handleToggleNotifications(enabled: boolean) {
    if (enabled) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("au75_notif_manually_disabled");
      }
      if (!isNotificationSupported()) {
        flash("Notifications are not supported on this browser/device.");
        return;
      }
      let perm = getNotificationPermission();
      if (perm !== "granted") {
        perm = await requestNotificationPermission();
        setNotifPermission(perm);
      }
      updateSettings({
        notifications: {
          enabled: true,
          offsetMinutes: notifConfig.offsetMinutes || DEFAULT_NOTIFICATION_OFFSET_MINUTES,
        },
      });
      if (perm === "granted") {
        flash(`Class notifications enabled (${notifConfig.offsetMinutes || 5} min before class).`);
      } else {
        flash("Class notifications enabled. Please allow notifications when prompted.");
      }
    } else {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("au75_notif_manually_disabled", "true");
      }
      updateSettings({
        notifications: {
          enabled: false,
          offsetMinutes: notifConfig.offsetMinutes || DEFAULT_NOTIFICATION_OFFSET_MINUTES,
        },
      });
      flash("Class notifications disabled.");
    }
  }

  function handleSelectOffset(offset: NotificationOffsetMinutes) {
    updateSettings({
      notifications: {
        enabled: notifConfig.enabled,
        offsetMinutes: offset,
      },
    });
    flash(`Notification timing set to ${offset} minutes before class.`);
  }

  async function handleTestNotification() {
    setTestSending(true);
    try {
      if (!isNotificationSupported()) {
        flash("Notifications aren't supported on this browser/device.");
        return;
      }
      let perm = getNotificationPermission();
      if (perm !== "granted") {
        perm = await requestNotificationPermission();
        setNotifPermission(perm);
      }
      if (perm === "granted") {
        const sent = await sendTestNotification();
        if (sent) flash("Test notification sent! Check your notifications.");
        else flash("Could not trigger test notification.");
      } else {
        flash("Cannot send test notification: permission blocked.");
      }
    } finally {
      setTestSending(false);
    }
  }

  async function handleSendTodayAlert() {
    setTestSending(true);
    try {
      if (!isNotificationSupported()) {
        flash("Notifications aren't supported on this browser/device.");
        return;
      }
      let perm = getNotificationPermission();
      if (perm !== "granted") {
        perm = await requestNotificationPermission();
        setNotifPermission(perm);
      }
      if (perm === "granted") {
        const sent = await sendTodayClassAlert();
        if (sent) flash("Today's real class notification sent!");
        else flash("Could not trigger class notification.");
      } else {
        flash("Cannot send notification: permission blocked.");
      }
    } finally {
      setTestSending(false);
    }
  }

  function onTarget(v: string) {
    setTarget(v);
    const n = parseFloat(v);
    if (n > 0 && n <= 100) updateSettings({ attendanceTarget: n });
  }

  function setMilestones(milestones: ExamMilestone[]) {
    updateSettings({ milestones });
  }

  async function exportJson() {
    const blob = new Blob([JSON.stringify(await exportAppData(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `au75-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text()
      .then((t) => importAppData(JSON.parse(t)))
      .then(() => flash("Imported."))
      .catch(() => flash("Import failed: not a valid AU75 export."));
    e.target.value = "";
  }

  return (
    <div className="animate-fade-up">
      {msg && <div role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent-deep">{msg}</div>}

      <Section title="Target">
        <Row label="Attendance target" hint="Most AU courses need 75%">
          <div className="flex items-center gap-1">
            <input type="number" min={1} max={100} value={target} onChange={(e) => onTarget(e.target.value)} className={`${INPUT} w-20 text-right`} />
            <span className="text-sm text-muted">%</span>
          </div>
        </Row>
        <Row label="Rule">
          <Segmented<AppSettings["requirement"]>
            value={settings.requirement}
            options={[{ id: "atLeast", name: "At least" }, { id: "strictlyAbove", name: "Above" }]}
            onChange={(requirement) => updateSettings({ requirement })}
          />
        </Row>
      </Section>

      <Section title="Exams" hint="Add exam dates to see your projected attendance before each one.">
        {settings.milestones.length === 0 && <p className="mb-2 text-sm text-faint">No exams added.</p>}
        <div className="flex flex-col gap-2">
          {settings.milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <input
                className={`${INPUT} min-w-0 flex-1`}
                value={m.label}
                placeholder="e.g. CAT II"
                onChange={(e) => setMilestones(settings.milestones.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)))}
              />
              <input
                type="date"
                className={INPUT}
                value={m.date}
                onChange={(e) => setMilestones(settings.milestones.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)))}
              />
              <button
                type="button"
                aria-label={`Remove ${m.label}`}
                onClick={() => setMilestones(settings.milestones.filter((x) => x.id !== m.id))}
                className="rounded-full p-2 text-faint hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() =>
            setMilestones([
              ...settings.milestones,
              { id: `m-${Date.now()}`, label: settings.milestones.length ? "" : "CAT II", date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) },
            ])
          }
        >
          <Plus size={14} /> Add exam
        </Button>
      </Section>

      <Section title="Display">
        <Row label="Theme">
          <Segmented value={settings.theme} options={THEMES} onChange={(theme) => updateSettings({ theme })} />
        </Row>
        <Row label="Show decimals" hint="74.6% instead of 75%">
          <Toggle checked={settings.showDecimals} onChange={(showDecimals) => updateSettings({ showDecimals })} label="Show decimals" />
        </Row>
        <Row label="Phone app" hint="Add AU75 to your home screen">
          <InstallButton size="sm" />
        </Row>
      </Section>

      <Section title="Notifications" hint="Receive an automatic alert before each scheduled class based on your timetable.">
        <Row label="Class Notifications" hint="Receive a notification before each scheduled class">
          <Toggle
            checked={notifConfig.enabled}
            onChange={handleToggleNotifications}
            label="Class Notifications"
          />
        </Row>

        {/* Permission Request Banner if pending */}
        {notifConfig.enabled && notifPermission === "default" && (
          <div className="my-2.5 rounded-xl border border-marker/40 bg-marker-soft/60 p-3 text-xs text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-marker shrink-0" />
              <span>Allow browser notifications to receive automatic class alerts.</span>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="shrink-0 rounded-lg bg-marker px-3 py-1.5 text-xs font-bold text-paper shadow-xs hover:opacity-95 transition"
            >
              Allow Notifications
            </button>
          </div>
        )}

        {/* Warning if blocked */}
        {notifPermission === "denied" && (
          <div className="my-2.5 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger flex items-start gap-2 animate-fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Notifications are blocked by your browser/device.</strong>
              <span>Enable notifications from your browser/device settings to receive class alerts.</span>
            </div>
          </div>
        )}

        {/* Warning if unsupported */}
        {notifPermission === "unsupported" && (
          <div className="my-2.5 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning flex items-start gap-2 animate-fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>Notifications aren&apos;t supported on this browser/device.</span>
          </div>
        )}

        {/* Timing Selection (5 minutes default) */}
        <div className="border-t border-line pt-3 mt-2">
          <div className="text-sm font-semibold text-ink mb-0.5">Notify Before Class</div>
          <p className="text-xs text-muted mb-2.5">Choose when you want to receive the notification.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NOTIFICATION_OFFSET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOffset(opt.value)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl border-2 py-2 px-3 text-xs font-bold transition ${
                  notifConfig.offsetMinutes === opt.value
                    ? "border-marker bg-marker-soft text-marker font-extrabold shadow-xs"
                    : "border-paper-edge bg-surface text-muted hover:border-pen/40 hover:text-ink"
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === 5 && (
                  <span className="text-[10px] uppercase font-bold opacity-80">(Default)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Next Scheduled Alert Preview */}
        {mounted && notifConfig.enabled && nextNotification && (
          <div className="mt-3.5 rounded-xl border border-marker/40 bg-marker-soft/50 p-3 text-xs text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Bell size={15} className="text-marker shrink-0" />
              <div className="truncate">
                <span className="font-bold text-marker">Next alert scheduled:</span>{" "}
                <span className="font-semibold text-ink">{nextNotification.subjectName}</span>{" "}
                <span suppressHydrationWarning className="text-muted">
                  ({nextNotification.venue}) at {new Date(nextNotification.notificationTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                clearSentNotificationHistory();
                flash("Notification history cleared. Upcoming alerts re-scheduled.");
              }}
              className="shrink-0 text-[11px] font-semibold text-muted hover:text-ink underline transition"
            >
              Reset Sent History
            </button>
          </div>
        )}

        {/* Status message and test button */}
        <div className="mt-3.5 pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            {notifConfig.enabled && notifPermission === "granted" ? (
              <span className="flex items-center gap-1.5 text-success font-semibold">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>You&apos;ll be notified {notifConfig.offsetMinutes} minutes before your scheduled classes.</span>
              </span>
            ) : notifConfig.enabled && notifPermission === "denied" ? (
              <span className="text-danger font-medium">Notifications blocked by browser.</span>
            ) : notifConfig.enabled && notifPermission === "default" ? (
              <span className="text-amber-600 font-medium flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0 text-amber-500" />
                <span>Class notifications enabled (browser permission pending).</span>
              </span>
            ) : (
              <span className="text-muted">Class notifications are disabled.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSendTodayAlert}
              disabled={testSending}
              className="text-xs shrink-0"
            >
              <Bell size={13} />
              <span>{testSending ? "Sending…" : "Send Today's Class Alert"}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleTestNotification}
              disabled={testSending}
              className="text-xs shrink-0"
            >
              <span>Test Ping</span>
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Your data" hint="Everything lives in this browser. Export a backup before switching devices.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportJson}><Download size={14} /> Export</Button>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
          {hasSaved && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                forgetSavedLogin();
                setHasSaved(false);
                flash("Saved login removed.");
              }}
            >
              <LogOut size={14} /> Forget saved login
            </Button>
          )}
          {!isDemo && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm("Clear synced data and go back to demo data?")) {
                  clearData();
                  flash("Cleared.");
                }
              }}
            >
              <Trash2 size={14} /> Clear synced data
            </Button>
          )}
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-faint">
        <span>AU75 v{APP_VERSION}</span>
        <span className="flex gap-4">
          <Link href="/policy" className="hover:text-ink">Terms &amp; privacy</Link>
          <a href="https://tally.so/r/aQ1WNX" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
            Feedback <ExternalLink size={11} />
          </a>
          <a href="https://chat.whatsapp.com/KyCzZjxdfcPFBaVzNrGGKH" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[#25D366]">
            WhatsApp <ExternalLink size={11} />
          </a>
        </span>
      </div>
    </div>
  );
}
