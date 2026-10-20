import Link from "next/link";
import { Logo, Simbolos } from "./Arte";

export default function PaginaSimple({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <Simbolos />
      <main className="simple">
        <div className="wrap">
          <Link href="/" className="marca-simple" aria-label="Volver al inicio de Montana Helados"><Logo etiqueta="Montana Helados" /></Link>
          <h1>{titulo}</h1>
          <div className="texto-simple">{children}</div>
          <p style={{ marginTop: 32 }}><Link className="boton" href="/">Volver al inicio</Link></p>
        </div>
      </main>
    </>
  );
}
