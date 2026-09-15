import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["600", "700", "800"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["500"] });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], variable: "--font-nastaliq", weight: ["400", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Ello — your English tutor",
  description: "Practice English with an AI tutor: conversation, corrections, flashcards and progress.",
  appleWebApp: { capable: true, title: "Ello", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#14131C" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable} ${jetbrains.variable} ${nastaliq.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
