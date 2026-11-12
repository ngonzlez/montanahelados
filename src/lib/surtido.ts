// Paquete surtido: la dueña arma el paquete con todos los sabores disponibles, repartidos parejo.
// Ejemplo: 100 heladitos en 9 sabores → 11 de cada uno y 1 más en el primero (como lo preparan ellas).

export type Reparto = { sabor: string; cantidad: number }[];

/** Reparte `total` heladitos entre los sabores, lo más parejo posible; los que sobran van a los primeros. */
export function repartirSurtido(total: number, sabores: string[]): Reparto {
  if (!sabores.length || total <= 0) return [];
  const base = Math.floor(total / sabores.length), resto = total % sabores.length;
  return sabores.map((sabor, i) => ({ sabor, cantidad: base + (i < resto ? 1 : 0) }));
}

/** "unos 11 de cada uno" o "22 de cada uno" si sale justo. */
export function textoReparto(total: number, nSabores: number): string {
  if (!nSabores) return "";
  const base = Math.floor(total / nSabores), resto = total % nSabores;
  if (!resto) return `${base} de cada uno`;
  return `${base} de cada uno y ${resto} más para completar ${total}`;
}
