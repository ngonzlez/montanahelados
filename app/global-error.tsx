"use client";

// Último recurso si falla el layout: sin estilos de la app, texto simple.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-PY">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FCF1DA", color: "#6B2219", padding: 32, textAlign: "center" }}>
        <h1>Algo se derritió</h1>
        <p>No pudimos cargar la página. Probá de nuevo en un ratito o escribinos por WhatsApp al 0986 759 890.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 20px", borderRadius: 999, border: "3px solid #6B2219", background: "#F7D977", fontWeight: 800 }}>Probar de nuevo</button>
      </body>
    </html>
  );
}
