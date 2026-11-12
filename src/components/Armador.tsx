"use client";
// "Armá tu pedido": mismo funcionamiento que el prototipo aprobado, pero los precios salen de
// escalon_precio y el pedido se guarda en el servidor antes de abrir WhatsApp.
import { useEffect, useMemo, useRef, useState } from "react";
import { calcularPedido, type Escalon, type Linea } from "@/lib/precios";
import { mensajePedido, AVISO_ABIERTO } from "@/lib/whatsapp";
import { gs } from "@/lib/formato";
import { textoReparto } from "@/lib/surtido";
import { diasDeEntrega, hayEntrega, horariosDisponibles, hoyISO, nombreDia, sumarDias } from "@/lib/fechas";
import arte from "@/content/arte.json";

type Estado = "disponible" | "hoy_no_hay" | "agotado" | "oculto";
export type ItemArmador = { slug: string; nombre: string; detalle?: string; foto: string | null; estado: Estado };
export type PromoArmador = { id: number; titulo: string; minimo: number; precioUnidad: number | null; sabores: string[] | null; surtido: boolean; precioPaquete: number | null; detalle: string };

type Props = {
  sabores: ItemArmador[];
  xl: ItemArmador[];
  escalones: Escalon[];
  senaPorcentaje: number;
  paquete: number;
  horaDesde: number;
  horaHasta: number;
  diasMax: number;
  pasoAnticipado: number;
  atajosGourmet: number[];
  atajosXl: number[];
  promos: PromoArmador[];
};

