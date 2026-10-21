// Fotos fijas de la web que la dueña puede cambiar desde el panel ("Textos y fotos").
// Las de sabores, XL y promos se cambian en sus propios módulos. Se guardan en ajustes.fotos_web.

export type FotoWeb = { clave: string; etiqueta: string; donde: string; original: string; alt: string; ayuda: string; uso?: "compartir" };

export const FOTOS_WEB: FotoWeb[] = [
  { clave: "reventa", etiqueta: "Foto de Reventa", donde: "Sección Reventa, al lado de los precios", original: "/fotos/heladitos.webp", alt: "Conservadora llena de heladitos ordenados por sabor", ayuda: "Mejor vertical o cuadrada." },
  { clave: "xl_foto1", etiqueta: "Helados XL: foto 1", donde: "Sección Helados XL, la primera foto", original: "/fotos/IMG_2277.webp", alt: "Helado XL de Oreo cortado al medio, con galletitas trituradas", ayuda: "Vertical. Se recorta en formato 3 × 4." },
  { clave: "xl_foto2", etiqueta: "Helados XL: foto 2", donde: "Sección Helados XL, la segunda foto", original: "/fotos/IMG_2223.webp", alt: "Helado XL cortado, cremoso por dentro", ayuda: "Vertical. Se recorta en formato 3 × 4." },
  { clave: "hanna", etiqueta: "Foto de Hanna", donde: "Sección Hanna y página de error", original: "/fotos/hanna-circulo.webp", alt: "Hanna, la golden de la familia, festejando su cumpleaños", ayuda: "Se recorta en círculo: que Hanna quede en el centro." },
  { clave: "compartir", etiqueta: "Imagen para compartir", donde: "La que aparece al mandar el link por WhatsApp, Instagram o Facebook", original: "/compartir.jpg", alt: "Montana Helados", ayuda: "Horizontal. Se recorta a 1200 × 630.", uso: "compartir" },
];

export type FotosGuardadas = Record<string, { ruta?: string; alt?: string }>;

export function fotosFinales(guardadas: unknown): Record<string, { src: string; alt: string }> {
  const g = (guardadas && typeof guardadas === "object" ? guardadas : {}) as FotosGuardadas;
  return Object.fromEntries(FOTOS_WEB.map((f) => [f.clave, { src: g[f.clave]?.ruta || f.original, alt: g[f.clave]?.alt?.trim() || f.alt }]));
}

export function fotosParaPanel(guardadas: unknown) {
  const g = (guardadas && typeof guardadas === "object" ? guardadas : {}) as FotosGuardadas;
  return FOTOS_WEB.map((f) => ({ ...f, ruta: g[f.clave]?.ruta ?? "", altGuardado: g[f.clave]?.alt ?? "" }));
}

export const esClaveFoto = (k: string) => FOTOS_WEB.some((f) => f.clave === k);
