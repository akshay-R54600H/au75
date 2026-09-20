"use client";

import Logo from "@/components/ui/Logo";
import { FooterCredit } from "@/components/layout/AppFooter";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center text-ink">
      <Logo size="lg" />
      <h1 className="font-hand text-5xl font-bold">Something broke</h1>
      <p className="max-w-sm text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <button onClick={reset} className="rounded-xl border-2 border-marker bg-marker px-6 py-2.5 font-bold text-white">Try again</button>
      <div className="mt-8">
        <FooterCredit />
      </div>
    </main>
  );
}
