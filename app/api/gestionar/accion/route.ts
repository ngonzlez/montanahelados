import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/sesion";
import { revalidateTag } from "next/cache";
import { accion, ejecutar } from "@/lib/panel";
import { ETIQUETA_INICIO } from "@/lib/inicio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await exigirSesion(req);
  if (!u) return NextResponse.json({ ok: false, error: "Tenés que entrar de nuevo." }, { status: 401 });
  const cuerpo = await req.json().catch(() => null);
  const a = accion.safeParse(cuerpo);
  if (!a.success) return NextResponse.json({ ok: false, error: a.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  try {
    const r = await ejecutar(a.data, u);
    if (r.ok) revalidateTag(ETIQUETA_INICIO); // la web pública muestra el cambio al instante
    return NextResponse.json(r, { status: r.ok ? 200 : 422 });
  } catch (e) {
    console.error("accion del panel", a.data.accion, e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }
}
