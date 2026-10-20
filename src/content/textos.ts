// Textos de la web pública que la dueña puede cambiar desde el panel ("Textos de la web").
// Lo que no cambió usa el texto original de acá. Se guardan en ajustes.textos_web.
// En los párrafos, lo que va entre **dos asteriscos** sale en negrita.

export type Contexto = { paquete: number; sena: number };
type Campo = { clave: string; etiqueta: string; tipo: "linea" | "parrafo"; max: number; defecto: (c: Contexto) => string };
type Grupo = { id: string; titulo: string; campos: Campo[] };

const l = (clave: string, etiqueta: string, defecto: Campo["defecto"] | string, max = 80): Campo => ({ clave, etiqueta, tipo: "linea", max, defecto: typeof defecto === "string" ? () => defecto : defecto });
const p = (clave: string, etiqueta: string, defecto: Campo["defecto"] | string, max = 400): Campo => ({ clave, etiqueta, tipo: "parrafo", max, defecto: typeof defecto === "string" ? () => defecto : defecto });

export const GRUPOS_TEXTOS: Grupo[] = [
  { id: "inicio", titulo: "Inicio (lo primero que se ve)", campos: [
    l("hero_titulo", "Título grande", "Heladitos gourmet", 40),
    l("hero_subtitulo", "Subtítulo", "hechos con leche y súper cremosos", 60),
    p("hero_bajada", "Texto", (c) => `Heladitos de leche, largos y cremosos, en paquetes de ${c.paquete}. También hacemos Helados XL, más gruesos y con toppings premium. Cuantos más llevás, más barato te sale cada uno.`, 260),
  ] },
  { id: "sabores", titulo: "Sabores", campos: [
    l("sabores_titulo", "Título", "Sabores", 40),
    p("sabores_texto", "Texto", (c) => `Son largos (19 a 20 cm) y se entregan bien congelados. Tocá "Sumar ${c.paquete}" en el sabor que te guste.`, 220),
  ] },
  { id: "promos", titulo: "Promos", campos: [
    l("promos_titulo", "Título", "Promos", 40),
    p("promos_texto", "Texto", "Las promos vigentes. Tocá la que te guste y te armamos el mensaje para WhatsApp.", 220),
  ] },
  { id: "xl", titulo: "Helados XL", campos: [
    l("xl_etiqueta", "Etiqueta chica", "Helados XL Gourmet", 40),
    l("xl_titulo", "Título", "Más gruesos, con toppings premium", 60),
    p("xl_texto", "Texto", "Una presentación más gruesa que la tradicional, con toppings premium. Hechos a mano.", 220),
    l("xl_pie1", "Leyenda de la foto 1", "Así se ve por dentro", 40),
    l("xl_pie2", "Leyenda de la foto 2", "Con toppings premium", 40),
  ] },
  { id: "arma", titulo: "Armá tu pedido", campos: [
    l("arma_titulo", "Título", "Armá tu pedido", 40),
    p("arma_texto", "Texto", '**1.** Elegí para cuándo. **2.** Tocá **+** en los sabores que querés. **3.** Tocá "Mandar mi pedido" y se abre WhatsApp con todo escrito.', 260),
  ] },
  { id: "pedir", titulo: "Cómo pedir", campos: [
    l("pedir_titulo", "Título", "Cómo pedir", 40),
    p("pedir_texto", "Texto", "Así organizamos cada pedido para que tus heladitos lleguen bien congelados.", 200),
    l("paso1_titulo", "Paso 1: título", "Escribinos", 50),
    p("paso1_texto", "Paso 1: texto", "Armá tu pedido acá arriba, o mandanos un WhatsApp con los sabores y cuántos querés.", 240),
    l("paso2_titulo", "Paso 2: título", "¿Para hoy o para otro día?", 50),
    p("paso2_texto", "Paso 2: texto", (c) => `Para hoy: paquetes de ${c.paquete} de un solo sabor y los XL. Para otro día (pedís 1 día antes): elegís los sabores que quieras y la cantidad que quieras.`, 240),
    l("paso3_titulo", "Paso 3: título", (c) => `Seña del ${c.sena} %`, 50),
    p("paso3_texto", "Paso 3: texto", (c) => `Pagás ${c.sena === 50 ? "la mitad" : `el ${c.sena} %`} y tu pedido queda anotado. El resto lo pagás por transferencia antes de que salga el pedido. Si cancelás, la seña no se devuelve.`, 240),
    l("paso4_titulo", "Paso 4: título", "Pasás a buscar o te lo mandamos", 50),
    p("paso4_texto", "Paso 4: texto", "Podés pasar a buscar (traé tu conservadora) o te lo enviamos por Bolt. El envío se le paga al conductor; los heladitos se pagan antes, por transferencia.", 240),
    l("paso5_titulo", "Paso 5: título", "Cuidalos del calor", 50),
    p("paso5_texto", "Paso 5: texto", "Salen bien congelados. Son de leche: no dejes que se descongelen del todo, porque se cortan. Si se ablandan en el viaje, que no pierdan todo el frío.", 240),
    p("aviso_ubicacion", "Aviso de ubicación", "Pedinos la ubicación exacta antes de hacer el pago.", 160),
    p("aviso_factura", "Aviso de factura", "**¿Necesitás factura electrónica?** Pasanos nombre y apellido, RUC y correo. La factura te llega al correo.", 200),
  ] },
  { id: "reventa", titulo: "Reventa", campos: [
    l("reventa_etiqueta", "Etiqueta chica", "Para kioscos y almacenes", 40),
    l("reventa_titulo", "Título", (c) => `Reventa por paquete de ${c.paquete}`, 50),
    p("reventa_texto", "Texto", "Cuantos más heladitos llevás, menos pagás por cada uno.", 200),
    p("reventa_nota", "Nota debajo de los precios", (c) => `**Para hoy:** paquetes de ${c.paquete} de un solo sabor, según lo que haya. **Para otro día:** elegís los sabores que quieras y los mezclamos.`, 260),
  ] },
  { id: "puntos", titulo: "Puntos de venta", campos: [
    l("puntos_titulo", "Título", "¿Querés uno solo?", 40),
    p("puntos_texto", "Texto", "Compralos sueltos en estos locales. Tocá el que te queda más cerca y se abre el mapa.", 200),
  ] },
  { id: "hanna", titulo: "Hanna", campos: [
    l("hanna_titulo", "Título", "Te presentamos a Hanna", 40),
    p("hanna_texto", "Texto", "Hanna es la golden de la familia y la inspiración detrás de Montana Helados. Si ves una patita por la web, pasó ella.", 300),
    l("hanna_globo", "Globito de la foto", "¡Hola, soy Hanna!", 30),
  ] },
  { id: "pie", titulo: "Pie de página", campos: [
    p("pie_texto", "Frase", "Heladitos gourmet hechos con leche, en San Lorenzo.", 120),
    l("pie_ubicacion", "Dónde estamos", "San Lorenzo, barrio Reducto.", 60),
    l("pie_entregas", "Entregas", "Pasás a buscar o te lo mandamos por Bolt", 80),
  ] },
  { id: "google", titulo: "Cómo aparece en Google y al compartir", campos: [
    l("seo_titulo", "Título de la pestaña", "Montana Helados · Heladitos gourmet en San Lorenzo", 70),
    p("seo_descripcion", "Descripción", "Heladitos gourmet hechos con leche, en paquetes de 25 para reventa, y Helados XL. Armá tu pedido y mandalo por WhatsApp.", 160),
  ] },
];

