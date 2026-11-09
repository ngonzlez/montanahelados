// Fechas del negocio en la zona del cliente (America/Asuncion), sin depender del TZ del servidor.

export const ZONA = "America/Asuncion";

export function hoyISO(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

export function mananaISO(ahora: Date = new Date()): string {
  return sumarDias(hoyISO(ahora), 1);
}

export function esFechaISO(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [a, m, d] = v.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// ---------- días y horarios de entrega ----------
// Domingo = 0. Montana no entrega los domingos.
export const DIAS_SIN_ENTREGA = [0];
export const PASO_HORARIO_MIN = 30;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function diaSemana(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}
export const nombreDia = (iso: string) => DIAS[diaSemana(iso)];
export const hayEntrega = (iso: string) => !DIAS_SIN_ENTREGA.includes(diaSemana(iso));

/** Minutos desde la medianoche en Asunción. */
export function minutosAhora(ahora: Date = new Date()): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ahora);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return n("hour") * 60 + n("minute");
}
export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const aMinutos = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };

/** Horarios que se pueden elegir (cada 30 min, de "desde" a "hasta" inclusive). Para hoy, solo los que faltan con 30 min de margen. */
export function horariosDisponibles(desde: number, hasta: number, esHoy: boolean, ahora: Date = new Date()): string[] {
  const minimo = esHoy ? minutosAhora(ahora) + PASO_HORARIO_MIN : 0;
  const r: string[] = [];
  for (let h = desde * 60; h <= hasta * 60; h += PASO_HORARIO_MIN) if (h >= minimo) r.push(hhmm(h));
  return r;
}

/** Días que se pueden elegir para "otro día": desde mañana hasta `dias` adelante, sin los días sin entrega. */
export function diasDeEntrega(dias: number, ahora: Date = new Date()): string[] {
  const hoy = hoyISO(ahora);
  const r: string[] = [];
  for (let i = 1; i <= dias; i++) { const f = sumarDias(hoy, i); if (hayEntrega(f)) r.push(f); }
  return r;
}
