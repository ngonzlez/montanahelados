import { describe, it, expect, beforeEach } from "vitest";
import { permitido, ipDeCabeceras, _reiniciarLimites } from "@/lib/limite";

beforeEach(() => _reiniciarLimites());

describe("límite de pedidos", () => {
  it("frena a la misma IP después de 8 pedidos en 10 minutos", () => {
    const t = 1_000_000;
    for (let i = 0; i < 8; i++) expect(permitido("1.1.1.1", { ahora: t + i })).toBe(true);
    expect(permitido("1.1.1.1", { ahora: t + 9 })).toBe(false);
    expect(permitido("1.1.1.1", { ahora: t + 10 * 60_000 + 10 })).toBe(true);
  });
  it("tope general por minuto aunque cambien las IP", () => {
    const t = 5_000_000;
    for (let i = 0; i < 60; i++) expect(permitido(`ip-${i}`, { ahora: t })).toBe(true);
    expect(permitido("otra", { ahora: t })).toBe(false);
  });
  it("muchas IP falsas no reinician el límite de las demás", () => {
    const t = 9_000_000;
    for (let i = 0; i < 8; i++) permitido("victima", { ahora: t });
    for (let i = 0; i < 6000; i++) permitido(`falsa-${i}`, { ahora: t + 1 + i * 1000 });
    expect(permitido("victima", { ahora: t + 5 * 60_000 })).toBe(false);
  });
});

describe("IP detrás del proxy", () => {
  it("usa x-real-ip, si no el último valor de x-forwarded-for", () => {
    expect(ipDeCabeceras(new Headers({ "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.2.3.4, 8.8.8.8" }))).toBe("8.8.8.8");
    expect(ipDeCabeceras(new Headers({ "x-forwarded-for": "10.0.0.1, 9.9.9.9" }))).toBe("9.9.9.9");
  });
});
