import type { NextConfig } from "next";

// Next.js inyecta scripts en línea para hidratar; sin nonce, script-src necesita 'unsafe-inline'.
// En desarrollo (npm run dev) Next además usa eval y una conexión ws para recargar: solo ahí se permiten.
const DEV = process.env.NODE_ENV === "development";
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "font-src 'self'",
  `connect-src 'self'${DEV ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/gestionar/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/panel/:archivo*", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      // fotos, bordes, logo y cursores: el navegador los guarda una semana y los renueva en segundo plano
      { source: "/:carpeta(fotos|bordes|marca)/:archivo*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/:archivo(cursor.svg|cursor-mordido.svg|favicon.svg|apple-touch-icon.png|compartir.jpg)", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default config;
