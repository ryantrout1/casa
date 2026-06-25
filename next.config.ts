import type { NextConfig } from "next";

// Legacy slugs that pre-date the GoHighLevel → Next.js loyalty migration.
// None of these are live routes; the scan-to-check-in page now lives at /hola.
// Catches stale references (printed QR short-link destinations, old links) so
// they resolve to the check-in page instead of 404ing. Temporary (307) on
// purpose — these paths may be repurposed later, so they are not hard-cached.
const LEGACY_CHECKIN_SLUGS = [
  "/casa-rewards",
  "/casarewards",
  "/checkin",
  "/check-in",
  "/thank-you",
];

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_CHECKIN_SLUGS.map((source) => ({
      source,
      destination: "/hola",
      permanent: false,
    }));
  },
};

export default nextConfig;
