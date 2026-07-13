import type { NextConfig } from "next";
import { IMAGE_HOSTS } from "./lib/imageHosts";

const isDev = process.env.NODE_ENV === 'development';

// Content-Security-Policy. The pages are statically generated, so script nonces are
// not an option — 'unsafe-inline' stays for Next's inline bootstrap scripts and
// React inline style attributes. The policy still pins every EXTERNAL origin:
// injected scripts/styles/fetches to third-party hosts are blocked outright.
//  - img-src mirrors images.remotePatterns (unoptimized remote avatars load directly)
//    + blob: (BackgroundCanvas rasterises the beach SVG via createObjectURL) + data:.
//  - connect-src 'self': the only client fetches are same-origin (/api, /SVG).
//  - 'unsafe-eval' is dev-only (webpack HMR needs it); never shipped to prod.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${IMAGE_HOSTS.map(h => `https://${h}`).join(' ')}`,
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['26.93.*.*', '192.168.*.*', '10.*.*.*', '172.*.*.*'],
  images: {
    remotePatterns: IMAGE_HOSTS.map(hostname => ({ protocol: 'https' as const, hostname })),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // 1 year, domain only. Add `; includeSubDomains` once EVERY subdomain
          // (api.tucanbras.com, future ones) is confirmed HTTPS-only — it cannot be
          // rolled back for visitors who already cached the directive.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
