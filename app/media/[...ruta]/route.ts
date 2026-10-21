import { leerPublico } from "@/lib/archivos";

export async function GET(_req: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  const ruta = (await params).ruta;
  const datos = await leerPublico(ruta);
  if (!datos) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(datos), {
    headers: { "content-type": ruta[ruta.length - 1].endsWith(".jpg") ? "image/jpeg" : "image/webp", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
