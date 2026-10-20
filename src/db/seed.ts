// Semilla desde src/db/seed-data.json (copia de docs/web/contenido-inicial.json).
// Idempotente: solo carga cada tabla si está vacía, para no pisar lo que la dueña cambió en el panel.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "./schema";
import datos from "./seed-data.json";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });

const FOTO_XL: Record<string, string> = { "banana-split": "xl-banana", mburukuja: "xl-mburukuja", oreo: "xl-oreo" };
const vacia = async (t: Parameters<typeof db.$count>[0]) => (await db.$count(t)) === 0;

if (await vacia(s.sabor))
  await db.insert(s.sabor).values(
    datos.sabores.map((x) => ({ slug: x.slug, nombre: x.nombre, color: x.color, orden: x.orden, foto: `/fotos/g-${x.slug}.webp` })),
  );
if (await vacia(s.heladoXl))
  await db.insert(s.heladoXl).values(
    datos.helados_xl.map((x, i) => ({ slug: x.slug, nombre: x.nombre, descripcion: x.descripcion, orden: i + 1, foto: `/fotos/${FOTO_XL[x.slug] ?? x.slug}.webp` })),
  );
if (await vacia(s.escalonPrecio))
  await db.insert(s.escalonPrecio).values(datos.escalones_precio.map((e) => ({ producto: e.producto as "gourmet" | "xl", desde: e.desde, precio: e.precio })));
if (await vacia(s.promo))
  await db.insert(s.promo).values(
    datos.promos.map((p, i) => ({ titulo: p.titulo, detalle: p.detalle, textoWhatsapp: p.texto_whatsapp, desde: p.desde, hasta: p.hasta, visible: p.visible, orden: i + 1, foto: "/fotos/nueve-sabores.webp" })),
  );
if (await vacia(s.preguntaFrecuente))
  await db.insert(s.preguntaFrecuente).values(datos.preguntas_frecuentes.map((p, i) => ({ ...p, orden: i + 1 })));
if (await vacia(s.condicion))
  await db.insert(s.condicion).values(datos.condiciones.map((texto, i) => ({ texto, orden: i + 1 })));
if (await vacia(s.puntoVenta))
  await db.insert(s.puntoVenta).values(datos.puntos_de_venta.map((p, i) => ({ nombre: p.nombre, linkMapa: p.mapa, visible: p.visible, orden: i + 1 })));

const a = datos.ajustes;
const ajustesIniciales: Record<string, unknown> = {
  whatsapp: a.whatsapp,
  instagram: a.instagram,
  tiktok: a.tiktok,
  ubicacion: a.ubicacion,
  horarios: a.horarios,
  pedidos: a.pedidos,
  entrega: a.entrega,
  factura_electronica: a.factura_electronica,
  email_avisos: "",
  textos: datos.textos,
  conservacion: datos.conservacion,
};
await db.insert(s.ajustes).values(Object.entries(ajustesIniciales).map(([clave, valor]) => ({ clave, valor }))).onConflictDoNothing();

await pool.end();
console.log("Semilla cargada");
