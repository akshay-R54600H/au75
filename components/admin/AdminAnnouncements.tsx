"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  ANNOUNCEMENT_ICONS,
  ANNOUNCEMENT_STYLES,
  ANNOUNCEMENT_TYPES,
  announcementIconFor,
  type AnnouncementIcon,
  type AnnouncementType,
} from "@/lib/announcements";
import { Megaphone, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, CalendarClock } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  icon: AnnouncementIcon | null;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface FormState {
  title: string;
  message: string;
  type: AnnouncementType;
  /** Chosen symbol, or null for the type's default. */
  icon: AnnouncementIcon | null;
  enabled: boolean;
  /** `datetime-local` value (local time), or "" for no expiry. */
  expiresAt: string;
}

const ICON_KEYS = Object.keys(ANNOUNCEMENT_ICONS) as AnnouncementIcon[];

interface Props {
  onSessionExpired: () => void;
  onFeedback: (feedback: { type: "success" | "error"; text: string }) => void;
}

const TITLE_MAX = 80;
const MESSAGE_MAX = 400;
const EMPTY_FORM: FormState = { title: "", message: "", type: "announcement", icon: null, enabled: true, expiresAt: "" };

const inputClass =
  "w-full rounded-xl border-2 border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-faint transition focus:border-pen focus:outline-none font-medium";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-muted mb-1.5";

