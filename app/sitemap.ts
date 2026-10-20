import type { MetadataRoute } from "next";

const BASE = process.env.BETTER_AUTH_URL ?? "https://montanahelados.nogashopp.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/terminos", "/privacidad"].map((r) => ({ url: BASE + r, changeFrequency: r === "/" ? "weekly" : "yearly", priority: r === "/" ? 1 : 0.3 }));
}
