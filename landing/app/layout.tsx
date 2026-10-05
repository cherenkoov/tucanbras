import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TELEGRAM_MINI_APP_REDIRECT } from "@/lib/telegramMiniApp";

export const metadata: Metadata = {
  title: "TucanBRAS — Online Brazilian Portuguese School",
  description: "Learn Portuguese with native speakers and prepare for CELPE-BRAS",
};

/* Browser chrome (Android status bar + toolbar) picks up theme-color. Without it
   the browser guesses its own tint — hence the stray orange bottom bar on mobile.
   Value is --color-sky, the page surface under the whole collage. */
export const viewport: Viewport = {
  themeColor: "#5dade2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Первым: открытый из Telegram лендинг сразу уходит в мини-апп (/app) —
            кнопки бота в BotFather указывают на корень сайта. См. lib/telegramMiniApp.ts. */}
        <script dangerouslySetInnerHTML={{ __html: TELEGRAM_MINI_APP_REDIRECT }} />
        <link
          rel="preload"
          href="/SVG/background/background-collage.svg"
          as="fetch"
          crossOrigin="anonymous"
        />
        {/* The beach and its six wave shapes: without these the fetches wait for hydration,
            and on a slow phone the beach STARTED downloading at 4.7 s, 1.7 s after the
            collage had finished (prod 2026-10-05). The scene reveals only once both are in.
            Low priority — they are below the fold and must not compete with the LCP image;
            the blurred poster (BgPoster) covers the first screen meanwhile. Keep in sync
            with BEACH_BASE_SVG and OCEAN_WAVE_IDS. */}
        {[
          "/SVG/background/main2-no-spinners.svg",
          ...[1, 2, 3, 4, 5, 6].map(n => `/SVG/background/Ocean%20Waves/type%201%20wave%200${n}.svg`),
        ].map(href => (
          <link key={href} rel="preload" href={href} as="fetch" crossOrigin="anonymous" fetchPriority="low" />
        ))}
        {/* The statue (124 KB gzipped — heavier than the beach) and its pedestal are plain
            <img>s, so without this they are requested only once the collage is parsed and
            the peak measured: ~0.9 s after the rest of the scene, and the reveal waits for
            them. Low priority for the same LCP reason as above. */}
        {["/SVG/background/Jesus%20statue/statue.svg", "/SVG/background/Jesus%20statue/pedestal.svg"].map(href => (
          <link key={href} rel="preload" href={href} as="image" fetchPriority="low" />
        ))}
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