/** ISO timestamp → `datetime-local` input value in the admin's timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function statusOf(a: Announcement): { label: string; className: string } {
  if (!a.enabled) return { label: "Disabled", className: "bg-line text-muted" };
  if (a.expiresAt && Date.parse(a.expiresAt) <= Date.now()) return { label: "Expired", className: "bg-warning-soft text-warning" };
  return { label: "Active", className: "bg-success-soft text-success" };
}

/** Grid of symbols for the announcement; "Auto" uses the type's default icon. */
function SymbolPicker({
  type,
  value,
  onChange,
  disabled,
}: {
  type: AnnouncementType;
  value: AnnouncementIcon | null;
  onChange: (icon: AnnouncementIcon | null) => void;
  disabled: boolean;
}) {
  const options: { key: AnnouncementIcon | null; label: string }[] = [
    { key: null, label: "Auto" },
    ...ICON_KEYS.map((key) => ({ key, label: ANNOUNCEMENT_ICONS[key].label })),
  ];
  const { iconColor } = ANNOUNCEMENT_STYLES[type];

  return (
    <div>
      <span id="announcement-symbol-label" className={labelClass}>
        Symbol
      </span>
      <div role="radiogroup" aria-labelledby="announcement-symbol-label" className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {options.map(({ key, label }) => {
          const Icon = announcementIconFor(type, key);
          const active = value === key;
          return (
            <button
              key={key ?? "auto"}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(key)}
              disabled={disabled}
              title={key === null ? `Auto: the default ${ANNOUNCEMENT_STYLES[type].label.toLowerCase()} icon` : label}
              className={`pressable flex min-h-10 items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 text-left text-[11px] font-semibold ${
                active ? "border-pen bg-pen-soft text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              <Icon size={15} className={`shrink-0 ${iconColor}`} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One notice card as students will see it in the dashboard carousel. */
function NoticePreview({
  type,
  icon,
  title,
  message,
}: {
  type: AnnouncementType;
  icon: AnnouncementIcon | null;
  title: string;
  message: string;
}) {
  const style = ANNOUNCEMENT_STYLES[type];
  const Icon = announcementIconFor(type, icon);
  return (
    <div className={`card overflow-hidden ${style.border}`}>
      <div className={`flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-ink ${style.bg}`}>
        <Icon size={16} className={`mt-0.5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
        <div className="min-w-0 flex-1 break-words leading-snug">
          <strong className="font-bold text-ink">{title.trim() || "Title"}: </strong>
          <span className="text-ink/90">{message.trim() || "Your message will appear here."}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements({ onSessionExpired, onFeedback }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create / edit form (editingId null = creating)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const request = useCallback(
    async (url: string, init?: RequestInit): Promise<{ ok: boolean; json: Record<string, unknown> } | null> => {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
      });
      if (res.status === 401) {
        onSessionExpired();
        return null;
      }
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, json };
    },
    [onSessionExpired]
  );

  const fetchItems = useCallback(async () => {
    try {
      const result = await request("/api/admin/announcements");
      if (result?.ok) setItems((result.json.announcements as Announcement[]) ?? []);
    } catch (err) {
      console.error("[admin] Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      icon: a.icon ?? null,
      enabled: a.enabled,
      expiresAt: toLocalInput(a.expiresAt),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (form.expiresAt && new Date(form.expiresAt).getTime() <= Date.now()) {
      setFormError("Expiry must be in the future (or leave it empty).");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const body = JSON.stringify({
        title: form.title,
        message: form.message,
        type: form.type,
        icon: form.icon,
        enabled: form.enabled,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      });
      const result = editingId
        ? await request(`/api/admin/announcements/${encodeURIComponent(editingId)}`, { method: "PATCH", body })
        : await request("/api/admin/announcements", { method: "POST", body });
      if (!result) return;
      if (!result.ok) {
        setFormError((result.json.error as string) || "Unable to save announcement.");
        return;
      }
      setFormOpen(false);
      onFeedback({ type: "success", text: editingId ? "Announcement updated." : "Announcement published." });
      await fetchItems();
    } catch (err) {
      console.error("[admin] Save announcement error:", err);
      setFormError("Unable to save announcement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Announcement) => {
    setBusyId(a.id);
    try {
      const result = await request(`/api/admin/announcements/${encodeURIComponent(a.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !a.enabled }),
      });
      if (!result) return;
      if (!result.ok) {
        onFeedback({ type: "error", text: (result.json.error as string) || "Unable to update announcement." });
        return;
      }
      onFeedback({ type: "success", text: a.enabled ? "Announcement disabled." : "Announcement enabled." });
      await fetchItems();
    } catch (err) {
      console.error("[admin] Toggle announcement error:", err);
      onFeedback({ type: "error", text: "Unable to update announcement. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    setDeleteTarget(null);
    try {
      const result = await request(`/api/admin/announcements/${encodeURIComponent(target.id)}`, { method: "DELETE" });
      if (!result) return;
      if (!result.ok) {
        onFeedback({ type: "error", text: (result.json.error as string) || "Unable to delete announcement." });
        return;
      }
      onFeedback({ type: "success", text: "Announcement deleted." });
      await fetchItems();
    } catch (err) {
      console.error("[admin] Delete announcement error:", err);
      onFeedback({ type: "error", text: "Unable to delete announcement. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card p-6 sm:p-8 shadow-sm border-2 border-line">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="eyebrow flex items-center gap-1.5">
            <Megaphone size={14} className="text-marker" />
            Dashboard Notices
          </span>
          <h2 className="font-hand text-2xl font-bold text-ink">Announcements</h2>
          <p className="text-xs text-muted">
            Active items appear in the rolling notice carousel on every student&apos;s dashboard, ahead of the built-in notices.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate} disabled={loading} className="shrink-0">
          <Plus size={16} />
          <span>New announcement</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 size={18} className="animate-spin text-marker" />
          <span>Loading announcements…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No announcements yet. Students only see the built-in notices.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const style = ANNOUNCEMENT_STYLES[a.type];
            const Icon = announcementIconFor(a.type, a.icon);
            const status = statusOf(a);
            const busy = busyId === a.id;
            return (
              <li key={a.id} className={`rounded-2xl border-2 ${style.border} p-4 ${a.enabled ? "" : "opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <Icon size={18} className={`mt-0.5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-bold text-ink">{a.title}</strong>
                      <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {style.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-sm text-ink/90">{a.message}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
                      <span>Updated {formatDate(a.updatedAt)}{a.updatedBy ? ` by ${a.updatedBy}` : ""}</span>
                      {a.expiresAt && (
                        <span className="flex items-center gap-1">
                          <CalendarClock size={12} />
                          Expires {formatDate(a.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                  <Button variant="secondary" size="sm" onClick={() => handleToggle(a)} disabled={busy}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : a.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{a.enabled ? "Disable" : "Enable"}</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(a)} disabled={busy}>
                    <Pencil size={14} />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(a)}
                    disabled={busy}
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create / edit form */}
      <Modal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={editingId ? "Edit announcement" : "New announcement"}>
        <form onSubmit={handleSave} className="space-y-4 p-6 text-left">
          <div>
            <label htmlFor="announcement-title" className={labelClass}>Title</label>
            <input
              id="announcement-title"
              type="text"
              required
              maxLength={TITLE_MAX}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Mid-sem exams"
              className={inputClass}
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="announcement-message" className={labelClass}>Message</label>
            <textarea
              id="announcement-message"
              rows={3}
              required
              maxLength={MESSAGE_MAX}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Mid-semester exams start on 3 November. Check the ERP for your schedule."
              className={`${inputClass} resize-none`}
              disabled={saving}
            />
            <div className="mt-1 text-right text-[11px] text-faint">
              {form.message.length}/{MESSAGE_MAX}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="announcement-type" className={labelClass}>Type</label>
              <select
                id="announcement-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))}
                className={inputClass}
                disabled={saving}
              >
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ANNOUNCEMENT_STYLES[t].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="announcement-expiry" className={labelClass}>Expires (optional)</label>
              <input
                id="announcement-expiry"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className={inputClass}
                disabled={saving}
              />
            </div>
          </div>

          <SymbolPicker
            type={form.type}
            value={form.icon}
            onChange={(icon) => setForm((f) => ({ ...f, icon }))}
            disabled={saving}
          />

          {/* How it will look in the students' notice carousel */}
          <div>
            <span className={labelClass}>Preview</span>
            <NoticePreview type={form.type} icon={form.icon} title={form.title} message={form.message} />
          </div>

          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="h-4 w-4 accent-[rgb(var(--pen))]"
              disabled={saving}
            />
            Show on student dashboards
          </label>

          {formError && (
            <div role="alert" className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
            <Button type="button" variant="secondary" size="md" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingId ? "Save changes" : "Publish"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete announcement?">
        <div className="space-y-4 p-6 text-left">
          <p className="text-sm leading-relaxed text-ink">
            &ldquo;{deleteTarget?.title}&rdquo; will be removed from every student&apos;s dashboard. This can&apos;t be undone — use
            Disable instead if you may need it again.
          </p>
          <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
            <Button type="button" variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="md" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
