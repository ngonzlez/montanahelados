// Datos y acciones del panel de la dueña (docs/web/admin.json). Todo se valida en el servidor.
import "server-only";
import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, or, sql, count, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { hoyISO, sumarDias } from "./fechas";
import { telefonoVisible } from "./formato";
import { enviarEmail, plantillaPrueba } from "./email";
import { esClaveFoto, fotosParaPanel, FOTOS_WEB } from "@/content/fotos";
import { esClaveTexto, maxTexto, textosParaPanel, GRUPOS_TEXTOS } from "@/content/textos";

type Usuario = { id: string; email: string; name: string };
const ESTADOS_PRODUCTO = ["disponible", "hoy_no_hay", "agotado", "oculto"] as const;
export const ESTADOS_PEDIDO = ["nuevo", "confirmado", "sena_recibida", "entregado", "cancelado"] as const;

// ---------- lectura ----------

export async function leerEstado() {
  const hoy = hoyISO();
  const [sabores, xl, precios, promos, puntos, ajustes, nuevos, manana, borrados] = await Promise.all([
    db.select().from(s.sabor).where(isNull(s.sabor.eliminadoEn)).orderBy(asc(s.sabor.orden), asc(s.sabor.id)),
    db.select().from(s.heladoXl).where(isNull(s.heladoXl.eliminadoEn)).orderBy(asc(s.heladoXl.orden), asc(s.heladoXl.id)),
    db.select().from(s.escalonPrecio).orderBy(asc(s.escalonPrecio.producto), asc(s.escalonPrecio.desde)),
    db.select().from(s.promo).where(isNull(s.promo.eliminadoEn)).orderBy(asc(s.promo.orden), desc(s.promo.id)),
    db.select().from(s.puntoVenta).where(isNull(s.puntoVenta.eliminadoEn)).orderBy(asc(s.puntoVenta.orden), asc(s.puntoVenta.id)),
    db.select().from(s.ajustes),
    db.select({ n: count() }).from(s.pedido).where(and(eq(s.pedido.estado, "nuevo"), isNull(s.pedido.eliminadoEn))),
    db.select({ n: count() }).from(s.pedido).where(and(eq(s.pedido.fechaEntrega, sumarDias(hoy, 1)), ne(s.pedido.estado, "cancelado"), isNull(s.pedido.eliminadoEn))),
    leerPapelera(),
  ]);
  const a = Object.fromEntries(ajustes.map((f) => [f.clave, f.valor])) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    hoy,
    sabores: sabores.map((x) => ({ ...x, eliminadoEn: undefined })),
    xl: xl.map((x) => ({ ...x, eliminadoEn: undefined })),
    precios,
    promos: promos.map((p) => ({ id: p.id, titulo: p.titulo, detalle: p.detalle, foto: p.foto, desde: p.desde ?? "", hasta: p.hasta ?? "", terminada: !!p.terminadaEn, visible: p.visible, minimo: p.minimo, precioUnidad: p.precioUnidad, sabores: p.sabores ?? [] })),
    puntos: puntos.map((p) => ({ id: p.id, nombre: p.nombre, barrio: p.barrio ?? "", mapa: p.linkMapa, visible: p.visible })),
    ajustes: {
      email: a.email_avisos ?? "",
      whatsapp: a.whatsapp?.mostrar ?? "",
      instagram: a.instagram?.link ?? "",
      tiktok: a.tiktok?.link ?? "",
      horario: a.horarios ?? "",
      mapa: a.ubicacion?.google_maps ?? "",
      sena: a.pedidos?.sena_porcentaje ?? 50,
      pago: a.datos_pago_privado ?? "",
    },
    fotos: fotosParaPanel(a.fotos_web),
    textos: textosParaPanel(a.textos_web, { paquete: a.pedidos?.paquete_unidades ?? 25, sena: a.pedidos?.sena_porcentaje ?? 50 }),
    resumen: { nuevos: nuevos[0].n, manana: manana[0].n },
    papelera: borrados,
  };
}

