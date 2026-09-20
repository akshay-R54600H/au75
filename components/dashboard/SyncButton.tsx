"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/context/AppContext";
import { mergeSyncData } from "@/lib/storage/db";
import { createSession, submitLogin, completeOtp, type SyncPayload } from "@/lib/portal/syncClient";
import { loadQuickLogin, saveQuickLogin, forgetSavedLogin } from "@/lib/platform/credentials";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

type Step = "closed" | "loading" | "credentials" | "otp" | "success" | "error";

const INPUT =
  "w-full min-h-11 rounded-xl border-2 border-paper-edge bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-pen focus:outline-none transition";

export default function SyncButton({ compact = false }: { compact?: boolean }) {
  const { state, importAppData } = useApp();
  const [step, setStep] = useState<Step>("closed");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  const [remember, setRemember] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSaved(loadQuickLogin()?.studentId ?? null), [step]);
  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  const close = useCallback(() => {
    setStep("closed");
    setMessage("");
    setBusy(false);
    setPassword("");
    setCaptcha("");
    setOtp("");
    setToken(null);
  }, []);

  async function fetchCaptcha(): Promise<boolean> {
    setBusy(true);
    setMessage("");
    try {
      const r = await createSession();
      if (!r.ok || !r.token || !r.captcha) {
        setStep("error");
        setMessage(r.error || "Could not start a portal session. The AU portal may be down — try again in a bit.");
        return false;
      }
      setToken(r.token);
      setCaptchaImage(r.captcha);
      setCaptcha("");
      return true;
    } catch {
      setStep("error");
      setMessage("Could not reach the sync server. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setStep("loading");
    const q = loadQuickLogin();
    setUseSaved(Boolean(q));
    setStudentId(q?.studentId ?? "");
    setRemember(Boolean(q));
    if (await fetchCaptcha()) setStep("credentials");
  }

  async function submitCreds(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !captcha.trim()) return;
    const q = useSaved ? loadQuickLogin() : null;
    const id = q?.studentId ?? studentId.trim();
    const pw = q?.password ?? password;
    if (!id || !pw) return;

    setBusy(true);
    setMessage("");
    try {
      const r = await submitLogin(token, id, pw, captcha.trim());
      if (!r.step) {
        setMessage(
          r.error ||
            (r.reason === "captcha-failed"
              ? "The CAPTCHA didn't match. Tap Refresh for a new image and try again."
              : "Wrong student ID or password. Please check and try again.")
        );
        if (useSaved) {
          setUseSaved(false);
          setMessage("Your saved login was rejected — the password may have changed. Enter it again.");
        }
        await fetchCaptcha(); // captcha is single-use
        return;
      }
      if (r.step === "otp") {
        setToken(r.token ?? token);
        setStep("otp");
        return;
      }
      if (r.step === "done" && r.data) await apply(r.data, id, pw);
    } catch {
      setStep("error");
      setMessage("Could not reach the sync server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!token || otp.length < 4) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await completeOtp(token, otp);
      if (!r.ok || !r.data) {
        setOtp("");
        setMessage(r.error || "Could not verify the OTP. Try again.");
        return;
      }
      const q = useSaved ? loadQuickLogin() : null;
      await apply(r.data, q?.studentId ?? studentId.trim(), q?.password ?? password);
    } catch {
      setMessage("Could not reach the sync server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function apply(data: SyncPayload, id: string, pw: string) {
    if (remember) saveQuickLogin(id, pw);
    else forgetSavedLogin();

    const subjects = data.subjects.length ? data.subjects : state.subjects;
    const sessions = data.sessions.length ? data.sessions : state.sessions;
    await mergeSyncData(subjects, sessions, state.academicDays, state.predictions);
    await importAppData({
      subjects,
      sessions,
      academicDays: state.academicDays,
      predictions: state.predictions,
      settings: { ...state.settings, lastSyncedAt: new Date().toISOString() },
    });
    setStep("success");
    setMessage(
      data.subjects.length
        ? `Synced ${data.subjects.length} subjects and ${data.sessions.length} classes.`
        : "Logged in, but no attendance rows were found on the portal."
    );
    setTimeout(close, 2500);
  }

  const canContinue = Boolean(captcha.trim()) && (useSaved || (studentId.trim() && password));

  return (
    <>
      <Button onClick={start} size={compact ? "sm" : "md"} aria-label="Sync with portal">
        <RefreshCw size={16} className={step === "loading" ? "animate-spin" : ""} />
        {compact ? "Sync" : "Sync now"}
      </Button>

      <Modal open={step !== "closed"} onClose={close} title={step === "otp" ? "Enter the OTP" : "Sync with AU portal"}>
        <div className="p-5">
          {step === "loading" && <Spinner text="Starting a portal session…" />}

          {step === "credentials" && (
            <form onSubmit={submitCreds} className="flex flex-col gap-4">
              {useSaved && saved ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-accent-soft/60 px-3.5 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-ink">{saved}</span>
                    <span className="text-xs text-muted">Saved login on this device</span>
                  </span>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setUseSaved(false)}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink">Student ID / email</span>
                    <input
                      className={INPUT}
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      autoComplete="username"
                      spellCheck={false}
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink">Portal password</span>
                    <input
                      className={INPUT}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"
                    />
                    <span>
                      <span className="font-semibold text-ink">Remember me on this device</span>
                      <span className="block text-xs text-muted">Next time, just type the CAPTCHA.</span>
                    </span>
                  </label>
                </>
              )}

              <div>
                <span className="mb-1 block text-sm font-semibold text-ink">Type the CAPTCHA</span>
                <div className="flex items-center gap-3">
                  {captchaImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={captchaImage} alt="CAPTCHA" width={140} height={48} className="rounded-lg border border-line bg-white object-contain" />
                  )}
                  <button type="button" onClick={fetchCaptcha} className="text-xs font-semibold text-accent-deep hover:underline" disabled={busy}>
                    Refresh
                  </button>
                </div>
                <input
                  className={`${INPUT} mt-2 tracking-widest`}
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  autoCorrect="off"
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Case-sensitive"
                />
              </div>

              {message && <ErrorLine text={message} />}

              <Button type="submit" disabled={!canContinue || busy} fullWidth>
                {busy ? "Signing in…" : "Continue"}
              </Button>
              <p className="text-center text-xs text-faint">
                Your details go straight to the AU portal and are never stored on our server.
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={submitOtp} className="flex flex-col gap-4">
              <div className="flex items-start gap-3 text-sm text-muted">
                <Mail size={20} className="mt-0.5 shrink-0 text-accent" />
                The portal emailed you a one-time password. Enter it below to finish.
              </div>
              <input
                ref={otpRef}
                className={`${INPUT} text-center font-hand text-3xl tracking-[0.4em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                aria-label="One-time password"
              />
              {message && <ErrorLine text={message} />}
              <Button type="submit" disabled={otp.length < 4 || busy} fullWidth>
                {busy ? "Fetching your data…" : "Verify & sync"}
              </Button>
              <p className="text-center text-xs text-faint">It can take a minute to arrive. Check spam too.</p>
            </form>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-success" />
              <div className="font-hand text-2xl font-bold text-ink">Synced!</div>
              <p className="text-sm text-muted">{message}</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={start} fullWidth>Try again</Button>
                <Button variant="secondary" onClick={close}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-4 text-sm text-muted">
      <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {text}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-semibold text-danger">
      {text}
    </div>
  );
}
