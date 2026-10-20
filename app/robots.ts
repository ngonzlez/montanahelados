import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/gestionar", "/api/"] }], sitemap: (process.env.BETTER_AUTH_URL ?? "https://montanahelados.nogashopp.com") + "/sitemap.xml" };
}
