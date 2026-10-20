// Panel de la dueña. La página verifica la sesión en el servidor; el panel (public/panel/panel.js)
// lee y guarda todo por /api/gestionar/*, que vuelve a verificar la sesión en cada pedido.
import { redirect } from "next/navigation";
import Script from "next/script";
import { sesionActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function Panel() {
  const s = await sesionActual();
  if (!s) redirect("/gestionar/entrar");
  return (
    <>
      <header className="top">
        <button className="btn chico" id="abrir-menu" aria-expanded="false" aria-controls="menu">Menú</button>
        <h1 id="titulo-top">Inicio</h1>
      </header>
      <div className="app">
        <nav className="menu" id="menu" aria-label="Secciones del panel">
          <div className="logo">Montana Helados<small>Panel de la dueña</small></div>
          <button data-m="inicio">Inicio</button>
          <div className="grupo">Ventas</div>
          <button data-m="pedidos">Pedidos <span className="n" id="n-pedidos" /></button>
          <div className="grupo">Productos</div>
          <button data-m="sabores">Sabores</button>
          <button data-m="xl">Helados XL</button>
          <button data-m="precios">Precios por cantidad</button>
          <button data-m="promos">Promos</button>
          <button data-m="puntos">Puntos de venta</button>
          <div className="grupo">Contenido</div>
          <button data-m="textos">Textos de la web</button>
          <div className="grupo">Sistema</div>
          <button data-m="ajustes">Ajustes</button>
          <button data-m="papelera">Papelera <span className="n" id="n-papelera" /></button>
          <a className="btn chico" href="/" target="_blank" rel="noopener" style={{ margin: "14px 10px 0", background: "var(--leche)" }}>Ver la web</a>
          <div className="quien">{s.user.email}</div>
          <button className="salir" id="salir" type="button">Salir</button>
        </nav>
        <main className="contenido" id="contenido" tabIndex={-1}><p className="cargando">Cargando…</p></main>
      </div>
      <Script src="/panel/panel.js" strategy="afterInteractive" />
    </>
  );
}
