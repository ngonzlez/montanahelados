// Sesión del panel: se verifica en el servidor en cada página y cada acción.
import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

export async function sesionActual() {
  return auth.api.getSession({ headers: await headers() });
}

/** Para las rutas /api/gestionar: exige sesión y que el pedido venga de la propia web (CSRF). */
export async function exigirSesion(req: Request) {
  if (req.method !== "GET") {
    const origen = req.headers.get("origin");
    const propio = new URL(req.url).host;
    const permitidos = [process.env.SITE_URL, process.env.BETTER_AUTH_URL].filter(Boolean).map((u) => new URL(u!).host);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? propio;
    if (!origen || ![...permitidos, host].includes(new URL(origen).host)) return null;
  }
  const s = await auth.api.getSession({ headers: req.headers });
  return s?.user ?? null;
}
