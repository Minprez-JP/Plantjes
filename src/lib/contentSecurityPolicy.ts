/**
 * CSP injected into `index.html` by Vite so the static app needs no host
 * configuration. `frame-ancestors` is intentionally omitted: it is ignored in a
 * meta tag and must be sent as a response header by the host.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')