async function leerPapelera() {
  const hace30 = sql`now() - interval '30 days'`;
  const [a, b, c, d] = await Promise.all([
    db.select({ id: s.sabor.id, etiqueta: s.sabor.nombre, cuando: s.sabor.eliminadoEn }).from(s.sabor).where(and(isNotNull(s.sabor.eliminadoEn), gte(s.sabor.eliminadoEn, hace30))),
    db.select({ id: s.heladoXl.id, etiqueta: s.heladoXl.nombre, cuando: s.heladoXl.eliminadoEn }).from(s.heladoXl).where(and(isNotNull(s.heladoXl.eliminadoEn), gte(s.heladoXl.eliminadoEn, hace30))),
    db.select({ id: s.promo.id, etiqueta: s.promo.titulo, cuando: s.promo.eliminadoEn }).from(s.promo).where(and(isNotNull(s.promo.eliminadoEn), gte(s.promo.eliminadoEn, hace30))),
    db.select({ id: s.puntoVenta.id, etiqueta: s.puntoVenta.nombre, cuando: s.puntoVenta.eliminadoEn }).from(s.puntoVenta).where(and(isNotNull(s.puntoVenta.eliminadoEn), gte(s.puntoVenta.eliminadoEn, hace30))),
  ]);
  return [
    ...a.map((x) => ({ ...x, tipo: "sabores", de: "Sabores" })),
    ...b.map((x) => ({ ...x, tipo: "xl", de: "Helados XL" })),
    ...c.map((x) => ({ ...x, tipo: "promos", de: "Promos" })),
    ...d.map((x) => ({ ...x, tipo: "puntos", de: "Puntos de venta" })),
  ].sort((x, y) => +new Date(y.cuando!) - +new Date(x.cuando!));
}

export const filtrosPedidos = z.object({
  estado: z.enum(["", ...ESTADOS_PEDIDO]).default(""),
  dia: z.enum(["", "hoy", "manana", "semana", "pasados"]).default(""),
  modalidad: z.enum(["", "hoy", "otro_dia"]).default(""),
  entrega: z.enum(["", "retiro", "bolt"]).default(""),
  factura: z.enum(["", "si", "no"]).default(""),
  q: z.string().trim().max(60).default(""),
  pagina: z.coerce.number().int().min(1).max(10000).default(1),
  por: z.coerce.number().int().refine((n) => [10, 20, 50].includes(n)).default(20),
});
export type FiltrosPedidos = z.infer<typeof filtrosPedidos>;

