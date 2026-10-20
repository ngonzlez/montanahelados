"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="simple no-encontrada">
      <div className="wrap">
        <img src="/fotos/hanna-circulo.webp" alt="Hanna, la golden de la familia" />
        <h1>Algo se derritió</h1>
        <p>No pudimos cargar esta parte. Probá de nuevo en un ratito o escribinos por WhatsApp al 0986 759 890.</p>
        <p style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="boton" type="button" onClick={reset}>Probar de nuevo</button>
          <Link className="boton claro" href="/">Volver al inicio</Link>
        </p>
      </div>
    </main>
  );
}
