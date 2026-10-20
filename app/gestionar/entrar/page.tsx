import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion";
import FormAcceso from "@/components/acceso/FormAcceso";

export const dynamic = "force-dynamic";

export default async function Entrar() {
  if (await sesionActual()) redirect("/gestionar");
  return <main className="acceso"><FormAcceso modo="entrar" /></main>;
}