const CAMPOS = new Map(GRUPOS_TEXTOS.flatMap((g) => g.campos.map((c) => [c.clave, c] as const)));
export type ClaveTexto = string;

export function esClaveTexto(k: string) {
  return CAMPOS.has(k);
}
export function maxTexto(k: string) {
  return CAMPOS.get(k)?.max ?? 0;
}

/** Textos finales: lo que guardó la dueña o, si no hay, el original. */
export function textosFinales(guardados: unknown, c: Contexto): Record<string, string> {
  const g = (guardados && typeof guardados === "object" ? guardados : {}) as Record<string, unknown>;
  const r: Record<string, string> = {};
  for (const [k, campo] of CAMPOS) {
    const v = g[k];
    r[k] = typeof v === "string" && v.trim() ? v.trim() : campo.defecto(c);
  }
  return r;
}

/** Para el panel: cada campo con su valor guardado (vacío si usa el original) y el original. */
export function textosParaPanel(guardados: unknown, c: Contexto) {
  const g = (guardados && typeof guardados === "object" ? guardados : {}) as Record<string, unknown>;
  return GRUPOS_TEXTOS.map((gr) => ({
    id: gr.id,
    titulo: gr.titulo,
    campos: gr.campos.map((f) => ({ clave: f.clave, etiqueta: f.etiqueta, tipo: f.tipo, max: f.max, valor: typeof g[f.clave] === "string" ? (g[f.clave] as string) : "", original: f.defecto(c) })),
  }));
}
