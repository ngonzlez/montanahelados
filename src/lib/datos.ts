// Lecturas de la base usadas por la web pública y la API.
import "server-only";
import { asc, isNull, and, ne } from "drizzle-orm";
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
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
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
