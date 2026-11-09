import { describe, it, expect } from "vitest";
import { validarPedido, type ItemCatalogo, type PedidoEntrada } from "@/lib/pedido";

const cat: ItemCatalogo[] = [
  { tipo: "gourmet", slug: "frutilla", nombre: "Frutilla", estado: "disponible" },
  { tipo: "gourmet", slug: "uva", nombre: "Uva", estado: "hoy_no_hay" },
  { tipo: "gourmet", slug: "menta", nombre: "Menta", estado: "agotado" },
  { tipo: "gourmet", slug: "pistacho", nombre: "Pistacho", estado: "oculto" },
  { tipo: "xl", slug: "oreo", nombre: "Oreo", estado: "disponible" },
];
// 20/10/2026 12:00 en Asunción (UTC-3)
const ahora = new Date("2026-10-20T15:00:00Z");
const base = (p: Partial<PedidoEntrada>): PedidoEntrada => ({
  modalidad: "otro_dia", lineas: [], entrega: "retiro", fechaEntrega: "2026-10-21", hora: "15:00", nombre: "Ana", ...p,
});
const v = (p: Partial<PedidoEntrada>) => validarPedido(base(p), cat, { ahora });

describe("validarPedido", () => {
  it("anticipado acepta hoy_no_hay y cualquier cantidad", () => {
    const r = v({ lineas: [{ tipo: "gourmet", slug: "uva", cantidad: 15 }] });
    expect(r.ok).toBe(true);
  });
  it("para hoy: cualquier cantidad, solo sabores disponibles", () => {
    expect(v({ modalidad: "hoy", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 30 }] }).ok).toBe(true);
    expect(v({ modalidad: "hoy", lineas: [{ tipo: "gourmet", slug: "uva", cantidad: 25 }] }).ok).toBe(false);
    const r = v({ modalidad: "hoy", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 50 }, { tipo: "xl", slug: "oreo", cantidad: 3 }] });
    expect(r.ok && r.fechaEntrega).toBe("2026-10-20");
  });
  it("agotado y oculto no se piden", () => {
    expect(v({ lineas: [{ tipo: "gourmet", slug: "menta", cantidad: 25 }] }).ok).toBe(false);
    expect(v({ lineas: [{ tipo: "gourmet", slug: "pistacho", cantidad: 25 }] }).ok).toBe(false);
    expect(v({ lineas: [{ tipo: "gourmet", slug: "inventado", cantidad: 25 }] }).ok).toBe(false);
  });
  it("fecha desde mañana", () => {
    expect(v({ fechaEntrega: "2026-10-20", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 5 }] }).ok).toBe(false);
    expect(v({ fechaEntrega: "2026-02-30", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 5 }] }).ok).toBe(false);
    expect(v({ fechaEntrega: undefined, lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 5 }] }).ok).toBe(false);
  });
  it("al menos una unidad y sin repetidos", () => {
    expect(v({ lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 0 }] }).ok).toBe(false);
    expect(v({ lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 5 }, { tipo: "gourmet", slug: "frutilla", cantidad: 5 }] }).ok).toBe(false);
  });
});

import { pedidoEntrada } from "@/lib/pedido";

describe("factura y límites", () => {
  const conFactura = (f: object) => pedidoEntrada.safeParse({ modalidad: "otro_dia", lineas: [], entrega: "retiro", nombre: "Ana", factura: f });
  it("factura completa y con RUC válido", () => {
    expect(conFactura({ nombre_apellido: "Ana Pérez", ruc: "1234567-8", correo: "ana@ejemplo.com" }).success).toBe(true);
    expect(conFactura({ nombre_apellido: "Ana Pérez", ruc: "<script>", correo: "ana@ejemplo.com" }).success).toBe(false);
    expect(conFactura({ nombre_apellido: "", ruc: "1234567-8", correo: "ana@ejemplo.com" }).success).toBe(false);
    expect(conFactura({ nombre_apellido: "Ana Pérez", ruc: "1234567-8", correo: "" }).success).toBe(false);
  });
  it("fecha hasta 90 días", () => {
    expect(v({ fechaEntrega: "2027-01-18", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 5 }] }).ok).toBe(true);
    expect(v({ fechaEntrega: "9999-12-31", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 5 }] }).ok).toBe(false);
  });
});

describe("días y horarios de entrega", () => {
  const f = [{ tipo: "gourmet" as const, slug: "frutilla", cantidad: 10 }];
  it("los domingos no hay entregas", () => {
    expect(v({ fechaEntrega: "2026-10-25", lineas: f }).ok).toBe(false); // domingo
    expect(v({ fechaEntrega: "2026-10-24", lineas: f }).ok).toBe(true); // sábado
    const domingo = new Date("2026-10-25T15:00:00Z");
    expect(validarPedido(base({ modalidad: "hoy", lineas: f }), cat, { ahora: domingo }).ok).toBe(false);
  });
  it("hora de 10 a 18, cada 30 minutos", () => {
    expect(v({ hora: "10:00", lineas: f }).ok).toBe(true);
    expect(v({ hora: "18:00", lineas: f }).ok).toBe(true);
    expect(v({ hora: "09:30", lineas: f }).ok).toBe(false);
    expect(v({ hora: "18:30", lineas: f }).ok).toBe(false);
    expect(v({ hora: "10:15", lineas: f }).ok).toBe(false);
    expect(v({ hora: undefined, lineas: f }).ok).toBe(false);
  });
  it("para hoy, solo horarios que todavía no pasaron (con 30 min de margen)", () => {
    // son las 12:00 en Asunción
    expect(v({ modalidad: "hoy", hora: "12:00", lineas: f }).ok).toBe(false);
    expect(v({ modalidad: "hoy", hora: "12:30", lineas: f }).ok).toBe(true);
  });
  it("respeta el horario de Ajustes", () => {
    expect(validarPedido(base({ hora: "19:00", lineas: f }), cat, { ahora, horario: { desde: 9, hasta: 20 } }).ok).toBe(true);
  });
});
