// src/app/serve.js
var b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
var BIN = null;
var bin = () => BIN ||= { "/app/logo.webp": b64(APP.logo), "/app/mark.webp": b64(APP.mark), "/app/icon.png": b64(APP.icon), "/app/email-logo.png": b64(APP.emailLogo) };
var TYPES = {
  "/app/app.js": ["text/javascript; charset=utf-8", () => APP.js],
  "/app/orb.js": ["text/javascript; charset=utf-8", () => APP.orb],
  "/app/app.css": ["text/css; charset=utf-8", () => APP.css + "\n" + THEMES_CSS],
  "/app/manifest.webmanifest": ["application/manifest+json", () => APP.manifest],
  "/app/logo.webp": ["image/webp", () => bin()["/app/logo.webp"]],
  "/app/mark.webp": ["image/webp", () => bin()["/app/mark.webp"]],
  "/app/icon.png": ["image/png", () => bin()["/app/icon.png"]],
  "/app/email-logo.png": ["image/png", () => bin()["/app/email-logo.png"]]
};
var isAppAsset = (pathname) => Object.prototype.hasOwnProperty.call(TYPES, pathname);
function appAsset(request) {
  const url = new URL(request.url);
  const t = TYPES[url.pathname];
  if (!t || !["GET", "HEAD"].includes(request.method)) return new Response("Not found", { status: 404 });
  const etag = '"' + APP.v + '"';
  const cache2 = url.searchParams.get("v") === APP.v ? "public, max-age=31536000, immutable" : url.pathname === "/app/email-logo.png" ? "public, max-age=2592000" : "public, max-age=300, must-revalidate";
  const corp = url.pathname === "/app/email-logo.png" ? "cross-origin" : "same-origin";
  const headers = { "Content-Type": t[0], "Cache-Control": cache2, ETag: etag, "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": corp };
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : t[1](), { headers });
}
var CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://assets.cdn.filesafe.space",
  "connect-src 'self'",
  "media-src 'self' blob: mediastream:",
  "manifest-src 'self'",
  "frame-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join("; ");
function appShell(request) {
  const etag = '"shell-' + APP.v + '"';
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    // The shell holds no data; revalidate each visit so a new deploy shows straight away.
    "Cache-Control": "no-cache",
    ETag: etag,
    "Content-Security-Policy": CSP,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",
    "Permissions-Policy": "microphone=(self), camera=(), geolocation=()"
  };
  if (request && request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(APP.html, { headers });
}