type Modo = "otro_dia" | "hoy";
const conPunto = (t: string) => (/[.!?…]$/.test(t) ? t : `${t}.`);
/** RUC paraguayo: números y un guion antes del dígito verificador. Si escriben solo números, el guion se pone solo. */
const formatearRuc = (v: string) => {
  const limpio = v.replace(/[^\d-]/g, "").replace(/-+/g, "-");
  if (limpio.includes("-")) return limpio;
  return limpio.length >= 2 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
};
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
  const [hora, setHora] = useState("");
  // días y horarios se calculan en el navegador (dependen de la hora actual); se renuevan cada minuto
  const [ahora, setAhora] = useState<Date | null>(null);
  const [promoId, setPromoId] = useState<number | null>(null);
  const [paquetes, setPaquetes] = useState(1);
  const promo = p.promos.find((x) => x.id === promoId) ?? null;
  const modoRef = useRef(modo);
  modoRef.current = modo;
  const promoRef = useRef<PromoArmador | null>(null);
  promoRef.current = promo;

  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const dias = useMemo(() => (ahora ? diasDeEntrega(p.diasMax, ahora) : []), [ahora, p.diasMax]);
  const horasHoy = ahora ? horariosDisponibles(p.horaDesde, p.horaHasta, true, ahora) : [];
  const hoySePuede = !!ahora && hayEntrega(hoyISO(ahora)) && horasHoy.length > 0;
  const horas = modo === "hoy" ? horasHoy : horariosDisponibles(p.horaDesde, p.horaHasta, false);
  // si el horario elegido ya no está (pasó la hora o cambió el modo), se borra
  useEffect(() => { if (hora && ahora && !horas.includes(hora)) setHora(""); }, [hora, horas, ahora]);
  // si "para hoy" deja de ser posible (cierre o domingo), vuelve a "para otro día"
  useEffect(() => { if (ahora && modo === "hoy" && !hoySePuede) setModo("otro_dia"); }, [ahora, modo, hoySePuede]);
  // si cambia el pedido después de abrir WhatsApp, el aviso de "listo" ya no corresponde
  useEffect(() => setListo(null), [cant, entrega, fecha, hora, conFactura, promoId]);
  // los errores viejos se borran apenas el cliente corrige el pedido
  useEffect(() => setErrores([]), [cant, promoId]);

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
      const pr = promoRef.current;
      if (pr?.surtido) return avisar("En el paquete surtido los sabores van surtidos. Quitá la promo para elegir sabores.");
      if (pr?.sabores && !pr.sabores.includes(slug)) return avisar(`${it.nombre} no entra en la promo. Quitá la promo para pedirlo.`);
      sumar("g", slug, p.paquete);
      avisar(`Sumaste ${p.paquete} de ${it.nombre} a tu pedido`);
    };
    window.addEventListener("mh:sumar", f);
    return () => window.removeEventListener("mh:sumar", f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.sabores, p.paquete]);

  // "Pedir esta promo" desde la tarjeta: el armador queda con la promo puesta
  useEffect(() => {
    const f = (e: Event) => {
      const pr = p.promos.find((x) => x.id === (e as CustomEvent<number>).detail);
      if (!pr) return;
      setPromoId(pr.id);
      setErrores([]);
      if (pr.surtido) {
        // en el surtido no se eligen heladitos sueltos: se sacan los que había (los XL quedan)
        setPaquetes(1);
        setCant((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith("g:"))));
        avisar(`Paquete surtido de ${pr.minimo} heladitos. Elegí cuántos paquetes querés.`);
        return;
      }
      if (pr.sabores) {
        // si ya había sabores que no entran en la promo, se sacan
        setCant((c) => {
          const n = { ...c };
          for (const s of p.sabores) if (!pr.sabores!.includes(s.slug)) delete n[clave("g", s.slug)];
          return n;
        });
      }
      avisar(`Elegí los sabores de la promo: desde ${pr.minimo} heladitos`);
    };
    window.addEventListener("mh:promo", f);
    return () => window.removeEventListener("mh:promo", f);
  }, [p.promos, p.sabores]);

  function quitarPromo() {
    setPromoId(null);
    setErrores([]);
    avisar("Quitaste la promo. Tu pedido sigue con los precios por cantidad.");
  }

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
  const surtido = promo?.surtido && promo.precioPaquete ? { paquetes, unidades: promo.minimo, precioPaquete: promo.precioPaquete } : null;
  // sabores del surtido: los disponibles (para otro día también los de "Hoy no hay")
  const saboresSurtido = p.sabores.filter((s) => s.estado === "disponible" || (modo === "otro_dia" && s.estado === "hoy_no_hay")).map((s) => s.nombre);
  const c = calcularPedido(lineas, p.escalones, p.senaPorcentaje, { precioPromoGourmet: promo?.precioUnidad, surtido });
  const saboresVisibles = promo?.sabores ? p.sabores.filter((s) => promo.sabores!.includes(s.slug)) : p.sabores;
  const faltanPromo = promo && !surtido ? Math.max(0, promo.minimo - c.unidadesGourmet) : 0;
  const vacio = lineas.length === 0 && !surtido;

  const escG = p.escalones.filter((e) => e.producto === "gourmet").sort((a, b) => a.desde - b.desde);
  const escX = p.escalones.filter((e) => e.producto === "xl").sort((a, b) => a.desde - b.desde);
  const tope = escG[escG.length - 1]?.desde ?? 100;
  const siguienteG = escG.find((e) => e.desde > c.unidadesGourmet);
  const siguienteX = escX.find((e) => e.desde > c.unidadesXl);

  let nota = "";
  if (surtido) {
    nota = `${paquetes} paquete${paquetes > 1 ? "s" : ""} de ${promo!.minimo} heladitos surtidos: ${c.unidadesGourmet} en total.`;
  } else if (promo) {
    nota = faltanPromo
      ? `Llevás ${c.unidadesGourmet} de ${promo.minimo}. Te faltan ${faltanPromo} heladitos para la promo.`
      : `¡Listo! ${c.unidadesGourmet} heladitos a ${gs(c.precioGourmet)} cada uno. Podés sumar más sabores o Helados XL.`;
  } else if (c.unidadesGourmet) {
    nota = `${c.unidadesGourmet} heladitos a ${gs(c.precioGourmet)} cada uno.`;
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
    fechaEntrega: fecha || "", hora, nombre, factura: conFactura ? fac : null, promo,
    surtido: surtido ? { ...surtido, sabores: saboresSurtido } : null,
  });

  async function mandar() {
    if (vacio || enviando) return;
    setErrores([]);
    if (promo && faltanPromo) return setErrores([`La promo es desde ${promo.minimo} heladitos. Te faltan ${faltanPromo}.`]);
    if (!nombre.trim()) return setErrores(["Escribí tu nombre o el de tu negocio."]);
    if (modo === "otro_dia" && !fecha) return setErrores(["Elegí para qué día es el pedido."]);
    if (!hora) return setErrores([entrega === "retiro" ? "Elegí a qué hora lo retirás." : "Elegí a qué hora lo mandamos."]);
    if (conFactura) {
      const e: string[] = [];
      if (fac.nombre_apellido.trim().length < 3) e.push("Para la factura falta el nombre y apellido.");
      const ruc = formatearRuc(fac.ruc.trim());
      if (ruc !== fac.ruc) setFac((f) => ({ ...f, ruc }));
      if (!/^\d{1,8}-\d$/.test(ruc)) e.push("El RUC va con guion y dígito verificador, por ejemplo 1234567-8.");
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
          hora,
          nombre,
          factura: conFactura ? { ...fac, ruc: formatearRuc(fac.ruc.trim()) } : null,
          promoId: promo?.id,
          paquetesSurtido: surtido ? paquetes : undefined,
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
    const paso = t === "g" ? p.pasoAnticipado : 1;
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
        {promo ? (
          <div className="promo-activa" role="status">
            <span className="cinta-promo">Promo</span>
            <b>{promo.titulo}</b>
            {surtido ? (
              <>
                <p className="precio-paquete">Paquete de {promo.minimo} heladitos a {gs(surtido.precioPaquete)}</p>
                {/* lo que escribió la dueña en "Detalle"; si está vacío, una explicación automática */}
                <p>{conPunto(promo.detalle.trim() || `Van surtidos en los ${saboresSurtido.length} sabores, ${textoReparto(promo.minimo, saboresSurtido.length)}`)}</p>
                <p className="aviso-surtido"><b>Es un paquete listo:</b> va surtido con todos estos sabores. No se pueden cambiar ni sacar sabores.</p>
                <ul className="sabores-surtido" aria-label="Sabores del surtido">{saboresSurtido.map((n) => <li key={n}>{n}</li>)}</ul>
                <div className="paquetes-surtido">
                  <span id="paq-n">¿Cuántos paquetes?</span>
                  <span className="contador">
                    <button type="button" aria-label="Un paquete menos" onClick={() => setPaquetes((n) => Math.max(1, n - 1))} disabled={paquetes <= 1}>−</button>
                    <output aria-labelledby="paq-n">{paquetes}</output>
                    <button type="button" aria-label="Un paquete más" onClick={() => setPaquetes((n) => Math.min(50, n + 1))}>+</button>
                  </span>
                </div>
              </>
            ) : (
              <>
                <p>
                  Desde {promo.minimo} heladitos{promo.precioUnidad ? ` a ${gs(promo.precioUnidad)} cada uno` : ""}
                  {promo.sabores ? ", de los sabores de la lista" : ", mezclá los sabores que quieras"}. Si querés más, sumá nomás. También podés agregar Helados XL.
                </p>
                {promo.detalle.trim() ? <p>{promo.detalle.trim()}</p> : null}
              </>
            )}
            {!surtido ? <div className="promo-progreso" aria-hidden="true"><span style={{ transform: `scaleX(${Math.min(1, c.unidadesGourmet / promo.minimo)})` }} /></div> : null}
            <button type="button" className="quitar-promo" onClick={quitarPromo}>Quitar promo</button>
          </div>
        ) : null}
        <div className="modo" role="radiogroup" aria-label="¿Para cuándo es el pedido?">
          <button type="button" role="radio" aria-checked={modo === "otro_dia"} onClick={() => cambiarModo("otro_dia")}>
            Para otro día<small>pedís con 1 día o más · elegís todos los sabores</small>
          </button>
          <button type="button" role="radio" aria-checked={modo === "hoy"} onClick={() => cambiarModo("hoy")} disabled={!!ahora && !hoySePuede}>
            Para hoy<small>{!ahora || hoySePuede ? "elegís los sabores que hay hoy" : ahora && !hayEntrega(hoyISO(ahora)) ? "los domingos no hay entregas" : "por hoy ya cerramos"}</small>
          </button>
        </div>
        <p className="modo-nota">
          {modo === "hoy"
            ? `Para hoy: elegís los sabores que tenemos hoy y la cantidad que quieras. Retirás o te lo mandamos de ${p.horaDesde} a ${p.horaHasta} h. Te confirmamos por WhatsApp.`
            : "Para otro día: pedís 1 día antes o más, elegís los sabores que quieras y los mezclamos."}
        </p>
        <fieldset className="lista-pedido" hidden={!!surtido}>
          <legend>Heladitos <small>{`de a ${p.pasoAnticipado}, mezclá como quieras`}</small></legend>
          <div>{saboresVisibles.map((s) => fila("g", s, p.atajosGourmet))}</div>
        </fieldset>
        {p.xl.length ? (
          <fieldset className="lista-pedido">
            <legend>Helados XL <small>{xlPrecios}</small></legend>
            <div>{p.xl.map((s) => fila("x", s, p.atajosXl))}</div>
          </fieldset>
        ) : null}
      </div>
      <aside className="resumen" aria-live="polite">
        <h3>{promo ? "Tu pedido con promo" : "Tu pedido"}</h3>
        <div className="resumen-items">
          {surtido ? <span>{paquetes} paquete{paquetes > 1 ? "s" : ""} surtido{paquetes > 1 ? "s" : ""} de {surtido.unidades} ({c.unidadesGourmet} heladitos)</span> : null}
          {vacio ? <p className="vacio">Todavía no elegiste sabores.</p> : lineas.map((l) => (
            <span key={l.tipo + l.sabor}>{l.cantidad} {l.tipo === "xl" ? "XL" : "heladitos"} de {l.sabor}</span>
          ))}
        </div>
        <div className="escala" aria-hidden="true" hidden={!!promo}>
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
            <select id="pedido-fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-describedby="ayuda-fecha">
              <option value="">Elegí el día</option>
              {dias.map((d) => (
                <option key={d} value={d}>{ahora && d === sumarDias(hoyISO(ahora), 1) ? "Mañana, " : ""}{nombreDia(d)} {d.slice(8, 10)}/{d.slice(5, 7)}</option>
              ))}
            </select>
            <small className="ayuda" id="ayuda-fecha">De lunes a sábado. Los domingos no hay entregas.</small>
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="pedido-hora">{entrega === "retiro" ? "¿A qué hora lo retirás?" : "¿A qué hora te lo mandamos?"}</label>
          <select id="pedido-hora" value={hora} onChange={(e) => setHora(e.target.value)} aria-describedby="ayuda-hora">
            <option value="">Elegí la hora</option>
            {horas.map((h) => <option key={h} value={h}>{h} h</option>)}
          </select>
          <small className="ayuda" id="ayuda-hora">De {p.horaDesde} a {p.horaHasta} h. Desde las {p.horaDesde} ya estamos en el local.</small>
        </div>
        <label className="check-factura"><input type="checkbox" checked={conFactura} onChange={(e) => setConFactura(e.target.checked)} /> Necesito factura electrónica</label>
        {conFactura ? (
          <div className="campos-factura">
            <label htmlFor="fac-nombre">Nombre y apellido</label>
            <input id="fac-nombre" type="text" autoComplete="name" maxLength={120} value={fac.nombre_apellido} onChange={(e) => setFac({ ...fac, nombre_apellido: e.target.value })} />
            <label htmlFor="fac-ruc">RUC</label>
            <input id="fac-ruc" type="text" inputMode="text" autoComplete="off" maxLength={12} placeholder="1234567-8" aria-describedby="ayuda-ruc" value={fac.ruc}
              onChange={(e) => setFac({ ...fac, ruc: e.target.value.replace(/[^\d-]/g, "") })}
              onBlur={() => setFac((f) => ({ ...f, ruc: formatearRuc(f.ruc) }))} />
            <small className="ayuda" id="ayuda-ruc">Con el guion, por ejemplo 1234567-8. Si escribís solo los números, el guion se pone solo.</small>
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
