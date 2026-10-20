import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/sesion";
import { leerEstado } from "@/lib/panel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await exigirSesion(req);
  if (!u) return NextResponse.json({ ok: false, error: "Tenés que entrar de nuevo." }, { status: 401 });
  return NextResponse.json({ ok: true, usuario: { nombre: u.name, email: u.email }, ...(await leerEstado()) }, { headers: { "cache-control": "no-store" } });
}
