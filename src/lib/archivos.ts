// Fotos que sube la dueña: volumen persistente de Coolify (ARCHIVOS_DIR=/data/archivos).
// Todo pasa por acá para poder cambiar a MinIO sin tocar el resto (ver docs/web/stack.json).
import "server-only";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

export const MAX_BYTES = 8 * 1024 * 1024;
const FORMATOS = new Set(["jpeg", "png", "webp", "heif"]);

const raiz = () => path.resolve(process.env.ARCHIVOS_DIR ?? "./.data/archivos");

/** Verifica el tipo real (no la extensión), achica a 1200 px y guarda en WebP con nombre propio. */
export async function guardarFoto(datos: Buffer): Promise<{ ok: true; ruta: string } | { ok: false; error: string }> {
  if (datos.length > MAX_BYTES) return { ok: false, error: "La foto pesa más de 8 MB." };
  let meta;
  try {
    meta = await sharp(datos).metadata();
  } catch {
    return { ok: false, error: "Ese archivo no es una foto." };
  }
  if (!meta.format || !FORMATOS.has(meta.format)) return { ok: false, error: "Subí una foto JPG, PNG o WebP." };
  const salida = await sharp(datos).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const nombre = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;
  const dir = path.join(raiz(), "fotos");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nombre), salida);
  return { ok: true, ruta: `/media/fotos/${nombre}` };
}

/** Lee un archivo público del volumen, sin permitir salir de la carpeta. */
export async function leerPublico(partes: string[]): Promise<Buffer | null> {
  if (partes[0] !== "fotos" || partes.length !== 2 || !/^[a-z0-9-]+\.webp$/.test(partes[1])) return null;
  const archivo = path.resolve(raiz(), "fotos", partes[1]);
  if (!archivo.startsWith(path.join(raiz(), "fotos") + path.sep)) return null;
  try {
    return await readFile(archivo);
  } catch {
    return null;
  }
}
