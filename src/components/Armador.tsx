"use client";
// "Armá tu pedido": mismo funcionamiento que el prototipo aprobado, pero los precios salen de
// escalon_precio y el pedido se guarda en el servidor antes de abrir WhatsApp.
import { useEffect, useMemo, useRef, useState } from "react";
import { calcularPedido, type Escalon, type Linea } from "@/lib/precios";
import { mensajePedido, AVISO_ABIERTO } from "@/lib/whatsapp";
import { gs } from "@/lib/formato";
import { mananaISO } from "@/lib/fechas";
import arte from "@/content/arte.json";

type Estado = "disponible" | "hoy_no_hay" | "agotado" | "oculto";
export type ItemArmador = { slug: string; nombre: string; detalle?: string; foto: string | null; estado: Estado };

type Props = {
  sabores: ItemArmador[];
  xl: ItemArmador[];
  escalones: Escalon[];
  senaPorcentaje: number;
  paquete: number;
  pasoAnticipado: number;
  atajosGourmet: number[];
  atajosXl: number[];
};

type Modo = "otro_dia" | "hoy";
const avisar = (t: string) => window.dispatchEvent(new CustomEvent("mh:aviso", { detail: t }));

export default function Armador(p: Props) {
  const [modo, setModo] = useState<Modo>("otro_dia");
  const [cant, setCant] = useState<Record<string, number>>({});
  const [nombre, setNombre] = useState("");
  const [entrega, setEntrega] = useState<"retiro" | "bolt">("retiro");
  const [fecha, setFecha] = useState("");
  const [conFactura, setConFactura] = useState(false);
  const [fac, setFac] = useState({ nombre_apellido: "", ruc: "", correo: "" });
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ codigo: string; enlace: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [minFecha, setMinFecha] = useState("");
  const modoRef = useRef(modo);
  modoRef.current = modo;

  useEffect(() => setMinFecha(mananaISO()), []);
  // si cambia el pedido después de abrir WhatsApp, el aviso de "listo" ya no corresponde
  useEffect(() => setListo(null), [cant, entrega, fecha, conFactura]);

  const clave = (t: "g" | "x", slug: string) => `${t}:${slug}`;
  const sePuede = (it: ItemArmador, m: Modo) => it.estado === "disponible" || (m === "otro_dia" && it.estado === "hoy_no_hay");

  const sumar = (t: "g" | "x", slug: string, n: number) =>
    setCant((c) => ({ ...c, [clave(t, slug)]: Math.max(0, (c[clave(t, slug)] ?? 0) + n) }));

  // "Sumar 25" desde las tarjetas de sabores
  useEffect(() => {
    const f = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      const it = p.sabores.find((s) => s.slug === slug);
      if (!it) return;
      if (!sePuede(it, modoRef.current)) return avisar(`Hoy no hay ${it.nombre}. Probá con "Para otro día".`);
      sumar("g", slug, p.paquete);
      avisar(`Sumaste ${p.paquete} de ${it.nombre} a tu pedido`);
    };
    window.addEventListener("mh:sumar", f);
    return () => window.removeEventListener("mh:sumar", f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.sabores, p.paquete]);

  function cambiarModo(m: Modo) {
    setModo(m);
    setListo(null);
    if (m === "hoy") {
      let quitados = 0;
      setCant((c) => {
        const n: Record<string, number> = { ...c };
        for (const it of p.sabores) {
          const k = clave("g", it.slug), v = n[k] ?? 0;
          if (!v) continue;
          if (!sePuede(it, "hoy")) { n[k] = 0; quitados++; }
          else if (v % p.paquete) n[k] = Math.ceil(v / p.paquete) * p.paquete;
        }
        for (const it of p.xl) if (!sePuede(it, "hoy")) n[clave("x", it.slug)] = 0;
        return n;
      });
      setTimeout(() => quitados && avisar("Sacamos los sabores que hoy no hay"), 0);
    }
  }

  const lineas: Linea[] = useMemo(
    () => [
      ...p.sabores.map((s) => ({ tipo: "gourmet" as const, sabor: s.nombre, cantidad: cant[clave("g", s.slug)] ?? 0 })),
      ...p.xl.map((s) => ({ tipo: "xl" as const, sabor: s.nombre, cantidad: cant[clave("x", s.slug)] ?? 0 })),
    ].filter((l) => l.cantidad > 0),
    [cant, p.sabores, p.xl],
  );
  const c = calcularPedido(lineas, p.escalones, p.senaPorcentaje);
  const vacio = lineas.length === 0;

  const escG = p.escalones.filter((e) => e.producto === "gourmet").sort((a, b) => a.desde - b.desde);
  const escX = p.escalones.filter((e) => e.producto === "xl").sort((a, b) => a.desde - b.desde);
  const tope = escG[escG.length - 1]?.desde ?? 100;
  const siguienteG = escG.find((e) => e.desde > c.unidadesGourmet);
  const siguienteX = escX.find((e) => e.desde > c.unidadesXl);

  let nota = "";
  if (c.unidadesGourmet) {
    nota = `${c.unidadesGourmet} heladitos a ${gs(c.precioGourmet)} cada uno.`;
    if (modo === "hoy") { const n = c.unidadesGourmet / p.paquete; nota += ` Son ${n} paquete${n > 1 ? "s" : ""} de ${p.paquete}.`; }
    nota += siguienteG ? ` Sumá ${siguienteG.desde - c.unidadesGourmet} más y cada uno te sale ${gs(siguienteG.precio)}.` : " Tenés el mejor precio.";
  } else if (escG.length > 1) {
    nota = escG.slice(1).map((e, i) => `${i ? "y desde" : "Desde"} ${e.desde} heladitos cada uno sale ${gs(e.precio)}`).join(", ") + ".";
  }
  if (c.unidadesXl && siguienteX) nota += ` Con ${siguienteX.desde - c.unidadesXl} XL más, cada XL te sale ${gs(siguienteX.precio)}.`;

  const partes: string[] = [];
  if (c.unidadesGourmet) partes.push(`Heladitos: ${gs(c.subtotalGourmet)}`);
  if (c.unidadesXl) partes.push(`XL: ${gs(c.subtotalXl)}`);
  if (c.unidadesGourmet && c.unidadesXl) partes.push(`Total: ${gs(c.total)}`);
  if (!vacio) partes.push(`Seña ${p.senaPorcentaje} %: ${gs(c.sena)}`);

  const mensaje = mensajePedido({
    modalidad: modo, lineas, calculo: c, senaPorcentaje: p.senaPorcentaje, entrega,
    fechaEntrega: fecha || "", nombre, factura: conFactura ? fac : null,
  });

  async function mandar() {
    if (vacio || enviando) return;
    setErrores([]);
    if (!nombre.trim()) return setErrores(["Escribí tu nombre o el de tu negocio."]);
    if (modo === "otro_dia" && !fecha) return setErrores(["Elegí para qué día es el pedido."]);
    if (conFactura) {
      const e: string[] = [];
      if (fac.nombre_apellido.trim().length < 3) e.push("Para la factura falta el nombre y apellido.");
      if (!/^\d{1,8}-\d$/.test(fac.ruc.trim())) e.push("El RUC va con guion y dígito verificador, por ejemplo 1234567-8.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fac.correo.trim())) e.push("Revisá el correo para la factura.");
      if (e.length) return setErrores(e);
    }
    setEnviando(true);
    // Se abre la pestaña antes de esperar al servidor para que el navegador no la bloquee.
    const ventana = window.open("", "_blank");
    if (ventana) ventana.opener = null;
    try {
      const r = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modalidad: modo,
          lineas: [
            ...p.sabores.map((s) => ({ tipo: "gourmet", slug: s.slug, cantidad: cant[clave("g", s.slug)] ?? 0 })),
            ...p.xl.map((s) => ({ tipo: "xl", slug: s.slug, cantidad: cant[clave("x", s.slug)] ?? 0 })),
          ].filter((l) => l.cantidad > 0),
          entrega,
          fechaEntrega: modo === "otro_dia" ? fecha : undefined,
          nombre,
          factura: conFactura ? fac : null,
          sitio_web: trampa || undefined,
        }),
      });
      const d = await r.json();
      if (!d.ok) {
        ventana?.close();
        setErrores(d.errores ?? ["No pudimos guardar el pedido. Probá de nuevo o escribinos por WhatsApp."]);
        return;
      }
      if (ventana) ventana.location.href = d.enlace;
      else window.location.href = d.enlace;
      setListo({ codigo: d.codigo, enlace: d.enlace });
    } catch {
      ventana?.close();
      setErrores(["No hay conexión. Probá de nuevo o usá Copiar mensaje y mandalo por WhatsApp."]);
    } finally {
      setEnviando(false);
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(mensaje).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1600); }, () => {});
  }

  const fila = (t: "g" | "x", it: ItemArmador, atajos: number[]) => {
    const k = clave(t, it.slug), v = cant[k] ?? 0, ok = sePuede(it, modo);
    const paso = t === "g" ? (modo === "hoy" ? p.paquete : p.pasoAnticipado) : 1;
    const id = `${t}-${it.slug}`;
    const estado = it.estado === "agotado" ? "Agotado" : !ok ? "Hoy no hay" : "";
    return (
      <div key={k} className={`fila-sabor ${t}${v > 0 ? " con" : ""}${!ok ? " no" : ""}`}>
        {it.foto ? <img className="mini" alt="" loading="lazy" decoding="async" src={it.foto} /> : <span className="mini" />}
        <span className="nombre" id={`${id}-n`}>
          {it.nombre}
          {it.detalle ? <small>{it.detalle}</small> : null}
          {estado ? <small className="estado-fila">{estado}</small> : (
            <span className="atajos">
              {atajos.map((n) => (
                <button key={n} type="button" onClick={() => sumar(t, it.slug, n)} aria-label={`Sumar ${n} de ${it.nombre}`}>+{n}</button>
              ))}
            </span>
          )}
        </span>
        <span className="contador">
          <button type="button" aria-label={`Quitar de ${it.nombre}`} onClick={() => sumar(t, it.slug, -paso)} disabled={!v}>−</button>
          <output id={id} aria-labelledby={`${id}-n`}>{v}</output>
          <button type="button" aria-label={`Sumar ${it.nombre}`} onClick={() => sumar(t, it.slug, paso)} disabled={!ok}>+</button>
        </span>
      </div>
    );
  };

  const xlPrecios = escX.map((e, i) => (i === 0 ? `${gs(e.precio)} cada uno` : `${e.desde} o más: ${gs(e.precio)}`)).join(" · ");

  return (
    <div className="arma-grid">
      <div className="arma-listas">
        <div className="modo" role="radiogroup" aria-label="¿Para cuándo es el pedido?">
          <button type="button" role="radio" aria-checked={modo === "otro_dia"} onClick={() => cambiarModo("otro_dia")}>
            Para otro día<small>pedís con 1 día o más · elegís todos los sabores</small>
          </button>
          <button type="button" role="radio" aria-checked={modo === "hoy"} onClick={() => cambiarModo("hoy")}>
            Para hoy<small>paquetes de {p.paquete}, un sabor por paquete</small>
          </button>
        </div>
        <p className="modo-nota">
          {modo === "hoy"
            ? `Para hoy: los heladitos van en paquetes de ${p.paquete}, un sabor por paquete, según lo que haya. Los XL, del sabor que quieras. Te confirmamos por WhatsApp.`
            : "Para otro día: pedís 1 día antes o más, elegís los sabores que quieras y los mezclamos."}
        </p>
        <fieldset className="lista-pedido">
          <legend>Heladitos <small>{modo === "hoy" ? `paquetes de ${p.paquete}, un sabor por paquete` : `de a ${p.pasoAnticipado}, mezclá como quieras`}</small></legend>
          <div>{p.sabores.map((s) => fila("g", s, p.atajosGourmet))}</div>
        </fieldset>
        {p.xl.length ? (
          <fieldset className="lista-pedido">
            <legend>Helados XL <small>{xlPrecios}</small></legend>
            <div>{p.xl.map((s) => fila("x", s, p.atajosXl))}</div>
          </fieldset>
        ) : null}
      </div>
      <aside className="resumen" aria-live="polite">
        <h3>Tu pedido</h3>
        <div className="resumen-items">
          {vacio ? <p className="vacio">Todavía no elegiste sabores.</p> : lineas.map((l) => (
            <span key={l.tipo + l.sabor}>{l.cantidad} {l.tipo === "xl" ? "XL" : "heladitos"} de {l.sabor}</span>
          ))}
        </div>
        <div className="escala" aria-hidden="true">
          <div className="escala-barra"><span style={{ transform: `scaleX(${Math.min(1, c.unidadesGourmet / tope)})` }} /></div>
          <div className="escala-marcas">
            {escG.map((e, i) => <span key={e.desde}>{i ? `${e.desde} u. · ` : ""}{gs(e.precio)}</span>)}
          </div>
        </div>
        <p className="resumen-nota">{nota}</p>
        <p className="resumen-total">{partes.join(" · ")}</p>
        <label htmlFor="pedido-nombre">Tu nombre</label>
        <input id="pedido-nombre" type="text" autoComplete="name" placeholder="Nombre o negocio" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <fieldset className="entrega">
          <legend>Entrega</legend>
          <label><input type="radio" name="entrega" checked={entrega === "retiro"} onChange={() => setEntrega("retiro")} /> Retiro en Reducto</label>
          <label><input type="radio" name="entrega" checked={entrega === "bolt"} onChange={() => setEntrega("bolt")} /> Bolt Envíos</label>
        </fieldset>
        {modo === "otro_dia" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="pedido-fecha">¿Para qué día?</label>
            <input id="pedido-fecha" type="date" min={minFecha} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        ) : null}
        <label className="check-factura"><input type="checkbox" checked={conFactura} onChange={(e) => setConFactura(e.target.checked)} /> Necesito factura electrónica</label>
        {conFactura ? (
          <div className="campos-factura">
            <label htmlFor="fac-nombre">Nombre y apellido</label>
            <input id="fac-nombre" type="text" autoComplete="name" maxLength={120} value={fac.nombre_apellido} onChange={(e) => setFac({ ...fac, nombre_apellido: e.target.value })} />
            <label htmlFor="fac-ruc">RUC</label>
            <input id="fac-ruc" type="text" inputMode="numeric" maxLength={12} placeholder="1234567-8" value={fac.ruc} onChange={(e) => setFac({ ...fac, ruc: e.target.value })} />
            <label htmlFor="fac-correo">Correo</label>
            <input id="fac-correo" type="email" autoComplete="email" maxLength={120} aria-describedby="ayuda-correo" value={fac.correo} onChange={(e) => setFac({ ...fac, correo: e.target.value })} />
            <small className="ayuda" id="ayuda-correo">La factura te llega a este correo.</small>
          </div>
        ) : null}
        <div className="trampa" aria-hidden="true">
          <label htmlFor="sitio-web">No completar</label>
          <input id="sitio-web" type="text" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
        </div>
        {errores.length ? <div className="errores" role="alert">{errores.map((e) => <p key={e}>{e}</p>)}</div> : null}
        <button type="button" className="boton enviar" aria-disabled={vacio || enviando} onClick={mandar}>
          <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: arte.iconos.mensaje }} />
          {enviando ? "Preparando tu pedido..." : "Mandar mi pedido por WhatsApp"}
        </button>
        <p className="legal-pedido">Al mandar el pedido aceptás las <a href="/terminos">condiciones</a>. Mirá cómo cuidamos tus datos en <a href="/privacidad">privacidad</a>.</p>
        {listo ? (
          <div className="listo" role="status">
            <p><b>{AVISO_ABIERTO}</b></p>
            <p>Tu código de pedido es <b>{listo.codigo}</b>.</p>
            <a className="boton claro" href={listo.enlace} target="_blank" rel="noopener">Abrir WhatsApp de nuevo</a>
          </div>
        ) : null}
        <button className="copiar-msg" type="button" onClick={copiar} disabled={vacio}>{copiado ? "Mensaje copiado" : "Copiar mensaje"}</button>
      </aside>
    </div>
  );
}
