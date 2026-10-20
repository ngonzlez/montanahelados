import type { Metadata, Viewport } from "next";
import { display, texto } from "@/fuentes";

const URL_BASE = process.env.SITE_URL ?? "https://montanahelados.nogashopp.com";

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: "Montana Helados · Heladitos gourmet en San Lorenzo",
  description: "Heladitos gourmet hechos con leche, en paquetes de 25 para reventa, y Helados XL. Armá tu pedido y mandalo por WhatsApp.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: { images: ["/compartir.jpg"], locale: "es_PY", type: "website" },
};

export const viewport: Viewport = { themeColor: "#FCF1DA", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PY" className={`${display.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
