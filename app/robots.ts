import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/gestionar", "/api/"] }], sitemap: (process.env.SITE_URL ?? "https://montanahelados.nogashopp.com") + "/sitemap.xml" };
}
