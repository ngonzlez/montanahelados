// Inicio: port del prototipo aprobado (prototipo/netlify/index.html) con los datos reales de la base.
import Armador from "@/components/Armador";
import Efectos from "@/components/Efectos";
import { Banda, Borde, Helado, Icono, Logo, MiniHelado, Simbolos } from "@/components/Arte";
import { datosInicio } from "@/lib/inicio";
import { gs } from "@/lib/formato";
import { enlaceWhatsapp, mensajePromo, MENSAJE_PUNTOS_VENTA } from "@/lib/whatsapp";
import { textosFinales } from "@/content/textos";
import { fotosFinales } from "@/content/fotos";
import Texto from "@/components/Texto";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Contacto = { valor: string; mostrar: string; link: string; link_perfil?: string };
type Red = { link: string; mostrar: string };

const ABANICO: [number, number, string][] = [[-36, -18, "72%"], [-24, -12, "78%"], [-12, -6, "84%"], [0, 0, "90%"], [12, 6, "84%"], [24, 12, "78%"], [36, 18, "72%"]];
const ICONOS_PUNTO = ["ubicacion0", "ubicacion1", "ubicacion2"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const d = await datosInicio();
  const pe = (d.ajustes.pedidos ?? {}) as { paquete_unidades?: number; sena_porcentaje?: number };
  const t = textosFinales(d.ajustes.textos_web, { paquete: pe.paquete_unidades ?? 25, sena: pe.sena_porcentaje ?? 50 });
  const f = fotosFinales(d.ajustes.fotos_web);
  return { title: t.seo_titulo, description: t.seo_descripcion, openGraph: { title: t.seo_titulo, description: t.seo_descripcion, images: [{ url: f.compartir.src, width: 1200, height: 630, alt: t.seo_titulo }], locale: "es_PY", type: "website" } };
}

