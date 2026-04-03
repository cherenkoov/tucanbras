import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TucanBRAS — онлайн-школа бразильского португальского",
  description: "Учите португальский с носителями языка и готовьтесь к CELPE-BRAS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: '#eae3e3' }}>{children}</body>
    </html>
  );
}
