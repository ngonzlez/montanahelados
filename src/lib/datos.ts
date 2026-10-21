// Lecturas de la base usadas por la web pública y la API.
import "server-only";
import { asc, isNull, and, ne, eq, or, lte, gte } from "drizzle-orm";
import { hoyISO } from "./fechas";
import { db, schema as s } from "@/db";
import type { Escalon } from "./precios";
import type { ItemCatalogo } from "./pedido";

export type Ajustes = {
  whatsapp?: { valor: string; mostrar: string; link: string };
  pedidos?: { sena_porcentaje: number; anticipacion_horas: number; paquete_unidades: number; paso_anticipado: number };
  email_avisos?: string;
  [clave: string]: unknown;
};

export async function leerAjustes(): Promise<Ajustes> {
  const filas = await db.select().from(s.ajustes);
  // los datos de pago son privados: nunca salen hacia la web pública
  return Object.fromEntries(filas.filter((f) => f.clave !== "datos_pago_privado").map((f) => [f.clave, f.valor]));
}

export async function leerEscalones(): Promise<Escalon[]> {
  return db.select({ producto: s.escalonPrecio.producto, desde: s.escalonPrecio.desde, precio: s.escalonPrecio.precio }).from(s.escalonPrecio);
}

/** Sabores y XL que no están en la papelera ni ocultos. */
export async function leerCatalogo() {
  const [sabores, xl] = await Promise.all([
    db.select().from(s.sabor).where(and(isNull(s.sabor.eliminadoEn), ne(s.sabor.estado, "oculto"))).orderBy(asc(s.sabor.orden)),
    db.select().from(s.heladoXl).where(and(isNull(s.heladoXl.eliminadoEn), ne(s.heladoXl.estado, "oculto"))).orderBy(asc(s.heladoXl.orden)),
  ]);
  return { sabores, xl };
}

export async function catalogoParaValidar(): Promise<ItemCatalogo[]> {
  const [sabores, xl] = await Promise.all([
    db.select({ slug: s.sabor.slug, nombre: s.sabor.nombre, estado: s.sabor.estado }).from(s.sabor).where(isNull(s.sabor.eliminadoEn)),
    db.select({ slug: s.heladoXl.slug, nombre: s.heladoXl.nombre, estado: s.heladoXl.estado }).from(s.heladoXl).where(isNull(s.heladoXl.eliminadoEn)),
  ]);
  return [...sabores.map((x) => ({ ...x, tipo: "gourmet" as const })), ...xl.map((x) => ({ ...x, tipo: "xl" as const }))];
}

/** Condición de "promo vigente": visible, no borrada, no terminada y dentro de sus fechas. */
export function promoVigenteDonde(hoy: string) {
  return and(
    eq(s.promo.visible, true),
    isNull(s.promo.eliminadoEn),
    isNull(s.promo.terminadaEn),
    or(isNull(s.promo.desde), lte(s.promo.desde, hoy)),
    or(isNull(s.promo.hasta), gte(s.promo.hasta, hoy)),
  );
}

/** Promo que se arma en la web (con mínimo) y está vigente hoy; null si no existe o ya terminó. */
export async function promoParaPedido(id: number) {
  const [p] = await db.select().from(s.promo).where(and(eq(s.promo.id, id), promoVigenteDonde(hoyISO())));
  if (!p || !p.minimo) return null;
  return { id: p.id, titulo: p.titulo, minimo: p.minimo, precioUnidad: p.precioUnidad, sabores: p.sabores?.length ? p.sabores : null };
}
