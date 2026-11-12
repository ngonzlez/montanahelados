import { describe, it, expect } from "vitest";
import { calcularPedido, type Escalon } from "@/lib/precios";
import { validarPedido, type ItemCatalogo, type PedidoEntrada } from "@/lib/pedido";
import { mensajePedido } from "@/lib/whatsapp";

// Escalones del PRD: heladitos 1 → 3.000, 50 → 2.500, 100 → 2.000; XL 1 → 7.000, 30 → 5.000
const esc: Escalon[] = [
  { producto: "gourmet", desde: 1, precio: 3000 }, { producto: "gourmet", desde: 50, precio: 2500 }, { producto: "gourmet", desde: 100, precio: 2000 },
  { producto: "xl", desde: 1, precio: 7000 }, { producto: "xl", desde: 30, precio: 5000 },
];
const cat: ItemCatalogo[] = [
  { tipo: "gourmet", slug: "frutilla", nombre: "Frutilla", estado: "disponible" },
  { tipo: "gourmet", slug: "chocolate", nombre: "Chocolate", estado: "disponible" },
  { tipo: "gourmet", slug: "uva", nombre: "Uva", estado: "disponible" },
  { tipo: "xl", slug: "oreo", nombre: "Oreo", estado: "disponible" },
];
const ahora = new Date("2026-10-20T15:00:00Z");
const base = (p: Partial<PedidoEntrada>): PedidoEntrada => ({ modalidad: "otro_dia", lineas: [], entrega: "retiro", fechaEntrega: "2026-10-21", hora: "15:00", nombre: "Kiosco", ...p });
const promo = { titulo: "100 heladitos", minimo: 100, sabores: null as string[] | null };

