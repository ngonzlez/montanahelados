import Link from "next/link";
import "./sitio.css";

export default function NoEncontrado() {
  return (
    <main className="simple no-encontrada">
      <div className="wrap">
        <img src="/fotos/hanna-circulo.webp" alt="Hanna, la golden de la familia" />
        <h1>Esta página no existe</h1>
        <p>Hanna la buscó por todos lados y no la encontró.</p>
        <p style={{ marginTop: 24 }}><Link className="boton" href="/">Volver al inicio</Link></p>
      </div>
    </main>
  );
}