/** Lista paginada en el servidor (LIMIT/OFFSET con conteo total): nunca se cargan todos los pedidos. */
export async function listarPedidos(f: FiltrosPedidos) {
  const hoy = hoyISO();
  const condiciones = (sinEstado: boolean): SQL[] => {
    const c: SQL[] = [isNull(s.pedido.eliminadoEn)];
    if (!sinEstado && f.estado) c.push(eq(s.pedido.estado, f.estado));
    if (f.modalidad) c.push(eq(s.pedido.modalidad, f.modalidad));
    if (f.entrega) c.push(eq(s.pedido.entrega, f.entrega));
    if (f.factura === "si") c.push(isNotNull(s.pedido.factura));
    if (f.factura === "no") c.push(isNull(s.pedido.factura));
    if (f.dia === "hoy") c.push(eq(s.pedido.fechaEntrega, hoy));
    if (f.dia === "manana") c.push(eq(s.pedido.fechaEntrega, sumarDias(hoy, 1)));
    if (f.dia === "semana") c.push(and(gte(s.pedido.fechaEntrega, hoy), lte(s.pedido.fechaEntrega, sumarDias(hoy, 7)))!);
    if (f.dia === "pasados") c.push(lt(s.pedido.fechaEntrega, hoy));
    if (f.q) {
      const t = `%${f.q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
      c.push(or(ilike(s.pedido.nombre, t), ilike(s.pedido.codigo, t), sql`${s.pedido.detalle}::text ilike ${t}`)!);
    }
    return c;
  };
  const donde = and(...condiciones(false));
  const orden = [sql`case when ${s.pedido.fechaEntrega} < ${hoy} then 1 else 0 end`, sql`case when ${s.pedido.fechaEntrega} < ${hoy} then null else ${s.pedido.fechaEntrega} end asc`, desc(s.pedido.fechaEntrega), desc(s.pedido.id)];
  const [filas, [{ total }], [{ todos }], cuentas] = await Promise.all([
    db.select().from(s.pedido).where(donde).orderBy(...orden).limit(f.por).offset((f.pagina - 1) * f.por),
    db.select({ total: count() }).from(s.pedido).where(donde),
    db.select({ todos: count() }).from(s.pedido).where(isNull(s.pedido.eliminadoEn)),
    db.select({ estado: s.pedido.estado, n: count() }).from(s.pedido).where(and(...condiciones(true))).groupBy(s.pedido.estado),
  ]);
  const porEstado: Record<string, number> = { "": 0 };
  for (const c of cuentas) { porEstado[c.estado] = c.n; porEstado[""] += c.n; }
  return {
    hoy,
    total,
    todos,
    cuentas: porEstado,
    filas: filas.map((p) => ({
      id: p.id, codigo: p.codigo, modalidad: p.modalidad, entrega: p.entrega, fechaEntrega: p.fechaEntrega,
      nombre: p.nombre, detalle: p.detalle, total: p.total, sena: p.sena, estado: p.estado, notas: p.notas,
      factura: p.factura, promo: p.promo, creado: p.creado, unidadesGourmet: p.unidadesGourmet, precioGourmet: p.precioGourmet, unidadesXl: p.unidadesXl, precioXl: p.precioXl,
    })),
  };
}

// ---------- acciones ----------

const texto = (max: number) => z.string().trim().max(max);
const https = z.string().trim().max(300).refine((u) => u === "" || /^https:\/\/[^\s"'<>]+$/.test(u), "El link tiene que empezar con https://");
const mapa = z.string().trim().max(300).refine((u) => /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|maps\.google\.com)\//.test(u), "El link tiene que ser de Google Maps.");
const foto = z.string().regex(/^\/(media\/fotos\/[a-z0-9-]+\.webp|fotos\/[A-Za-z0-9_-]+\.webp)$/).nullable().optional();
const fotoWeb = z.string().regex(/^\/media\/fotos\/[a-z0-9-]+\.(webp|jpg)$/);
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido");
const fechaOpcional = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
const lista = z.enum(["sabores", "xl"]);
const id = z.number().int().positive();

export const accion = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("estado"), lista, ids: z.array(id).min(1).max(100), estado: z.enum(ESTADOS_PRODUCTO) }),
  z.object({ accion: z.literal("todo_disponible") }),
  z.object({ accion: z.literal("guardar_producto"), lista, id: id.optional(), nombre: texto(60).min(1, "Poné un nombre."), descripcion: texto(120).optional(), foto, color: color.optional() }),
  z.object({ accion: z.literal("borrar"), lista: z.enum(["sabores", "xl", "promos", "puntos"]), id }),
  z.object({ accion: z.literal("restaurar"), lista: z.enum(["sabores", "xl", "promos", "puntos"]), id }),
  z.object({ accion: z.literal("precio"), id, campo: z.enum(["desde", "precio"]), valor: z.number().int().min(0).max(10_000_000) }),
  z.object({ accion: z.literal("nuevo_precio"), producto: z.enum(["gourmet", "xl"]), desde: z.number().int().min(2).max(100_000), precio: z.number().int().min(0).max(10_000_000) }),
  z.object({ accion: z.literal("borrar_precio"), id }),
  z.object({
    accion: z.literal("guardar_promo"), id: id.optional(), titulo: texto(100).min(1, "Poné un título."), detalle: texto(400), foto, desde: fechaOpcional, hasta: fechaOpcional,
    // armar en la web: mínimo de heladitos, precio por heladito (opcional) y sabores (vacío = todos)
    minimo: z.number().int("El mínimo va sin decimales.").min(1, "El mínimo tiene que ser 1 o más.").max(5000).nullable().optional(),
    precioUnidad: z.number().int("El precio va sin decimales.").min(1, "El precio tiene que ser mayor a 0.").max(10_000_000).nullable().optional(),
    sabores: z.array(z.string().min(1).max(60)).max(100).optional(),
  }),
  z.object({ accion: z.literal("terminar_promo"), id }),
  z.object({ accion: z.literal("duplicar_promo"), id }),
  z.object({ accion: z.literal("guardar_punto"), id: id.optional(), nombre: texto(80).min(1, "Poné el nombre del local."), barrio: texto(80), mapa }),
  z.object({ accion: z.literal("visible_punto"), id, visible: z.boolean() }),
  z.object({ accion: z.literal("estado_pedido"), id, estado: z.enum(ESTADOS_PEDIDO) }),
  z.object({ accion: z.literal("notas_pedido"), id, notas: texto(1000) }),
  z.object({
    accion: z.literal("ajustes"),
    email: z.union([z.literal(""), z.string().trim().email("Revisá el email de avisos.").max(120)]),
    whatsapp: z.string().trim().max(20).refine((t) => /^0?9\d{8}$/.test(t.replace(/\D/g, "")), "El WhatsApp tiene que ser un celular, por ejemplo 0986 759 890."),
    instagram: https, tiktok: https, horario: texto(80), mapa: z.union([z.literal(""), mapa]),
    sena: z.number().int().min(0).max(100), pago: texto(600),
  }),
  z.object({ accion: z.literal("email_prueba") }),
  z.object({ accion: z.literal("foto_web"), clave: z.string().max(30), ruta: fotoWeb.nullable().optional(), original: z.boolean().optional(), alt: texto(160) }),
  z.object({ accion: z.literal("textos"), valores: z.record(z.string(), z.string().max(400)) }),
]);
export type Accion = z.infer<typeof accion>;

const tablas = { sabores: s.sabor, xl: s.heladoXl, promos: s.promo, puntos: s.puntoVenta } as const;

async function auditar(u: Usuario, entidad: string, entidadId: number | null, campo: string, antes: unknown, despues: unknown) {
  await db.insert(s.auditoria).values({ usuario: u.email, entidad, entidadId, campo, antes: antes == null ? null : String(antes).slice(0, 500), despues: despues == null ? null : String(despues).slice(0, 500) });
}

function slugDe(nombre: string) {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "sabor";
}

async function guardarAjuste(clave: string, valor: unknown) {
  await db.insert(s.ajustes).values({ clave, valor }).onConflictDoUpdate({ target: s.ajustes.clave, set: { valor } });
}

export type Resultado = { ok: true; aviso: string } | { ok: false; error: string };

export async function ejecutar(a: Accion, u: Usuario): Promise<Resultado> {
  switch (a.accion) {
    case "estado": {
      const t = a.lista === "sabores" ? s.sabor : s.heladoXl;
      await db.update(t).set({ estado: a.estado }).where(inArray(t.id, a.ids));
      await auditar(u, a.lista, a.ids.length === 1 ? a.ids[0] : null, "estado", null, `${a.ids.join(",")}: ${a.estado}`);
      return { ok: true, aviso: a.ids.length === 1 ? "Estado guardado" : `${a.ids.length} cambiados` };
    }
    case "todo_disponible": {
      const r1 = await db.update(s.sabor).set({ estado: "disponible" }).where(eq(s.sabor.estado, "hoy_no_hay")).returning({ id: s.sabor.id });
      const r2 = await db.update(s.heladoXl).set({ estado: "disponible" }).where(eq(s.heladoXl.estado, "hoy_no_hay")).returning({ id: s.heladoXl.id });
      const n = r1.length + r2.length;
      if (n) await auditar(u, "productos", null, "estado", "hoy_no_hay", "disponible");
      return { ok: true, aviso: n ? `${n} pasaron a Disponible` : 'No había nada en "Hoy no hay"' };
    }
    case "guardar_producto": {
      const t = a.lista === "sabores" ? s.sabor : s.heladoXl;
      if (a.id) {
        const cambios: Record<string, unknown> = { nombre: a.nombre };
        if (a.lista === "xl") cambios.descripcion = a.descripcion ?? "";
        if (a.lista === "sabores" && a.color) cambios.color = a.color;
        if (a.foto) cambios.foto = a.foto;
        await db.update(t).set(cambios).where(eq(t.id, a.id));
        await auditar(u, a.lista, a.id, "editar", null, a.nombre);
      } else {
        const base = slugDe(a.nombre);
        const existentes = new Set((await db.select({ slug: t.slug }).from(t)).map((x) => x.slug));
        let slug = base;
        for (let i = 2; existentes.has(slug); i++) slug = `${base}-${i}`;
        const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${t.orden}),0)` }).from(t);
        const fila = { slug, nombre: a.nombre, foto: a.foto ?? null, orden: Number(max) + 1 };
        const [n] = a.lista === "sabores"
          ? await db.insert(s.sabor).values({ ...fila, color: a.color ?? "#F4B9BF" }).returning({ id: s.sabor.id })
          : await db.insert(s.heladoXl).values({ ...fila, descripcion: a.descripcion ?? "" }).returning({ id: s.heladoXl.id });
        await auditar(u, a.lista, n.id, "crear", null, a.nombre);
      }
      return { ok: true, aviso: "Guardado" };
    }
    case "borrar": {
      const t = tablas[a.lista];
      await db.update(t).set({ eliminadoEn: new Date() }).where(eq(t.id, a.id));
      await auditar(u, a.lista, a.id, "papelera", null, "eliminado");
      return { ok: true, aviso: "Mandado a la papelera" };
    }
    case "restaurar": {
      const t = tablas[a.lista];
      await db.update(t).set({ eliminadoEn: null }).where(eq(t.id, a.id));
      await auditar(u, a.lista, a.id, "papelera", "eliminado", "restaurado");
      return { ok: true, aviso: "Restaurado" };
    }
    case "precio": {
      const [e] = await db.select().from(s.escalonPrecio).where(eq(s.escalonPrecio.id, a.id));
      if (!e) return { ok: false, error: "Ese escalón ya no existe." };
      if (a.campo === "desde") {
        if (e.desde === 1) return { ok: false, error: 'El escalón "desde 1" es el precio base y no se mueve.' };
        if (a.valor < 2) return { ok: false, error: "La cantidad tiene que ser 2 o más." };
        const [choca] = await db.select({ id: s.escalonPrecio.id }).from(s.escalonPrecio).where(and(eq(s.escalonPrecio.producto, e.producto), eq(s.escalonPrecio.desde, a.valor), ne(s.escalonPrecio.id, e.id)));
        if (choca) return { ok: false, error: "Ya hay un escalón con esa cantidad." };
      }
      await db.update(s.escalonPrecio).set({ [a.campo]: a.valor }).where(eq(s.escalonPrecio.id, a.id));
      await auditar(u, "escalon_precio", a.id, a.campo, e[a.campo], a.valor);
      return { ok: true, aviso: "Precio guardado" };
    }
    case "nuevo_precio": {
      const [choca] = await db.select({ id: s.escalonPrecio.id }).from(s.escalonPrecio).where(and(eq(s.escalonPrecio.producto, a.producto), eq(s.escalonPrecio.desde, a.desde)));
      if (choca) return { ok: false, error: "Ya hay un escalón con esa cantidad." };
      const [n] = await db.insert(s.escalonPrecio).values({ producto: a.producto, desde: a.desde, precio: a.precio }).returning({ id: s.escalonPrecio.id });
      await auditar(u, "escalon_precio", n.id, "crear", null, `${a.producto} desde ${a.desde}: ${a.precio}`);
      return { ok: true, aviso: "Escalón agregado" };
    }
    case "borrar_precio": {
      const [e] = await db.select().from(s.escalonPrecio).where(eq(s.escalonPrecio.id, a.id));
      if (!e) return { ok: false, error: "Ese escalón ya no existe." };
      if (e.desde === 1) return { ok: false, error: 'El escalón "desde 1" no se puede borrar.' };
      await db.delete(s.escalonPrecio).where(eq(s.escalonPrecio.id, a.id));
      await auditar(u, "escalon_precio", a.id, "borrar", `${e.producto} desde ${e.desde}: ${e.precio}`, null);
      return { ok: true, aviso: "Escalón eliminado" };
    }
    case "guardar_promo": {
      if (a.desde && a.hasta && a.hasta < a.desde) return { ok: false, error: 'La fecha "hasta" no puede ser antes de "desde".' };
      if (a.precioUnidad && !a.minimo) return { ok: false, error: "Para poner precio de promo, poné también el mínimo de heladitos." };
      const valores = {
        titulo: a.titulo, detalle: a.detalle, textoWhatsapp: a.titulo, desde: a.desde || null, hasta: a.hasta || null,
        minimo: a.minimo ?? null, precioUnidad: a.minimo ? (a.precioUnidad ?? null) : null, sabores: a.minimo && a.sabores?.length ? a.sabores : null,
      };
      if (a.id) {
        await db.update(s.promo).set({ ...valores, ...(a.foto ? { foto: a.foto } : {}) }).where(eq(s.promo.id, a.id));
        await auditar(u, "promo", a.id, "editar", null, a.titulo);
      } else {
        const [n] = await db.insert(s.promo).values({ ...valores, foto: a.foto ?? null }).returning({ id: s.promo.id });
        await auditar(u, "promo", n.id, "crear", null, a.titulo);
      }
      return { ok: true, aviso: "Promo guardada" };
    }
    case "terminar_promo": {
      await db.update(s.promo).set({ terminadaEn: new Date() }).where(eq(s.promo.id, a.id));
      await auditar(u, "promo", a.id, "terminada", null, "sí");
      return { ok: true, aviso: "Promo terminada" };
    }
    case "duplicar_promo": {
      const [p] = await db.select().from(s.promo).where(eq(s.promo.id, a.id));
      if (!p) return { ok: false, error: "Esa promo ya no existe." };
      await db.insert(s.promo).values({ titulo: `${p.titulo} (copia)`, detalle: p.detalle, foto: p.foto, textoWhatsapp: p.textoWhatsapp, desde: hoyISO(), hasta: null, visible: p.visible, orden: p.orden, minimo: p.minimo, precioUnidad: p.precioUnidad, sabores: p.sabores });
      return { ok: true, aviso: "Promo duplicada" };
    }
    case "guardar_punto": {
      const valores = { nombre: a.nombre, barrio: a.barrio || null, linkMapa: a.mapa };
      if (a.id) await db.update(s.puntoVenta).set(valores).where(eq(s.puntoVenta.id, a.id));
      else {
        const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${s.puntoVenta.orden}),0)` }).from(s.puntoVenta);
        await db.insert(s.puntoVenta).values({ ...valores, orden: Number(max) + 1 });
      }
      await auditar(u, "punto_venta", a.id ?? null, a.id ? "editar" : "crear", null, a.nombre);
      return { ok: true, aviso: "Guardado" };
    }
    case "visible_punto": {
      await db.update(s.puntoVenta).set({ visible: a.visible }).where(eq(s.puntoVenta.id, a.id));
      return { ok: true, aviso: a.visible ? "Ahora se ve en la web" : "Oculto en la web" };
    }
    case "estado_pedido": {
      const [p] = await db.select({ estado: s.pedido.estado }).from(s.pedido).where(eq(s.pedido.id, a.id));
      if (!p) return { ok: false, error: "Ese pedido ya no existe." };
      await db.update(s.pedido).set({ estado: a.estado }).where(eq(s.pedido.id, a.id));
      await auditar(u, "pedido", a.id, "estado", p.estado, a.estado);
      return { ok: true, aviso: "Estado guardado" };
    }
    case "notas_pedido": {
      await db.update(s.pedido).set({ notas: a.notas }).where(eq(s.pedido.id, a.id));
      return { ok: true, aviso: "Notas guardadas" };
    }
    case "ajustes": {
      const digitos = a.whatsapp.replace(/\D/g, "").replace(/^0/, "");
      const valor = "595" + digitos;
      const [wa] = await db.select().from(s.ajustes).where(eq(s.ajustes.clave, "whatsapp"));
      const anterior = (wa?.valor ?? {}) as { valor?: string; link_perfil?: string };
      await guardarAjuste("whatsapp", {
        valor, mostrar: telefonoVisible(valor), link: `https://wa.me/${valor}`,
        // el link de perfil (wa.me/message/...) solo sirve para el número original
        link_perfil: anterior.valor === valor && anterior.link_perfil ? anterior.link_perfil : `https://wa.me/${valor}`,
      });
      const usuarioRed = (link: string, prefijo: string) => (link ? prefijo + (link.replace(/\/+$/, "").split("/").pop() ?? "").replace(/^@/, "").split("?")[0] : "");
      await guardarAjuste("instagram", a.instagram ? { link: a.instagram, mostrar: usuarioRed(a.instagram, "@") } : null);
      await guardarAjuste("tiktok", a.tiktok ? { link: a.tiktok, mostrar: usuarioRed(a.tiktok, "@") } : null);
      await guardarAjuste("horarios", a.horario);
      const [ub] = await db.select().from(s.ajustes).where(eq(s.ajustes.clave, "ubicacion"));
      await guardarAjuste("ubicacion", { ...((ub?.valor ?? {}) as object), google_maps: a.mapa });
      const [pe] = await db.select().from(s.ajustes).where(eq(s.ajustes.clave, "pedidos"));
      await guardarAjuste("pedidos", { ...((pe?.valor ?? {}) as object), sena_porcentaje: a.sena });
      await guardarAjuste("email_avisos", a.email);
      await guardarAjuste("datos_pago_privado", a.pago);
      await auditar(u, "ajustes", null, "guardar", null, "ajustes");
      return { ok: true, aviso: "Ajustes guardados" };
    }
    case "foto_web": {
      if (!esClaveFoto(a.clave)) return { ok: false, error: "Esa foto no existe." };
      const def = FOTOS_WEB.find((f) => f.clave === a.clave)!;
      if (a.ruta && def.uso === "compartir" && !a.ruta.endsWith(".jpg")) return { ok: false, error: "La imagen para compartir tiene que subirse de nuevo." };
      const [fila] = await db.select().from(s.ajustes).where(eq(s.ajustes.clave, "fotos_web"));
      const todas = { ...((fila?.valor ?? {}) as Record<string, { ruta?: string; alt?: string }>) };
      const actual = todas[a.clave] ?? {};
      const nueva = { ruta: a.original ? undefined : a.ruta ?? actual.ruta, alt: a.alt || undefined };
      if (!nueva.ruta && !nueva.alt) delete todas[a.clave];
      else todas[a.clave] = nueva;
      await guardarAjuste("fotos_web", todas);
      await auditar(u, "ajustes", null, `foto ${a.clave}`, actual.ruta ?? "original", nueva.ruta ?? "original");
      return { ok: true, aviso: a.original ? "Volvió la foto original" : "Foto guardada. Ya se ve en la web." };
    }
    case "textos": {
      const limpio: Record<string, string> = {};
      for (const [k, v] of Object.entries(a.valores)) {
        if (!esClaveTexto(k)) return { ok: false, error: "Hay un texto que no reconocemos." };
        const t = v.replace(/\r\n?/g, "\n").replace(/[<>]/g, "").trim();
        if (t.length > maxTexto(k)) {
          const campo = GRUPOS_TEXTOS.flatMap((g) => g.campos).find((c) => c.clave === k)!;
          return { ok: false, error: `"${campo.etiqueta}" tiene más de ${maxTexto(k)} letras.` };
        }
        if (t) limpio[k] = t; // vacío = vuelve al texto original
      }
      await guardarAjuste("textos_web", limpio);
      await auditar(u, "ajustes", null, "textos_web", null, Object.keys(limpio).join(", ") || "todos originales");
      return { ok: true, aviso: "Textos guardados. Ya se ven en la web." };
    }
    case "email_prueba": {
      const [fila] = await db.select().from(s.ajustes).where(eq(s.ajustes.clave, "email_avisos"));
      const para = typeof fila?.valor === "string" ? fila.valor : "";
      if (!para) return { ok: false, error: "Primero guardá el email que recibe los avisos." };
      const r = await enviarEmail({ para, ...plantillaPrueba() });
      return r.ok ? { ok: true, aviso: `Te mandamos un email de prueba a ${para}` } : { ok: false, error: `No se pudo mandar el email (${r.error}).` };
    }
  }
}
