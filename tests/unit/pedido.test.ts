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
  modalidad: "otro_dia", lineas: [], entrega: "retiro", fechaEntrega: "2026-10-21", nombre: "Ana", ...p,
});
const v = (p: Partial<PedidoEntrada>) => validarPedido(base(p), cat, { paquete: 25, ahora });

describe("validarPedido", () => {
  it("anticipado acepta hoy_no_hay y cualquier cantidad", () => {
    const r = v({ lineas: [{ tipo: "gourmet", slug: "uva", cantidad: 15 }] });
    expect(r.ok).toBe(true);
  });
  it("para hoy pide paquetes de 25 y disponible", () => {
    expect(v({ modalidad: "hoy", lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 30 }] }).ok).toBe(false);
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
