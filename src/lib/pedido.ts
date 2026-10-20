// Validación del pedido en el servidor: forma (zod) + reglas de negocio (modelo-datos.json → validaciones).

import { z } from "zod";
import { esFechaISO, hoyISO, mananaISO, sumarDias } from "./fechas";

export const MAX_DIAS_ANTICIPACION = 90;
export const RUC = /^\d{1,8}-\d$/;
import type { Linea } from "./precios";

export const pedidoEntrada = z.object({
  modalidad: z.enum(["hoy", "otro_dia"]),
  lineas: z
    .array(
      z.object({
        tipo: z.enum(["gourmet", "xl"], { error: "Hay un producto que no reconocemos." }),
        slug: z.string().min(1).max(60),
        cantidad: z
          .number({ error: "Las cantidades tienen que ser números." })
          .int("Las cantidades van sin decimales.")
          .min(0, "Las cantidades no pueden ser negativas.")
          .max(5000, "Para más de 5.000 unidades escribinos por WhatsApp."),
      }),
    )
    .max(40, "El pedido tiene demasiados renglones."),
  entrega: z.enum(["retiro", "bolt"], { error: "Elegí cómo lo recibís." }),
  fechaEntrega: z.string().max(10).optional(),
  nombre: z.string().trim().min(1, "Escribí tu nombre o el de tu negocio.").max(80, "El nombre es muy largo."),
  factura: z
    .object({
      nombre_apellido: z.string().trim().min(3, "Para la factura falta el nombre y apellido.").max(120),
      ruc: z.string().trim().regex(RUC, "El RUC va con guion y dígito verificador, por ejemplo 1234567-8."),
      correo: z.string().trim().max(120).email("Revisá el correo para la factura."),
    })
    .nullable()
    .optional(),
  // honeypot: campo invisible para personas; si viene con algo, es un robot
  sitio_web: z.string().max(200).optional(),
});

export type PedidoEntrada = z.infer<typeof pedidoEntrada>;

export type ItemCatalogo = {
  tipo: "gourmet" | "xl";
  slug: string;
  nombre: string;
  estado: "disponible" | "hoy_no_hay" | "agotado" | "oculto";
};

export type ResultadoValidacion =
  | { ok: true; lineas: Linea[]; fechaEntrega: string }
  | { ok: false; errores: string[] };

export function validarPedido(
  e: PedidoEntrada,
  catalogo: ItemCatalogo[],
  opciones: { paquete: number; ahora?: Date },
): ResultadoValidacion {
  const errores: string[] = [];
  const lineas: Linea[] = [];
  const vistos = new Set<string>();
  for (const l of e.lineas) {
    if (l.cantidad === 0) continue;
    const clave = `${l.tipo}:${l.slug}`;
    if (vistos.has(clave)) {
      errores.push("Hay un sabor repetido en el pedido.");
      continue;
    }
    vistos.add(clave);
    const item = catalogo.find((c) => c.tipo === l.tipo && c.slug === l.slug);
    if (!item || item.estado === "oculto") {
      errores.push("Uno de los sabores ya no está en la lista.");
      continue;
    }
    if (item.estado === "agotado") {
      errores.push(`${item.nombre} está agotado.`);
      continue;
    }
    if (e.modalidad === "hoy") {
      if (item.estado !== "disponible") errores.push(`Hoy no hay ${item.nombre}. Podés pedirlo para otro día.`);
      if (l.tipo === "gourmet" && l.cantidad % opciones.paquete !== 0)
        errores.push(`Para hoy, ${item.nombre} va en paquetes de ${opciones.paquete}.`);
    }
    lineas.push({ tipo: l.tipo, sabor: item.nombre, cantidad: l.cantidad });
  }
  if (!lineas.length && !errores.length) errores.push("Elegí al menos un sabor.");

  let fechaEntrega = hoyISO(opciones.ahora);
  if (e.modalidad === "otro_dia") {
    const f = e.fechaEntrega ?? "";
    if (!esFechaISO(f)) errores.push("Elegí el día de entrega.");
    else if (f < mananaISO(opciones.ahora)) errores.push("Con anticipación, la entrega es desde mañana.");
    else if (f > sumarDias(hoyISO(opciones.ahora), MAX_DIAS_ANTICIPACION)) errores.push(`Agendamos hasta ${MAX_DIAS_ANTICIPACION} días adelante. Para más, escribinos por WhatsApp.`);
    else fechaEntrega = f;
  }
  return errores.length ? { ok: false, errores } : { ok: true, lineas, fechaEntrega };
}