describe("promo armada en la web", () => {
  it("pide el mínimo de heladitos (los XL no cuentan)", () => {
    const r = validarPedido(base({ lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 75 }, { tipo: "xl", slug: "oreo", cantidad: 30 }] }), cat, { ahora, promo });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0]).toContain("Te faltan 25");
  });
  it("acepta el mínimo o más, mezclando sabores y sumando XL", () => {
    const r = validarPedido(base({ lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 60 }, { tipo: "gourmet", slug: "uva", cantidad: 65 }, { tipo: "xl", slug: "oreo", cantidad: 5 }] }), cat, { ahora, promo });
    expect(r.ok).toBe(true);
  });
  it("solo deja los sabores de la promo si la dueña eligió algunos", () => {
    const r = validarPedido(base({ lineas: [{ tipo: "gourmet", slug: "frutilla", cantidad: 50 }, { tipo: "gourmet", slug: "uva", cantidad: 50 }] }), cat, { ahora, promo: { ...promo, sabores: ["frutilla", "chocolate"] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain("Uva no entra");
  });
  it("precio de promo por heladito, sin cobrar nunca más que la escala; XL a precio normal", () => {
    const c = calcularPedido([{ tipo: "gourmet", sabor: "Frutilla", cantidad: 100 }, { tipo: "xl", sabor: "Oreo", cantidad: 5 }], esc, 50, { precioPromoGourmet: 1800 });
    expect(c.precioGourmet).toBe(1800);
    expect(c.total).toBe(100 * 1800 + 5 * 7000);
    expect(c.sena).toBe(108000);
    const caro = calcularPedido([{ tipo: "gourmet", sabor: "Frutilla", cantidad: 100 }], esc, 50, { precioPromoGourmet: 2500 });
    expect(caro.precioGourmet).toBe(2000);
  });
  it("el mensaje dice qué promo es", () => {
    const lineas = [{ tipo: "gourmet" as const, sabor: "Frutilla", cantidad: 100 }];
    const m = mensajePedido({ modalidad: "otro_dia", lineas, calculo: calcularPedido(lineas, esc, 50), senaPorcentaje: 50, entrega: "retiro", fechaEntrega: "2026-10-21", nombre: "Kiosco", promo: { titulo: "100 heladitos" } });
    expect(m.split("\n")[0]).toBe('¡Hola, Montana Helados! Quiero la promo "100 heladitos" para otro día:');
    expect(m).toContain("Total: 100 heladitos a G. 2.000 c/u = G. 200.000");
  });
});

import { repartirSurtido, textoReparto } from "@/lib/surtido";
import { saboresParaSurtido } from "@/lib/pedido";

describe("promo de paquete surtido", () => {
  const nueve = ["Mburukuja", "Dulce de Leche", "Chocolate", "Menta", "Frutilla", "Crema Americana", "Pistacho", "Leche Condensada", "Uva"];
  it("100 en 9 sabores: 11 de cada uno y 1 más en el primero", () => {
    const r = repartirSurtido(100, nueve);
    expect(r.reduce((a, x) => a + x.cantidad, 0)).toBe(100);
    expect(r[0].cantidad).toBe(12);
    expect(r.slice(1).every((x) => x.cantidad === 11)).toBe(true);
    expect(textoReparto(100, 9)).toBe("11 de cada uno y 1 más para completar 100");
    expect(textoReparto(200, 8)).toBe("25 de cada uno");
  });
  it("precio por paquete; los XL aparte a precio normal", () => {
    const lineas = [...repartirSurtido(200, nueve).map((x) => ({ tipo: "gourmet" as const, ...x })), { tipo: "xl" as const, sabor: "Oreo", cantidad: 5 }];
    const c = calcularPedido(lineas, esc, 50, { surtido: { paquetes: 2, unidades: 100, precioPaquete: 200000 } });
    expect(c.unidadesGourmet).toBe(200);
    expect(c.subtotalGourmet).toBe(400000);
    expect(c.total).toBe(400000 + 5 * 7000);
  });
  it("no deja elegir heladitos sueltos y pide cantidad de paquetes", () => {
    const surt = { titulo: "Surtido 100", minimo: 100, sabores: null, surtido: true };
    expect(validarPedido(base({ lineas: [{ tipo: "gourmet", slug: "uva", cantidad: 10 }], paquetesSurtido: 1 }), cat, { ahora, promo: surt }).ok).toBe(false);
    expect(validarPedido(base({ lineas: [] }), cat, { ahora, promo: surt }).ok).toBe(false);
    expect(validarPedido(base({ lineas: [{ tipo: "xl", slug: "oreo", cantidad: 3 }], paquetesSurtido: 2 }), cat, { ahora, promo: surt }).ok).toBe(true);
  });
  it("sabores del surtido: para hoy solo los disponibles", () => {
    const c2: ItemCatalogo[] = [...cat, { tipo: "gourmet", slug: "menta", nombre: "Menta", estado: "hoy_no_hay" }, { tipo: "gourmet", slug: "pistacho", nombre: "Pistacho", estado: "agotado" }];
    expect(saboresParaSurtido(c2, "hoy")).toEqual(["Frutilla", "Chocolate", "Uva"]);
    expect(saboresParaSurtido(c2, "otro_dia")).toEqual(["Frutilla", "Chocolate", "Uva", "Menta"]);
  });
  it("el mensaje dice solo los paquetes y el precio (sin sabores)", () => {
    const lineas = repartirSurtido(100, nueve).map((x) => ({ tipo: "gourmet" as const, ...x }));
    const surtido = { paquetes: 1, unidades: 100, precioPaquete: 200000 };
    const m = mensajePedido({ modalidad: "otro_dia", lineas, calculo: calcularPedido(lineas, esc, 50, { surtido }), senaPorcentaje: 50, entrega: "retiro", fechaEntrega: "2026-11-13", hora: "10:00", nombre: "Kiosco", promo: { titulo: "Surtido 100" }, surtido: { ...surtido, sabores: nueve } });
    expect(m).toContain("- 1 paquete de 100 heladitos (100 en total) a G. 200.000 c/u = G. 200.000");
    expect(m).not.toContain("Mburukuja");
    expect(m).toContain("Total estimado: G. 200.000");
  });
});
