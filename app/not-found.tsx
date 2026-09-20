import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { FooterCredit } from "@/components/layout/AppFooter";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center text-ink">
      <Logo size="lg" />
      <h1 className="font-hand text-5xl font-bold">Lost?</h1>
      <p className="text-muted">That page doesn&apos;t exist.</p>
      <Link href="/dashboard" className="rounded-xl border-2 border-marker bg-marker px-6 py-2.5 font-bold text-white">Go to dashboard</Link>
      <div className="mt-8">
        <FooterCredit />
      </div>
    </main>
  );
}
