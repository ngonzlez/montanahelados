import { describe, it, expect } from "vitest";
import { calcularPedido, precioUnitario, redondearMil, type Escalon, type Linea } from "@/lib/precios";
import seed from "@/db/seed-data.json";

const escalones = seed.escalones_precio as Escalon[];
const SENA = seed.ajustes.pedidos.sena_porcentaje;
const g = (sabor: string, cantidad: number): Linea => ({ tipo: "gourmet", sabor, cantidad });
const x = (sabor: string, cantidad: number): Linea => ({ tipo: "xl", sabor, cantidad });

// Ejemplos del PRD 7.4 / modelo-datos.json → calculos.ejemplos
describe("ejemplos del PRD", () => {
  const casos: [string, Linea[], number, number][] = [
    ["30 Frutilla + 20 Uva, anticipado", [g("Frutilla", 30), g("Uva", 20)], 125000, 63000],
    ["100 heladitos para hoy (4 paquetes)", [g("Frutilla", 25), g("Uva", 25), g("Menta", 25), g("Chocolate", 25)], 200000, 100000],
    ["25 heladitos + 5 XL", [g("Frutilla", 25), x("Oreo", 5)], 110000, 55000],
    ["30 XL Oreo", [x("Oreo", 30)], 150000, 75000],
    ["45 heladitos", [g("Pistacho", 45)], 135000, 68000],
    ["49 heladitos", [g("Pistacho", 49)], 147000, 74000],
  ];
  for (const [nombre, lineas, total, sena] of casos) {
    it(nombre, () => {
      const r = calcularPedido(lineas, escalones, SENA);
      expect(r.total).toBe(total);
      expect(r.sena).toBe(sena);
    });
  }
});

describe("escalones", () => {
  it("suman sabores para el precio", () => {
    expect(calcularPedido([g("A", 50), g("B", 50)], escalones, SENA).precioGourmet).toBe(2000);
  });
  it("bordes", () => {
    expect(precioUnitario(escalones, "gourmet", 49)).toBe(3000);
    expect(precioUnitario(escalones, "gourmet", 50)).toBe(2500);
    expect(precioUnitario(escalones, "gourmet", 99)).toBe(2500);
    expect(precioUnitario(escalones, "gourmet", 100)).toBe(2000);
    expect(precioUnitario(escalones, "xl", 29)).toBe(7000);
    expect(precioUnitario(escalones, "xl", 30)).toBe(5000);
  });
  it("XL no cambia el precio de los heladitos ni al revés", () => {
    const r = calcularPedido([g("A", 25), x("Oreo", 30)], escalones, SENA);
    expect(r.precioGourmet).toBe(3000);
    expect(r.precioXl).toBe(5000);
  });
  it("pide el escalón desde 1", () => {
    expect(() => precioUnitario([{ producto: "xl", desde: 30, precio: 5000 }], "xl", 1)).toThrow();
  });
  it("redondeo de seña a 1.000, mitad hacia arriba", () => {
    expect(redondearMil(62500)).toBe(63000);
    expect(redondearMil(62499)).toBe(62000);
  });
  it("pedido vacío da cero", () => {
    expect(calcularPedido([], escalones, SENA).total).toBe(0);
  });
});
