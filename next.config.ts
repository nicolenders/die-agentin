import type { NextConfig } from "next";

/**
 * Content Security Policy (SPEC §13). Erlaubte externe Quellen: youtube-nocookie
 * (nur nach Consent geladen) und die Blob-Storage-Domain für Bilder; alles
 * andere 'self'. Hinweis: die ideal nonce-basierte script-src ohne
 * 'unsafe-inline' erzwingt dynamisches Rendering aller Seiten und ist als
 * Folgeschritt dokumentiert (docs/decisions/0007-operations.md). Bis dahin gilt
 * die untenstehende strikte Quell-Policy.
 */
function contentSecurityPolicy(): string {
  const blob = process.env.BLOB_ACCOUNT_NAME
    ? `https://${process.env.BLOB_ACCOUNT_NAME}.blob.core.windows.net`
    : "";
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${blob}`.trim(),
    "font-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  // geoip-lite liest seine Datendateien beim Laden über __dirname. Es darf nicht
  // gebündelt werden, sonst zeigt der Pfad ins Leere. Als externes Server-Paket
  // wird es zur Laufzeit regulär aus node_modules geladen.
  serverExternalPackages: ["geoip-lite"],
  // Die Reichweiten-Erfassung (/api/track) liest die GeoIP-Datendateien von
  // geoip-lite zur Laufzeit über einen berechneten Pfad; Next erkennt diese
  // Abhängigkeit beim Tracing nicht automatisch. Ohne diesen Eintrag fehlen die
  // .dat-Dateien im Standalone-Build und die Länder-Zuordnung fällt auf „XX".
  outputFileTracingIncludes: {
    "/api/track": ["./node_modules/geoip-lite/data/**/*"],
  },
  experimental: {
    // Ermöglicht forbidden()/unauthorized() für die Rollenprüfung im Admin.
    authInterrupts: true,
  },
  images: {
    // Blob storage domain is configured via env; kept empty locally.
    remotePatterns: process.env.BLOB_ACCOUNT_NAME
      ? [
          {
            protocol: "https",
            hostname: `${process.env.BLOB_ACCOUNT_NAME}.blob.core.windows.net`,
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Admin is never indexed (SPEC §5, §13).
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
