// Cálculo único de precios, compartido entre el armador (cliente) y la API (servidor).
// Los escalones vienen de la tabla escalon_precio: nunca hay precios fijos en el código.

export type Producto = "gourmet" | "xl";
export type Escalon = { producto: Producto; desde: number; precio: number };
export type Linea = { tipo: Producto; sabor: string; cantidad: number };

export type ResultadoPedido = {
  unidadesGourmet: number;
  precioGourmet: number;
  subtotalGourmet: number;
  unidadesXl: number;
  precioXl: number;
  subtotalXl: number;
  total: number;
  sena: number;
};

/** Precio por unidad: el escalón con mayor "desde" que no supere las unidades totales del producto. */
export function precioUnitario(escalones: Escalon[], prod: Producto, unidades: number): number {
  const delProducto = escalones.filter((e) => e.producto === prod).sort((a, b) => a.desde - b.desde);
  if (!delProducto.length || delProducto[0].desde !== 1) {
    throw new Error(`Falta el escalón "desde 1" de ${prod}`);
  }
  let precio = delProducto[0].precio;
  for (const e of delProducto) if (e.desde <= Math.max(unidades, 1)) precio = e.precio;
  return precio;
}

/** Redondea a 1.000, mitad hacia arriba. */
export function redondearMil(n: number): number {
  return Math.floor(n / 1000 + 0.5) * 1000;
}

export function calcularSena(total: number, porcentaje: number): number {
  return redondearMil((total * porcentaje) / 100);
}

export function calcularPedido(lineas: Linea[], escalones: Escalon[], senaPorcentaje: number): ResultadoPedido {
  const suma = (t: Producto) => lineas.filter((l) => l.tipo === t).reduce((a, l) => a + l.cantidad, 0);
  const unidadesGourmet = suma("gourmet");
  const unidadesXl = suma("xl");
  const precioGourmet = precioUnitario(escalones, "gourmet", unidadesGourmet);
  const precioXl = precioUnitario(escalones, "xl", unidadesXl);
  const subtotalGourmet = unidadesGourmet * precioGourmet;
  const subtotalXl = unidadesXl * precioXl;
  const total = subtotalGourmet + subtotalXl;
  return {
    unidadesGourmet,
    precioGourmet,
    subtotalGourmet,
    unidadesXl,
    precioXl,
    subtotalXl,
    total,
    sena: calcularSena(total, senaPorcentaje),
  };
}
