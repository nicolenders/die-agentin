import type { NextConfig } from "next";

/**
 * Security headers per SPEC §13. The Content-Security-Policy with nonce is set
 * per-request in middleware.ts; the static headers below are the constant ones.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
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
