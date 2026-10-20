import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/sesion";
import { filtrosPedidos, listarPedidos } from "@/lib/panel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await exigirSesion(req);
  if (!u) return NextResponse.json({ ok: false, error: "Tenés que entrar de nuevo." }, { status: 401 });
  const f = filtrosPedidos.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!f.success) return NextResponse.json({ ok: false, error: "Filtros inválidos." }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await listarPedidos(f.data)) }, { headers: { "cache-control": "no-store" } });
}
