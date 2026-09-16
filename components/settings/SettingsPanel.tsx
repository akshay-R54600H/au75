"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Download, Upload, LogOut, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import { forgetSavedLogin, loadQuickLogin } from "@/lib/platform/credentials";
import { THEMES } from "@/lib/themes";
import { APP_VERSION } from "@/lib/tnc";
import type { AppSettings, ExamMilestone } from "@/lib/models/types";
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
      className={`relative h-7 w-12 rounded-full border-2 transition-colors ${checked ? "border-accent bg-accent" : "border-line-strong bg-line"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
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
  const [hasSaved, setHasSaved] = useState(() => Boolean(loadQuickLogin()));
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
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
        </span>
      </div>
    </div>
  );
}
