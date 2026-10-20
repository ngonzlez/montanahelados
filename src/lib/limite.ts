// Límite de pedidos por IP y tope general por minuto (una sola instancia de la app; ver stack.md).
const ventanas = new Map<string, number[]>();
let general: number[] = [];

const MAX_CLAVES = 5000;

export function permitido(
  clave: string,
  { max = 8, ventanaMs = 10 * 60_000, maxGeneralPorMinuto = 60, ahora = Date.now() } = {},
): boolean {
  general = general.filter((t) => ahora - t < 60_000);
  if (general.length >= maxGeneralPorMinuto) return false;

  const lista = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= max) {
    ventanas.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.delete(clave);
  ventanas.set(clave, lista);
  general.push(ahora);

  // Solo se borran claves vencidas: nunca se pierde el registro de una IP activa.
  // Con el tope general (60 por minuto) el mapa no pasa de ~600 claves activas.
  if (ventanas.size > MAX_CLAVES) {
    for (const [k, v] of ventanas) if (!v.some((t) => ahora - t < ventanaMs)) ventanas.delete(k);
  }
  return true;
}

/** IP real detrás de Traefik (Coolify): x-real-ip la pone el proxy; si no, el último valor de x-forwarded-for. */
export function ipDeCabeceras(h: Headers): string {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = (h.get("x-forwarded-for") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return xff[xff.length - 1] ?? "sin-ip";
}

export function _reiniciarLimites() {
  ventanas.clear();
  general = [];
}
