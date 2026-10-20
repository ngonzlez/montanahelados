import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import PaginaSimple from "@/components/PaginaSimple";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Condiciones · Montana Helados", alternates: { canonical: "/terminos" } };

export default async function Terminos() {
  const condiciones = await db.select().from(s.condicion).where(eq(s.condicion.visible, true)).orderBy(asc(s.condicion.orden));
  return (
    <PaginaSimple titulo="Condiciones de los pedidos">
      <p>Así trabajamos cada pedido de heladitos y Helados XL.</p>
      <ul>{condiciones.map((c) => <li key={c.id}>{c.titulo ? <b>{c.titulo}: </b> : null}{c.texto}</li>)}</ul>
      <p>Los precios de la web son por unidad y bajan según la cantidad. El pedido queda confirmado cuando te respondemos por WhatsApp y recibimos la seña.</p>
    </PaginaSimple>
  );
}
