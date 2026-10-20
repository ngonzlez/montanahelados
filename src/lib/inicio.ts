// Todo lo que necesita la página de inicio, en una sola lectura.
import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, isNull, or, lte, gte } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { hoyISO } from "./fechas";
import { leerAjustes, leerCatalogo, leerEscalones } from "./datos";

async function leerInicio() {
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

/** Cacheado en el servidor: la página no consulta la base en cada visita.
 * Se renueva solo cada 5 minutos (promos que empiezan o vencen) y al instante cuando la dueña guarda algo en el panel. */
export const ETIQUETA_INICIO = "inicio";
export const datosInicio = unstable_cache(leerInicio, ["datos-inicio"], { revalidate: 300, tags: [ETIQUETA_INICIO] });

export type DatosInicio = Awaited<ReturnType<typeof leerInicio>>;
