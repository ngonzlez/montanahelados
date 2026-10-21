// Emails con Resend. Los avisos de pedidos van por la cola (tabla notificacion) y los manda
// la tarea programada jobs/enviar-emails.ts; nunca dentro de la request del formulario.
// Sin imports con "@/" ni "server-only": este archivo también lo usa la tarea programada.
import { Resend } from "resend";
import { and, eq, lt, asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "../db/schema";
import { gs, fechaVisible } from "./formato";

type Email = { para: string; asunto: string; html: string; texto: string };

const esc = (t: unknown) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function enviarEmail(e: Email): Promise<{ ok: true } | { ok: false; error: string }> {
  const clave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_FROM;
  if (!clave || !de) return { ok: false, error: "Falta RESEND_API_KEY o EMAIL_FROM" };
  const r = await new Resend(clave).emails.send({ from: de, to: e.para, subject: e.asunto, html: e.html, text: e.texto });
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}

function marco(titulo: string, cuerpoHtml: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#FCF1DA;font-family:Arial,sans-serif;color:#6B2219">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:22px;font-weight:bold;margin:0 0 16px">Montana Helados</p>
<div style="background:#FFF4DC;border:3px solid #6B2219;border-radius:18px;padding:20px">
<h1 style="font-size:22px;margin:0 0 12px">${esc(titulo)}</h1>${cuerpoHtml}</div>
<p style="font-size:12px;margin-top:16px">Aviso automático del panel de Montana Helados.</p></div></body></html>`;
}

export function plantillaRecuperar(url: string) {
  return {
    asunto: "Recuperá tu contraseña",
    html: marco("Recuperá tu contraseña", `<p>Tocá el botón para elegir una contraseña nueva. El enlace sirve una sola vez y vence en 1 hora.</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#F7D977;border:3px solid #6B2219;border-radius:999px;padding:10px 20px;color:#6B2219;font-weight:bold;text-decoration:none">Elegir contraseña nueva</a></p>
<p style="font-size:13px">Si no lo pediste vos, ignorá este email: tu contraseña no cambia.</p>`),
    texto: `Recuperá tu contraseña de Montana Helados.\n\nAbrí este enlace (sirve una vez y vence en 1 hora):\n${url}\n\nSi no lo pediste vos, ignorá este email.`,
  };
}

export type DatosPedidoNuevo = {
  codigo: string; modalidad: "hoy" | "otro_dia"; lineas: { tipo: string; sabor: string; cantidad: number }[];
  unidades: number; total: number; sena: number; entrega: "retiro" | "bolt"; fechaEntrega: string; nombre: string; factura: boolean; enlacePanel: string; promo?: string | null;
};

export function plantillaPedidoNuevo(d: DatosPedidoNuevo) {
  const detalle = d.lineas.map((l) => `${l.cantidad} ${l.tipo === "xl" ? "XL " : ""}${l.sabor}`);
  const filas: [string, string][] = [
    ["Para", d.modalidad === "hoy" ? "hoy" : fechaVisible(d.fechaEntrega)],
    ["Cliente", d.nombre],
    ...(d.promo ? ([["Promo", d.promo]] as [string, string][]) : []),
    ["Pedido", detalle.join(", ")],
    ["Total", gs(d.total)],
    ["Seña", gs(d.sena)],
    ["Entrega", d.entrega === "retiro" ? "Retiro en Reducto" : "Bolt Envíos"],
    ["Factura", d.factura ? "Sí, pidió factura" : "No"],
  ];
  return {
    asunto: `Nuevo pedido ${d.codigo} · ${d.unidades} unidades · ${gs(d.total)}`,
    html: marco(`Nuevo pedido ${d.codigo}`, `<table style="border-collapse:collapse;width:100%">${filas.map(([k, v]) => `<tr><td style="padding:4px 8px 4px 0;font-weight:bold;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join("")}</table>
<p style="margin-top:14px">El cliente tiene que mandarte el mensaje por WhatsApp; si no llega, buscalo por el código.</p>
<p><a href="${esc(d.enlacePanel)}" style="display:inline-block;background:#F7D977;border:3px solid #6B2219;border-radius:999px;padding:10px 20px;color:#6B2219;font-weight:bold;text-decoration:none">Ver en el panel</a></p>`),
    texto: `Nuevo pedido ${d.codigo}\n\n${filas.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nVer en el panel: ${d.enlacePanel}`,
  };
}

export function plantillaPrueba() {
  return {
    asunto: "Prueba de avisos · Montana Helados",
    html: marco("Los avisos funcionan", "<p>Si te llegó este email, vas a recibir un aviso cada vez que alguien arme un pedido en la web.</p>"),
    texto: "Los avisos funcionan. Vas a recibir un aviso cada vez que alguien arme un pedido en la web.",
  };
}

function armar(n: typeof s.notificacion.$inferSelect): Email | null {
  if (n.tipo === "pedido_nuevo_admin") return { para: n.para, ...plantillaPedidoNuevo(n.datos as unknown as DatosPedidoNuevo) };
  if (n.tipo === "prueba") return { para: n.para, ...plantillaPrueba() };
  return null;
}

/** Manda los avisos pendientes (hasta 3 intentos cada uno). Lo llama la tarea programada. */
export async function procesarCola(db: NodePgDatabase<typeof s>, max = 20) {
  const pendientes = await db.select().from(s.notificacion)
    .where(and(eq(s.notificacion.estado, "pendiente"), lt(s.notificacion.intentos, 3)))
    .orderBy(asc(s.notificacion.id)).limit(max);
  let enviadas = 0, fallidas = 0;
  for (const n of pendientes) {
    const e = armar(n);
    const r = e ? await enviarEmail(e).catch((err) => ({ ok: false as const, error: String(err) })) : { ok: false as const, error: "tipo desconocido" };
    const intentos = n.intentos + 1;
    if (r.ok) {
      enviadas++;
      await db.update(s.notificacion).set({ estado: "enviada", intentos, enviadoEn: new Date(), error: null }).where(eq(s.notificacion.id, n.id));
    } else {
      fallidas++;
      await db.update(s.notificacion).set({ estado: intentos >= 3 ? "fallida" : "pendiente", intentos, error: r.error.slice(0, 500) }).where(eq(s.notificacion.id, n.id));
    }
  }
  return { enviadas, fallidas };
}
