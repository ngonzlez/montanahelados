// Límite simple de pedidos por IP (una sola instancia de la app; ver stack.md).
const ventanas = new Map<string, number[]>();

export function permitido(clave: string, max = 8, ventanaMs = 10 * 60_000, ahora = Date.now()): boolean {
  const lista = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= max) {
    ventanas.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.set(clave, lista);
  if (ventanas.size > 5000) ventanas.clear();
  return true;
}
