// Todo lo que necesita la página de inicio, en una sola lectura.
import "server-only";
import { and, asc, eq, isNull, or, lte, gte } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { hoyISO } from "./fechas";
import { leerAjustes, leerCatalogo, leerEscalones } from "./datos";

export async function datosInicio() {
  const hoy = hoyISO();
  const [catalogo, escalones, ajustes, promos, puntos] = await Promise.all([
    leerCatalogo(),
    leerEscalones(),
    leerAjustes(),
    db
      .select()
      .from(s.promo)
      .where(
        and(
          eq(s.promo.visible, true),
          isNull(s.promo.eliminadoEn),
          isNull(s.promo.terminadaEn),
          or(isNull(s.promo.desde), lte(s.promo.desde, hoy)),
          or(isNull(s.promo.hasta), gte(s.promo.hasta, hoy)),
        ),
      )
      .orderBy(asc(s.promo.orden)),
    db.select().from(s.puntoVenta).where(and(eq(s.puntoVenta.visible, true), isNull(s.puntoVenta.eliminadoEn))).orderBy(asc(s.puntoVenta.orden)),
  ]);
  return { ...catalogo, escalones, ajustes, promos, puntos };
}

export type DatosInicio = Awaited<ReturnType<typeof datosInicio>>;
