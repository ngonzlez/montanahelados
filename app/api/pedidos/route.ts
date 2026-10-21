// Guarda el pedido y devuelve el enlace de WhatsApp.
// El servidor valida y recalcula todo: nunca confía en precios ni totales que mande el navegador.
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { pedidoEntrada, validarPedido } from "@/lib/pedido";
import { calcularPedido } from "@/lib/precios";
import { enlaceWhatsapp, mensajePedido, AVISO_ABIERTO } from "@/lib/whatsapp";
import { catalogoParaValidar, leerAjustes, leerEscalones, promoParaPedido } from "@/lib/datos";
import { permitido, ipDeCabeceras } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_BYTES = 16 * 1024;

export async function POST(req: NextRequest) {
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES) return NextResponse.json({ ok: false, errores: ["El pedido es demasiado grande."] }, { status: 413 });
  const ip = ipDeCabeceras(req.headers);
  if (!permitido(ip)) {
    return NextResponse.json({ ok: false, errores: ["Hiciste muchos pedidos seguidos. Probá de nuevo en unos minutos o escribinos por WhatsApp."] }, { status: 429 });
  }
  let cuerpo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > MAX_BYTES) return NextResponse.json({ ok: false, errores: ["El pedido es demasiado grande."] }, { status: 413 });
    cuerpo = JSON.parse(texto);
  } catch {
    return NextResponse.json({ ok: false, errores: ["No pudimos leer el pedido."] }, { status: 400 });
  }
  const forma = pedidoEntrada.safeParse(cuerpo);
  if (!forma.success) {
    return NextResponse.json({ ok: false, errores: forma.error.issues.map((i) => i.message) }, { status: 400 });
  }
  const e = forma.data;
  // honeypot: respondemos como si nada para no darle pistas al robot, pero no se guarda
  if (e.sitio_web) return NextResponse.json({ ok: true, codigo: "MH-0000", enlace: "https://wa.me/", aviso: AVISO_ABIERTO });
  const [catalogo, escalones, ajustes, promo] = await Promise.all([
    catalogoParaValidar(), leerEscalones(), leerAjustes(), e.promoId ? promoParaPedido(e.promoId) : Promise.resolve(null),
  ]);
  if (e.promoId && !promo) {
    return NextResponse.json({ ok: false, errores: ["Esa promo ya terminó. Quitala y mandá el pedido normal, o escribinos por WhatsApp."] }, { status: 422 });
  }
  const reglas: Partial<NonNullable<typeof ajustes.pedidos>> = ajustes.pedidos ?? {};
  const v = validarPedido(e, catalogo, { paquete: reglas.paquete_unidades ?? 25, promo });
  if (!v.ok) return NextResponse.json({ ok: false, errores: v.errores }, { status: 422 });

  const senaPct = reglas.sena_porcentaje ?? 50;
  const calculo = calcularPedido(v.lineas, escalones, senaPct, { precioPromoGourmet: promo?.precioUnidad });
  const promoGuardada = promo ? { id: promo.id, titulo: promo.titulo, minimo: promo.minimo, precioUnidad: promo.precioUnidad } : null;
  const factura = e.factura ? { nombre_apellido: e.factura.nombre_apellido, ruc: e.factura.ruc, correo: e.factura.correo } : null;
  // Sin secreto no se guarda nada: un hash sin sal de una IP se puede revertir.
  const secreto = process.env.IP_HASH_SECRETO;
  const ipHash = secreto ? createHash("sha256").update(secreto + ip).digest("hex").slice(0, 32) : null;

  const guardado = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(s.pedido)
      .values({
        modalidad: e.modalidad,
        detalle: v.lineas,
        unidadesGourmet: calculo.unidadesGourmet,
        precioGourmet: calculo.precioGourmet,
        unidadesXl: calculo.unidadesXl,
        precioXl: calculo.precioXl,
        total: calculo.total,
        sena: calculo.sena,
        entrega: e.entrega,
        fechaEntrega: v.fechaEntrega,
        nombre: e.nombre,
        factura,
        promo: promoGuardada,
        ipHash,
      })
      .returning({ id: s.pedido.id });
    const codigo = "MH-" + String(p.id).padStart(4, "0");
    await tx.update(s.pedido).set({ codigo }).where(eq(s.pedido.id, p.id));
    const para = typeof ajustes.email_avisos === "string" ? ajustes.email_avisos.trim() : "";
    if (para) {
      // Sin email cargado en Ajustes no se encola nada: el pedido queda solo en el panel.
      await tx.insert(s.notificacion).values({
        tipo: "pedido_nuevo_admin",
        para,
        datos: {
          pedidoId: p.id, codigo, modalidad: e.modalidad, lineas: v.lineas,
          unidades: calculo.unidadesGourmet + calculo.unidadesXl, total: calculo.total, sena: calculo.sena,
          entrega: e.entrega, fechaEntrega: v.fechaEntrega, nombre: e.nombre, factura: !!factura, promo: promo?.titulo ?? null,
          enlacePanel: `${process.env.SITE_URL ?? ""}/gestionar#pedido-${p.id}`,
        },
      });
    }
    return { id: p.id, codigo };
  });

  const numero = ajustes.whatsapp?.valor ?? "595986759890";
  const texto = mensajePedido({ modalidad: e.modalidad, lineas: v.lineas, calculo, senaPorcentaje: senaPct, entrega: e.entrega, fechaEntrega: v.fechaEntrega, nombre: e.nombre, codigo: guardado.codigo, factura, promo });
  return NextResponse.json({ ok: true, codigo: guardado.codigo, enlace: enlaceWhatsapp(numero, texto), aviso: AVISO_ABIERTO, calculo });
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}

