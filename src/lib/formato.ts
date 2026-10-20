// Formatos de la interfaz: "G. 125.000", "0986 759 890", fechas dd/mm/aaaa.

export function gs(n: number): string {
  return "G. " + Math.round(n).toLocaleString("es-PY");
}

export function telefonoVisible(internacional: string): string {
  const local = internacional.replace(/^595/, "0");
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

export function fechaVisible(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "a coordinar";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
