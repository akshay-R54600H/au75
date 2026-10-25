
import Link from "next/link";
import { Heart } from "lucide-react";

const FEEDBACK_URL = "https://tally.so/r/aQ1WNX";

function Credit() {
  // The Lighthouse theme swaps in its own credit; CSS picks the line so it
  // works in server-rendered pages without a flash.
  return (
    <>
      <p className="flex flex-wrap items-center justify-center gap-x-1 text-[11px] text-faint [[data-theme=lighthouse]_&]:hidden">
        AI slop, lovingly made with zero
        <Heart size={11} strokeWidth={2} className="fill-marker text-marker" aria-hidden />
        by Akshay &amp; Pradeep.
      </p>
      <p className="hidden flex-wrap items-center justify-center gap-x-1 text-[11px] text-faint [[data-theme=lighthouse]_&]:flex">
        Made with <span role="img" aria-label="love">❤️</span> by Pradeep
      </p>
    </>
  );
}

export default function AppFooter({ bordered = false }: { bordered?: boolean }) {
  return (
    <footer className={bordered ? "border-t border-line" : "mt-12"}>
      <div
        className={`flex flex-col items-center justify-center gap-2 text-center text-xs text-faint ${
          bordered ? "mx-auto max-w-5xl px-4 py-8 sm:px-6" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>
            {bordered
              ? "AU75 is an independent student project, not affiliated with Alliance University."
              : "AU75 · not affiliated with Alliance University"}
          </span>
          <span className="flex gap-4">
            <Link href="/policy" className="underline-offset-2 hover:text-ink hover:underline">
              {bordered ? "Terms & privacy" : "Terms"}
            </Link>
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
              Feedback
            </a>
            <a href="https://chat.whatsapp.com/KyCzZjxdfcPFBaVzNrGGKH" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
              WhatsApp group
            </a>
          </span>
        </div>
        <Credit />
      </div>
    </footer>
  );
}

export function FooterCredit() {
  return <Credit />;
}
