import type { Metadata, Viewport } from "next";
import { Nunito, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context/AppContext";
import TncConsent from "@/components/tnc/TncConsent";
import ServiceWorker from "@/components/pwa/ServiceWorker";
import { THEME_STORAGE_KEY } from "@/lib/themes";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const patrickHand = Patrick_Hand({ weight: "400", subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://au75.in"),
  title: { default: "AU75 — Attendance Predictor", template: "%s · AU75" },
  description:
    "Know exactly how many classes you can skip. AU75 syncs your Alliance University attendance and predicts the rest.",
  applicationName: "AU75",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AU75" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  openGraph: { title: "AU75 — Attendance Predictor", description: "Know exactly how many classes you can skip.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcf7" },
    { media: "(prefers-color-scheme: dark)", color: "#161621" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${patrickHand.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <TncConsent />
          {children}
        </AppProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