export default async function Inicio() {
  const d = await datosInicio();
  const a = d.ajustes;
  const wa = (a.whatsapp as Contacto | undefined) ?? { valor: "595986759890", mostrar: "0986 759 890", link: "https://wa.me/595986759890" };
  const perfil = wa.link_perfil ?? wa.link;
  const ig = a.instagram as Red | undefined;
  const tt = a.tiktok as Red | undefined;
  const ubic = a.ubicacion as { texto: string; google_maps: string } | undefined;
  const reglas = (a.pedidos ?? {}) as { sena_porcentaje?: number; paquete_unidades?: number; paso_anticipado?: number; atajos_gourmet?: number[]; atajos_xl?: number[] };
  const paquete = reglas.paquete_unidades ?? 25;
  const sena = reglas.sena_porcentaje ?? 50;
  const t = textosFinales(a.textos_web, { paquete, sena });
  const f = fotosFinales(a.fotos_web);

  const escG = d.escalones.filter((e) => e.producto === "gourmet").sort((x, y) => x.desde - y.desde);
  const escX = d.escalones.filter((e) => e.producto === "xl").sort((x, y) => x.desde - y.desde);
  const mejorG = escG[escG.length - 1];
  const conFoto = d.sabores.filter((s) => s.foto);
  // abanico del hero: el mismo orden de colores del prototipo, el sabor del medio adelante
  const orden = [8, 6, 4, 0, 1, 7, 2].map((i) => conFoto[i]).filter(Boolean);
  const abanico = (orden.length >= 7 ? orden : conFoto).slice(0, 7);

  const saboresArmador = d.sabores.map((s) => ({ slug: s.slug, nombre: s.nombre, foto: s.foto, estado: s.estado }));
  const xlArmador = d.xl.map((s) => ({ slug: s.slug, nombre: s.nombre, detalle: s.descripcion, foto: s.foto, estado: s.estado }));

  return (
    <>
      <Simbolos />

      <div id="intro" aria-hidden="true">
        <div className="banda b1"><Banda i={0} /></div>
        <div className="banda b2"><Banda i={1} /></div>
        <div className="banda b3"><Banda i={2} /></div>
        <Logo className="logo-intro" />
        <div className="fila">
          {conFoto.slice(0, 7).map((s, i) => <img key={s.id} alt="" decoding="async" src={s.foto!} style={{ animationDelay: `${(1.5 + i * 0.12).toFixed(2)}s` }} />)}
        </div>
        <button className="boton claro saltar" type="button">Saltar</button>
      </div>

      <header className="barra">
        <div className="wrap">
          <a href="#inicio" className="marca" aria-label="Montana Helados, inicio"><Logo etiqueta="Montana Helados" /></a>
          <nav aria-label="Secciones" id="menu">
            <a href="#sabores">Sabores</a>
            {d.promos.length ? <a href="#promos">Promos</a> : null}
            {d.xl.length ? <a href="#xl">Helados XL</a> : null}
            <a href="#arma" className="destacado">Armá tu pedido</a>
            <a href="#pedir">Cómo pedir</a>
            <a href="#hanna">Hanna</a>
          </nav>
          <a className="boton" href={perfil} target="_blank" rel="noopener"><Icono n="mensaje" /><span className="largo">Pedir por WhatsApp</span><span className="corto">Pedir</span></a>
          <button className="menu-btn" type="button" id="menu-btn" aria-expanded="false" aria-controls="menu">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect className="l l1" x="3" y="4" width="18" height="4" rx="2" fill="#F4B9BF" stroke="#6B2219" strokeWidth="1.6" />
              <rect className="l l2" x="3" y="10" width="18" height="4" rx="2" fill="#CFE2A4" stroke="#6B2219" strokeWidth="1.6" />
              <rect className="l l3" x="3" y="16" width="18" height="4" rx="2" fill="#F7D977" stroke="#6B2219" strokeWidth="1.6" />
            </svg>
            Menú
          </button>
        </div>
      </header>

      <main id="inicio">
        <section className="hero" data-sabor="#F4B9BF" aria-labelledby="t-hero">
          <div className="wrap">
            <div>
              <h1 id="t-hero">{t.hero_titulo}<span>{t.hero_subtitulo}</span></h1>
              <p className="bajada"><Texto t={t.hero_bajada} /></p>
              <div className="acciones">
                <a className="boton" href="#arma"><Icono n="mensaje" />Armar mi pedido</a>
                <a className="boton claro" href="#sabores">Ver sabores</a>
              </div>
            </div>
            <div className="vitrina" aria-hidden="true">
              <div className="fondo-arco" />
              <div className="abanico">
                {abanico.map((s, i) => {
                  const [x, g, h] = ABANICO[i];
                  return <img key={s.id} src={s.foto!} alt="" decoding="async" fetchPriority={i === 3 ? "high" : "auto"} style={{ ["--x" as string]: `${x}%`, ["--g" as string]: `${g}deg`, ["--h" as string]: h, ["--d" as string]: `${(0.15 + Math.abs(x) / 100).toFixed(2)}s`, zIndex: 10 - Math.floor(Math.abs(x) / 12) }} />;
                })}
              </div>
              {mejorG && escG.length > 1 ? (
                <div className="precio-hero pop"><div><small>desde {mejorG.desde} unidades</small><strong>{gs(mejorG.precio)}</strong><small>cada uno</small></div></div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="cinta" aria-hidden="true">
          <div className="pista" id="pista">
            {[...d.sabores, ...d.sabores].map((s, i) => <span key={i}>{s.nombre}<MiniHelado i={i % Math.max(1, d.sabores.length)} /></span>)}
          </div>
        </div>

        <Borde img="sello1" antes="vainilla" w={32} h={34} />
        <section className="sabores" id="sabores" data-sabor="#F4B9BF" aria-labelledby="t-sabores">
          <div className="wrap">
            <div className="cabeza">
              <h2 id="t-sabores">{t.sabores_titulo}</h2>
              <p><Texto t={t.sabores_texto} /></p>
            </div>
            <div className="grilla-sabores">
              {d.sabores.map((s, i) => (
                <div key={s.id} className="sabor pop" style={{ ["--r" as string]: `${(-1) ** i * 4}deg`, ["--r2" as string]: `${(-1) ** i}deg`, ["--d" as string]: `${((i % 6) * 0.06).toFixed(2)}s` }}>
                  <div className="tile" style={{ ["--c" as string]: s.color }}>{s.foto ? <img loading="lazy" decoding="async" src={s.foto} alt={`Heladito de ${s.nombre.toLowerCase()} en su bolsita`} /> : null}</div>
                  <b>{s.nombre}</b>
                  {s.estado === "agotado" ? <span className="sumar">Agotado</span>
                    : s.estado === "hoy_no_hay" ? <button className="sumar" type="button" data-slug={s.slug}>Hoy no hay · para otro día</button>
                    : <button className="sumar" type="button" data-slug={s.slug}>Sumar {paquete}</button>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {d.promos.length ? (
          <>
            <Borde img="ondas1" antes="frutilla" w={60} h={30} />
            <section className="promos" id="promos" data-sabor="#F7D977" aria-labelledby="t-promos">
              <div className="wrap">
                <div className="cabeza">
                  <h2 id="t-promos">{t.promos_titulo}</h2>
                  <p><Texto t={t.promos_texto} /></p>
                </div>
                <div className="grilla-promos">
                  {d.promos.map((pr, i) => (
                    <article key={pr.id} className="promo pop" style={{ ["--r" as string]: `${i % 2 ? 2 : -2}deg`, ["--r2" as string]: `${i % 2 ? 1 : -1}deg` }}>
                      <div className="promo-foto">{pr.foto ? <img loading="lazy" decoding="async" src={pr.foto} alt={pr.titulo} /> : null}<span className="cinta-promo">Promo vigente</span></div>
                      <div className="promo-texto">
                        <h3>{pr.titulo}</h3>
                        {pr.detalle ? <p>{pr.detalle}</p> : null}
                        <div className="promo-acciones">
                          <a className="boton" target="_blank" rel="noopener" href={enlaceWhatsapp(wa.valor, mensajePromo(pr.textoWhatsapp || pr.titulo))}><Icono n="mensaje" />Pedir esta promo</a>
                          <a className="boton claro" href="#arma" data-cargar-promo="Elegí los sabores en Armá tu pedido">Elegir sabores</a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {d.xl.length ? (
          <>
            <Borde img="mordida" antes={d.promos.length ? "mburu" : "frutilla"} w={150} h={48} />
            <section className="xl" id="xl" data-sabor="#CFE2A4" aria-labelledby="t-xl">
              <div className="wrap">
                <div className="fotos-xl">
                  <figure className="pop f1"><img loading="lazy" decoding="async" src={f.xl_foto1.src} alt={f.xl_foto1.alt} /><figcaption>{t.xl_pie1}</figcaption></figure>
                  <figure className="pop f2"><img loading="lazy" decoding="async" src={f.xl_foto2.src} alt={f.xl_foto2.alt} /><figcaption>{t.xl_pie2}</figcaption></figure>
                </div>
                <div>
                  <p className="etiqueta">{t.xl_etiqueta}</p>
                  <h2 id="t-xl" style={{ fontSize: "clamp(40px,6vw,72px)", marginTop: 10 }}>{t.xl_titulo}</h2>
                  <p style={{ fontSize: 21, marginTop: 12 }}><Texto t={t.xl_texto} /></p>
                  <ul className="lista-xl">
                    {d.xl.map((x, i) => (
                      <li key={x.id} className="pop" style={{ ["--d" as string]: `${(i * 0.1).toFixed(1)}s` }}>
                        {x.foto ? <img loading="lazy" decoding="async" src={x.foto} alt="" /> : null}
                        <div><b>{x.nombre}</b>{x.descripcion}{x.estado === "agotado" ? " (agotado)" : ""}</div>
                      </li>
                    ))}
                  </ul>
                  <div className="precios">
                    {escX.map((e, i) => (
                      <div key={e.desde} className={`sello pop${i ? " dos" : ""}`}>
                        <div>{i ? <><small>llevando {e.desde} o más</small><strong>{gs(e.precio)}</strong><small>cada uno</small></> : <><small>cada uno</small><strong>{gs(e.precio)}</strong></>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}

        <Borde img="sello2" antes={d.xl.length ? "pistacho" : "frutilla"} w={32} h={34} />
        <section className="arma" id="arma" data-sabor="#F4B9BF" aria-labelledby="t-arma">
          <div className="wrap">
            <div className="cabeza">
              <h2 id="t-arma">{t.arma_titulo}</h2>
              <p><Texto t={t.arma_texto} /></p>
            </div>
            <Armador
              sabores={saboresArmador}
              xl={xlArmador}
              escalones={d.escalones}
              senaPorcentaje={sena}
              paquete={paquete}
              pasoAnticipado={reglas.paso_anticipado ?? 5}
              atajosGourmet={reglas.atajos_gourmet ?? [25, 50]}
              atajosXl={reglas.atajos_xl ?? [5, 30]}
            />
          </div>
        </section>

        <svg className="arco" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
          <g id="arco">
            <path d="M0 122 L0 112 C 180 -20, 820 -20, 1000 112 L1000 122 Z" fill="#CDBBE8" />
            <path d="M0 112 C 180 -20, 820 -20, 1000 112" fill="none" stroke="#6B2219" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        <section className="pedir" id="pedir" data-sabor="#CDBBE8" aria-labelledby="t-pedir">
          <div className="wrap">
            <div className="cabeza"><h2 id="t-pedir">{t.pedir_titulo}</h2><p><Texto t={t.pedir_texto} /></p></div>
            <div className="pasos" id="pasos">
              <div className="riel" aria-hidden="true" />
              <div className="viajero" id="viajero" aria-hidden="true"><Helado color="#F4B9BF" /></div>
              <ol>
                <li className="paso pop"><Icono n="mensaje" /><div><h3>{t.paso1_titulo}</h3><p><Texto t={t.paso1_texto} /></p></div></li>
                <li className="paso pop"><Icono n="reloj" /><div><h3>{t.paso2_titulo}</h3><p><Texto t={t.paso2_texto} /></p></div></li>
                <li className="paso pop"><Icono n="sena" /><div><h3>{t.paso3_titulo}</h3><p><Texto t={t.paso3_texto} /></p></div></li>
                <li className="paso pop"><Icono n="conservadora" /><div><h3>{t.paso4_titulo}</h3><p><Texto t={t.paso4_texto} /></p></div></li>
                <li className="paso pop"><Icono n="copo" /><div><h3>{t.paso5_titulo}</h3><p><Texto t={t.paso5_texto} /></p></div></li>
              </ol>
            </div>
            <p className="aviso"><Icono n="ubicacion_claro" /><span><Texto t={t.aviso_ubicacion} /></span></p>
            <p className="aviso claro"><Icono n="mensaje" /><span><Texto t={t.aviso_factura} /></span></p>
          </div>
        </section>

        <Borde img="damero" antes="uva" w={56} h={56} />
        <section className="reventa" id="reventa" data-sabor="#F4B9BF" aria-labelledby="t-reventa">
          <div className="wrap">
            <div className="texto">
              <p className="etiqueta">{t.reventa_etiqueta}</p>
              <h2 id="t-reventa" style={{ fontSize: "clamp(44px,7vw,78px)", marginTop: 10 }}>{t.reventa_titulo}</h2>
              <p><Texto t={t.reventa_texto} /></p>
              <div className="escalones">
                {escG.map((e, i) => (
                  <div key={e.desde} className="escalon pop" style={i === 0 ? { ["--r" as string]: "-6deg", ["--r2" as string]: "-2deg" } : undefined}>
                    <div><small>{i === 0 ? (escG[1] ? `hasta ${escG[1].desde - 1}` : "cada uno") : `desde ${e.desde}`}</small><strong>{gs(e.precio)}</strong><small>cada uno</small></div>
                  </div>
                ))}
              </div>
              <p><Texto t={t.reventa_nota} /></p>
              <p><a className="boton" href="#arma" style={{ marginTop: 6 }}>Armar mi pedido</a></p>
            </div>
            <div className="foto-caja"><img loading="lazy" decoding="async" src={f.reventa.src} alt={f.reventa.alt} /></div>
          </div>
        </section>

        {d.puntos.length ? (
          <>
            <Borde img="ondas3" antes="frutilla" w={60} h={30} />
            <section className="puntos" id="puntos" data-sabor="#CFE2A4" aria-labelledby="t-puntos">
              <div className="wrap">
                <div className="cabeza">
                  <h2 id="t-puntos">{t.puntos_titulo}</h2>
                  <p><Texto t={t.puntos_texto} /></p>
                </div>
                <p style={{ margin: "-14px 0 28px" }}><a className="boton" href={enlaceWhatsapp(wa.valor, MENSAJE_PUNTOS_VENTA)} target="_blank" rel="noopener"><Icono n="mensaje" />Consultar disponibilidad por WhatsApp</a></p>
                <div className="grilla-puntos">
                  {d.puntos.map((pv, i) => (
                    <a key={pv.id} className="punto pop" style={{ ["--r" as string]: `${(-1) ** i * 2}deg`, ["--r2" as string]: `${(-1) ** i * 0.5}deg` }} href={pv.linkMapa} target="_blank" rel="noopener">
                      <Icono n={ICONOS_PUNTO[i % 3]} />
                      <div><b>{pv.nombre}</b><span>Ver en el mapa</span></div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        <Borde img="sello3" antes={d.puntos.length ? "pistacho" : "frutilla"} w={32} h={34} />
        <section className="hanna" id="hanna" data-sabor="#F4B9BF" aria-labelledby="t-hanna">
          <div className="wrap">
            <figure className="foto-hanna"><img loading="lazy" decoding="async" src={f.hanna.src} alt={f.hanna.alt} /><span className="globo">{t.hanna_globo}</span></figure>
            <div>
              <h2 id="t-hanna">{t.hanna_titulo}</h2>
              <p><Texto t={t.hanna_texto} /></p>
              <div className="huellas" id="huellas" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <svg key={i} viewBox="0 0 64 64" style={{ left: `${4 + i * 13}%`, top: `${(i % 2) * 24}px`, ["--rot" as string]: `${(-1) ** i * 10 + 8}deg` }} fill="#B9743F"><use href="#huella" /></svg>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Borde img="puntas" antes="vainilla" w={256} h={58} />
      </main>

      <footer>
        <div className="wrap">
          <div>
            <Logo className="logo-pie" etiqueta="Montana Helados" />
            <p style={{ marginTop: 18, fontSize: 18, maxWidth: "24em" }}><Texto t={t.pie_texto} /></p>
            <p style={{ marginTop: 20 }}><a className="boton" href={perfil} target="_blank" rel="noopener"><Icono n="mensaje" />Escribinos por WhatsApp</a></p>
          </div>
          <dl>
            <div><dt>Celular</dt><dd><span id="cel">{wa.mostrar}</span><button className="copiar" type="button" id="copiar">Copiar</button></dd></div>
            {a.horarios ? <div><dt>Horario</dt><dd>{String(a.horarios)}</dd></div> : null}
            {ig || tt ? (
              <div><dt>Redes</dt><dd>
                {ig ? <a href={ig.link} target="_blank" rel="noopener">Instagram {ig.mostrar}</a> : null}
                {ig && tt ? <br /> : null}
                {tt ? <a href={tt.link} target="_blank" rel="noopener">TikTok {tt.mostrar}</a> : null}
              </dd></div>
            ) : null}
            {ubic ? <div><dt>Dónde estamos</dt><dd>{t.pie_ubicacion} <a href={ubic.google_maps} target="_blank" rel="noopener">Cómo llegar</a></dd></div> : null}
            <div><dt>Entregas</dt><dd>{t.pie_entregas}</dd></div>
          </dl>
          <p className="nota">
            <button type="button" className="copiar" id="ver-intro" style={{ margin: "0 10px 0 0" }}>Ver la intro de nuevo</button>
            <a href="/terminos">Condiciones</a> · <a href="/privacidad">Privacidad</a>
          </p>
        </div>
      </footer>

      <div className="deslizador" aria-hidden="true">
        <div className="via" />
        <div className="pieza" id="pieza">
          <svg viewBox="0 0 60 150">
            <g id="pieza-cuerpo">
              <path className="relleno" id="relleno" d="M6 30 Q6 14 30 14 Q54 14 54 30 V128 Q54 146 30 146 Q6 146 6 128 Z" fill="#F4B9BF" stroke="#6B2219" strokeWidth="4" />
              <path d="M17 38 V108" stroke="#FFF4DC" strokeWidth="6" strokeLinecap="round" />
            </g>
            <path id="pieza-nudo" d="M18 16 L8 2 L30 10 L52 2 L42 16 Z" fill="#FFF4DC" stroke="#6B2219" strokeWidth="4" strokeLinejoin="round" style={{ transformOrigin: "30px 14px" }} />
          </svg>
        </div>
      </div>

      <Efectos celular={wa.mostrar.replace(/\s/g, "")} />
    </>
  );
}
