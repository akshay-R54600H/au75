import Link from "next/link";
import { ArrowRight, RefreshCw, CalendarCheck, WifiOff, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Confetti from "@/components/landing/Confetti";
import InstallButton from "@/components/pwa/InstallButton";
import AppFooter from "@/components/layout/AppFooter";
import { HeroFloatingDoodles } from "@/components/landing/Doodles";

const FEEDBACK_URL = "https://tally.so/r/aQ1WNX";
const WHATSAPP_URL = "https://chat.whatsapp.com/KyCzZjxdfcPFBaVzNrGGKH";

function WhatsAppIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="AU75 home"><Logo /></Link>
          <nav className="flex items-center gap-2 sm:gap-5 text-sm font-semibold">
            <a href="#how" className="hidden px-2 text-muted hover:text-ink sm:block">How it works</a>
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="hidden px-2 text-muted hover:text-ink sm:block">Feedback</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hidden px-2 text-muted hover:text-success sm:inline-flex items-center gap-1.5">
              <WhatsAppIcon size={15} className="text-[#25D366]" /> WhatsApp
            </a>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-xl border-2 border-marker bg-marker px-4 py-2 text-white transition-colors hover:bg-marker-deep">
              Open app <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <Confetti />
          <HeroFloatingDoodles />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-24">
            <div className="relative w-full max-w-3xl">
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
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#25D366]/40 bg-[#25D366]/10 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#128C7E] dark:text-[#25D366] transition-all hover:-translate-y-0.5 hover:border-[#25D366] hover:bg-[#25D366]/20"
              >
                <WhatsAppIcon size={16} className="text-[#25D366] shrink-0" />
                <span>Join WhatsApp group</span>
              </a>
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
