// Panel de la dueña. Se construye en el paso 4 del MVP (docs/web/admin.json), detrás de Better Auth.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel · Montana Helados", robots: { index: false, follow: false } };

export default function Panel() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Panel</h1>
      <p>En construcción.</p>
    </main>
  );
}
