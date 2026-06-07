import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UGC Otomasyon — AI Video Uretici",
  description:
    "Magazalar icin gercekci UGC AI videolari uretin: OpenRouter + fal.ai (Flux 1.1 Pro + Seedance 2.0).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
