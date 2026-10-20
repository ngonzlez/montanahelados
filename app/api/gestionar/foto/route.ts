import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/sesion";
import { guardarFoto, MAX_BYTES } from "@/lib/archivos";

export async function POST(req: Request) {
  const u = await exigirSesion(req);
  if (!u) return NextResponse.json({ ok: false, error: "Tenés que entrar de nuevo." }, { status: 401 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return NextResponse.json({ ok: false, error: "La foto pesa más de 8 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("foto");
  if (!(f instanceof File)) return NextResponse.json({ ok: false, error: "No llegó la foto." }, { status: 400 });
  const r = await guardarFoto(Buffer.from(await f.arrayBuffer()));
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
}
