import { describe, it, expect } from "vitest";
import { mensajePedido, enlaceWhatsapp } from "@/lib/whatsapp";
import { calcularPedido, type Escalon } from "@/lib/precios";
import seed from "@/db/seed-data.json";

const esc = seed.escalones_precio as Escalon[];

describe("mensaje de WhatsApp", () => {
  const lineas = [
    { tipo: "gourmet" as const, sabor: "Frutilla", cantidad: 30 },
    { tipo: "gourmet" as const, sabor: "Uva", cantidad: 20 },
  ];
  const m = mensajePedido({
    modalidad: "otro_dia", lineas, calculo: calcularPedido(lineas, esc, 50), senaPorcentaje: 50,
    entrega: "bolt", fechaEntrega: "2026-10-22", nombre: "Ana", codigo: "MH-0007",
    factura: { nombre_apellido: "Ana Pérez", ruc: "", correo: "ana@ejemplo.com" },
  });
  it("tiene totales, seña, fecha y código", () => {
    expect(m).toContain("Total: 50 heladitos a G. 2.500 c/u = G. 125.000");
    expect(m).toContain("Seña 50 %: G. 63.000");
    expect(m).toContain("Para el día: 22/10/2026");
    expect(m).toContain("Entrega: Bolt Envíos");
    expect(m).toContain("Código: MH-0007");
    expect(m).toContain("RUC: (completar)");
  });
  it("nunca dice enviado", () => {
    expect(m.toLowerCase()).not.toContain("enviado");
  });
  it("enlace wa.me", () => {
    expect(enlaceWhatsapp("595986759890", "hola y chau")).toBe("https://wa.me/595986759890?text=hola%20y%20chau");
  });
});
