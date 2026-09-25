import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./partner-redesign.css";
import "./auth-redesign.css";
import { LegacyChrome } from "@/components/partner/LegacyChrome";

const inter = localFont({ src: [
  { path: "../public/fonts/Inter-Regular.ttf", weight: "400" },
  { path: "../public/fonts/Inter-Medium.ttf", weight: "500" },
  { path: "../public/fonts/Inter-SemiBold.ttf", weight: "600" },
  { path: "../public/fonts/Inter-Bold.ttf", weight: "700" },
  { path: "../public/fonts/Inter-ExtraBold.ttf", weight: "800" },
], variable: "--font-foreas-inter", display: "swap" });
const genos = localFont({ src: "../public/fonts/Genos-Variable.ttf", weight: "100 900", variable: "--font-foreas-genos", display: "swap" });

export const metadata: Metadata = {
  title: "FOREAS — Espace partenaire",
  description:
    "Vos supports, votre lien et vos commissions FOREAS Driver.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.variable} ${genos.variable} antialiased`}
      >
        {children}
        <LegacyChrome />
      </body>
    </html>
  );
}
