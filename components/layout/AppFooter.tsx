import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-8 text-center text-xs text-faint">
      <span>AU75 · not affiliated with Alliance University</span>
      <Link href="/policy" className="underline-offset-2 hover:underline">Terms</Link>
      <a href="https://tally.so/r/aQ1WNX" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        Feedback
      </a>
    </footer>
  );
}