export function createContentSecurityPolicy({ development = process.env.NODE_ENV !== "production" } = {}) {
  const developmentScriptPolicy = development ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${developmentScriptPolicy} https://challenges.cloudflare.com https://eu.i.posthog.com https://eu-assets.i.posthog.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com https://*.sndcdn.com https://*.scdn.co https://*.spotifycdn.com",
    "font-src 'self' data:",
    "media-src 'self' data: blob: https://*.sndcdn.com https://w.soundcloud.com",
    "connect-src 'self' https://challenges.cloudflare.com https://eu.i.posthog.com https://eu.posthog.com wss://eu.i.posthog.com",
    "frame-src https://challenges.cloudflare.com https://open.spotify.com https://w.soundcloud.com https://www.youtube.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const contentSecurityPolicy = createContentSecurityPolicy();

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
