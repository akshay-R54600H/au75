import Link from "next/link";
import { ArrowRight, RefreshCw, CalendarCheck, WifiOff, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Confetti from "@/components/landing/Confetti";
import InstallButton from "@/components/pwa/InstallButton";
import AppFooter from "@/components/layout/AppFooter";
import { HeroLeftDoodle, HeroRightDoodle } from "@/components/landing/Doodles";

const FEEDBACK_URL = "https://tally.so/r/aQ1WNX";

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="AU75 home"><Logo /></Link>
          <nav className="flex items-center gap-2 sm:gap-5 text-sm font-semibold">
            <a href="#how" className="hidden px-2 text-muted hover:text-ink sm:block">How it works</a>
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="hidden px-2 text-muted hover:text-ink sm:block">Feedback</a>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-xl border-2 border-marker bg-marker px-4 py-2 text-white transition-colors hover:bg-marker-deep">
              Open app <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <Confetti />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-24">
            <div className="relative w-full max-w-3xl">
              <div className="pointer-events-none absolute -left-10 top-1/2 hidden w-36 -translate-y-1/2 -rotate-6 md:block lg:-left-28">
                <HeroLeftDoodle />
              </div>
              <div className="pointer-events-none absolute -right-10 top-1/2 hidden w-32 -translate-y-1/2 rotate-6 md:block lg:-right-24">
                <HeroRightDoodle />
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                Know exactly how many classes you can{" "}
                <span className="hl font-hand text-5xl font-bold text-accent-deep sm:text-7xl">skip</span>
              </h1>
            </div>
            <p className="mt-6 max-w-xl text-lg text-muted">
              AU75 syncs your attendance and timetable from the Alliance University portal, then tells you the one thing
              that matters: <strong className="text-ink">can I miss this class?</strong>
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border-2 border-marker bg-marker px-7 py-3.5 text-base font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-marker-deep">
                Open the web app <ArrowRight size={18} />
              </Link>
              <InstallButton size="lg" />
            </div>
            <p className="mt-4 text-xs text-faint">Free · No account · Your data stays on your device</p>

            <PreviewCard />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <Feature tone="bg-success-soft" icon={<RefreshCw size={22} />} title="Syncs from the AU portal" body="Log in once with CAPTCHA + OTP. Subjects, attendance and your dated timetable land in the app." />
            <Feature tone="bg-accent-soft" icon={<CalendarCheck size={22} />} title="Plan your skips" body="Tap any upcoming class to mark it as a skip. Watch every subject's percentage update live." />
            <Feature tone="bg-warn-soft" icon={<WifiOff size={22} />} title="Installs like an app" body="Add it to your home screen. Works offline with your last sync — no APK, no Play Store." />
          </div>
        </section>

        <section id="how" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="font-hand text-4xl font-bold">How it works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                ["Sync", "Press Sync, type the CAPTCHA, enter the emailed OTP. Takes 30 seconds."],
                ["Plan", "See how many classes you can safely skip per subject. Mark the ones you'll miss."],
                ["Relax", "Add your exam dates to see exactly where you'll stand before each one."],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-4">
                  <span className="sketch flex h-11 w-11 shrink-0 items-center justify-center bg-paper font-hand text-2xl font-bold">{i + 1}</span>
                  <div>
                    <div className="font-bold">{t}</div>
                    <p className="text-sm text-muted">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 flex items-start gap-2 text-sm text-muted">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
              Your portal password goes straight to the university server during sync and is never stored on ours.
              Everything you see is kept in your browser.
            </p>
          </div>
        </section>
      </main>

      <AppFooter bordered />
    </div>
  );
}

function Feature({ tone, icon, title, body }: { tone: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={`sketch p-6 ${tone}`}>
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink">{icon}</div>
      <h3 className="font-hand text-2xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

/** Static mock of a subject card so visitors see the payoff before opening the app. */
function PreviewCard() {
  const rows = [
    ["Discrete Mathematics", 87, "Can skip 3", "text-success", "bg-success"],
    ["Data Structures", 75, "On the edge", "text-warn", "bg-warn"],
    ["Operating Systems", 70, "Attend 4 more", "text-danger", "bg-danger"],
  ] as const;
  return (
    <div className="card mt-14 w-full max-w-md rotate-[-1.5deg] p-5 text-left">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-hand text-2xl font-bold">Subjects</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-deep">target 75%</span>
      </div>
      <ul className="space-y-3">
        {rows.map(([name, pct, verdict, tone, bar]) => (
          <li key={name}>
            <div className="flex items-baseline justify-between">
              <span className="font-bold">{name}</span>
              <span className={`font-hand text-2xl font-bold ${tone}`}>{pct}%</span>
            </div>
            <div className="my-1.5 h-2 rounded-full bg-line">
              <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`text-sm font-bold ${tone}`}>{verdict}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
