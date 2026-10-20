// Armado del mensaje y del enlace wa.me (docs/web/flujos.json → mensajes_whatsapp).
// Regla: nunca decir que el mensaje se envió; solo se abre el chat.

import { gs, fechaVisible } from "./formato";
import type { Linea, ResultadoPedido } from "./precios";
import type { DatosFactura } from "@/db/schema";

export const AVISO_ABIERTO = "Se abrió WhatsApp con tu pedido. Revisalo y tocá enviar.";

export function enlaceWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export type DatosMensaje = {
  modalidad: "hoy" | "otro_dia";
  lineas: Linea[];
  calculo: ResultadoPedido;
  senaPorcentaje: number;
  entrega: "retiro" | "bolt";
  fechaEntrega: string; // ISO
  nombre: string;
  codigo?: string;
  factura?: Partial<DatosFactura> | null;
};

const completar = (v?: string) => (v && v.trim() ? v.trim() : "(completar)");

export function mensajePedido(d: DatosMensaje): string {
  const hoy = d.modalidad === "hoy";
  const g = d.lineas.filter((l) => l.tipo === "gourmet" && l.cantidad > 0);
  const x = d.lineas.filter((l) => l.tipo === "xl" && l.cantidad > 0);
  const c = d.calculo;
  const r: string[] = [`¡Hola, Montana Helados! Quiero hacer un pedido ${hoy ? "para hoy" : "para otro día"}:`, ""];
  if (g.length) {
    r.push(hoy ? "Heladitos (paquetes de 25):" : "Heladitos:");
    for (const l of g) r.push(`- ${l.sabor}: ${l.cantidad}`);
    r.push(`Total: ${c.unidadesGourmet} heladitos a ${gs(c.precioGourmet)} c/u = ${gs(c.subtotalGourmet)}`, "");
  }
  if (x.length) {
    r.push("Helados XL:");
    for (const l of x) r.push(`- ${l.sabor}: ${l.cantidad}`);
    r.push(`Total: ${c.unidadesXl} XL a ${gs(c.precioXl)} c/u = ${gs(c.subtotalXl)}`, "");
  }
  r.push(`Total estimado: ${gs(c.total)}`, `Seña ${d.senaPorcentaje} %: ${gs(c.sena)}`, "");
  r.push(`Entrega: ${d.entrega === "retiro" ? "Retiro en Reducto (llevo conservadora)" : "Bolt Envíos"}`);
  r.push(`Para el día: ${hoy ? "hoy" : fechaVisible(d.fechaEntrega)}`);
  r.push(`Nombre: ${d.nombre.trim()}`);
  if (d.codigo) r.push(`Código: ${d.codigo}`);
  if (d.factura) {
    r.push("", "Necesito factura electrónica:");
    r.push(`Nombre y apellido: ${completar(d.factura.nombre_apellido)}`);
    r.push(`RUC: ${completar(d.factura.ruc)}`);
    r.push(`Correo: ${completar(d.factura.correo)}`);
  }
  return r.join("\n");
}

export function mensajePromo(titulo: string): string {
  return `¡Hola, Montana Helados! Quiero la promo: ${titulo}.`;
}

export const MENSAJE_PUNTOS_VENTA = "¡Hola, Montana Helados! Quiero consultar la disponibilidad de heladitos en los puntos de venta.";
