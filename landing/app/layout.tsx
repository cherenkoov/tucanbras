import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TucanBRAS — Online Brazilian Portuguese School",
  description: "Learn Portuguese with native speakers and prepare for CELPE-BRAS",
};

/* Browser chrome (Android status bar + toolbar) picks up theme-color. Without it
   the browser guesses its own tint — hence the stray orange bottom bar on mobile.
   Value is --color-sky, the page surface under the whole collage. */
export const viewport: Viewport = {
  themeColor: "#d3ecfb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="preload"
          href="/SVG/background/background-collage.svg"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
