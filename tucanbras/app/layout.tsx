import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TucanBRAS — Online Brazilian Portuguese School",
  description: "Learn Portuguese with native speakers and prepare for CELPE-BRAS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: '#ffffff' }}>{children}</body>
    </html>
  );
}
