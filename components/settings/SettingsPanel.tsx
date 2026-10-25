"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Download, Upload, LogOut, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import { forgetSavedLogin, loadQuickLogin } from "@/lib/platform/credentials";
import { THEMES, availableThemes, isRestrictedTheme } from "@/lib/themes";
import { APP_VERSION } from "@/lib/tnc";
import type { AppSettings, ExamMilestone, ThemeId } from "@/lib/models/types";
import Button from "@/components/ui/Button";
import { SakuraFlowerIcon } from "@/components/theme/SakuraBlossoms";
import { BatIcon } from "@/components/theme/BatmanBackdrop";
import { LighthouseIcon } from "@/components/theme/LighthouseScene";
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

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full border-2 border-line-strong p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`pressable min-h-9 rounded-full px-3.5 text-xs font-bold ${value === o.id ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

/** Fixed preview colours — each swatch shows its own theme, whatever is active. */
const THEME_PREVIEW: Record<ThemeId, { bg: string; card: string; dot: string }> = {
  system: { bg: "linear-gradient(135deg, #fdfcf7 50%, #161621 50%)", card: "#ffffff", dot: "#2f3aa3" },
  light: { bg: "#fdfcf7", card: "#ffffff", dot: "#2f3aa3" },
  dark: { bg: "#161621", card: "#1d1d2c", dot: "#8792ff" },
  sakura: { bg: "linear-gradient(160deg, #fff9fa, #fde0ea)", card: "rgba(255,255,255,0.85)", dot: "#d64f7e" },
  batman: { bg: "linear-gradient(160deg, #1c1c21, #0d0d0f)", card: "#18181b", dot: "#facc15" },
  lighthouse: { bg: "linear-gradient(180deg, #9a2318, #f2852a 45%, #e2462a 55%, #3a2a33)", card: "rgba(255,248,240,0.9)", dot: "#c43a1e" },
};

function ThemePicker({ value, onChange, studentId }: { value: ThemeId; onChange: (v: ThemeId) => void; studentId?: string }) {
  // Student-only themes appear once the synced student ID is checked.
  const [allowed, setAllowed] = useState<ThemeId[]>(() => THEMES.filter((t) => !isRestrictedTheme(t.id)).map((t) => t.id));
  useEffect(() => {
    let cancelled = false;
    availableThemes(studentId).then((ids) => !cancelled && setAllowed(ids));
    return () => {
      cancelled = true;
    };
  }, [studentId]);
  const themes = THEMES.filter((t) => allowed.includes(t.id));

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`mt-2 grid grid-cols-2 gap-2 ${themes.length > 5 ? "sm:grid-cols-6" : "sm:grid-cols-5"}`}
    >
      {themes.map((t) => {
        const p = THEME_PREVIEW[t.id];
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            className={`pressable group rounded-2xl border-2 p-1.5 text-left ${
              active ? "border-pen shadow-[0_6px_18px_-10px_rgb(var(--pen)/0.7)]" : "border-line hover:border-line-strong"
            }`}
          >
            <span className="relative block h-14 overflow-hidden rounded-xl ring-1 ring-inset ring-black/5" style={{ background: p.bg }}>
              <span
                className="absolute bottom-2 left-2 h-6 w-10 rounded-md shadow-sm"
                style={{ background: p.card, border: "1px solid rgba(0,0,0,0.06)" }}
              />
              <span className="absolute bottom-3.5 left-3.5 h-2 w-2 rounded-full" style={{ background: p.dot }} />
              {t.id === "sakura" && (
                <>
                  <SakuraFlowerIcon size={22} className="absolute right-1.5 top-1 transition-transform duration-500 group-hover:rotate-45" />
                  <SakuraFlowerIcon size={13} className="absolute right-8 top-6 opacity-80" />
                  <SakuraFlowerIcon size={10} className="absolute bottom-1.5 right-3 opacity-70" />
                </>
              )}
              {t.id === "batman" && (
                <BatIcon size={30} color="#facc15" className="absolute right-2 top-2 transition-transform duration-300 group-hover:scale-110" />
              )}
              {t.id === "lighthouse" && (
                <LighthouseIcon size={44} className="absolute bottom-0 right-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
              )}
            </span>
            <span className={`mt-1.5 block px-1 text-xs font-bold ${active ? "text-pen" : "text-muted"}`}>
              {t.name}
            </span>
          </button>
        );
      })}
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
            <input type="number" inputMode="decimal" enterKeyHint="done" min={1} max={100} value={target} onChange={(e) => onTarget(e.target.value)} className={`${INPUT} w-20 text-right`} />
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
        <div className="py-2.5">
          <div className="text-sm font-semibold text-ink">Theme</div>
          <ThemePicker value={settings.theme} onChange={(theme) => updateSettings({ theme })} studentId={settings.syncedStudentId} />
        </div>
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
          <a href="https://chat.whatsapp.com/KyCzZjxdfcPFBaVzNrGGKH" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[#25D366]">
            WhatsApp <ExternalLink size={11} />
          </a>
        </span>
      </div>
    </div>
  );
}
