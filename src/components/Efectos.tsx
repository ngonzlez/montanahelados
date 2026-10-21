"use client";
// Movimiento de la página (portado del prototipo aprobado): intro una vez por visita, menú del celular,
// revelado al entrar, bordes y cinta que siguen al scroll, heladito que recorre "Cómo pedir",
// huellas de Hanna, heladito deslizador, chispas al hacer clic y aviso flotante.
import { useEffect } from "react";

export default function Efectos({ celular }: { celular: string }) {
  useEffect(() => {
    const limpiar: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: Window | Element, ev: K | string, f: (e: never) => void, o?: AddEventListenerOptions) => {
      t.addEventListener(ev, f as EventListener, o);
      limpiar.push(() => t.removeEventListener(ev, f as EventListener, o));
    };
    const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T & Element>(s) as T | null;
    const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // intro: una vez por sesión
    const introOriginal = $("#intro");
    const introMolde = introOriginal?.cloneNode(true) as HTMLElement | undefined;
    const correrIntro = (el: HTMLElement) => {
      const fuera = () => { el.style.animation = "intro-fuera .35s ease forwards"; setTimeout(() => el.remove(), 400); };
      el.querySelector(".saltar")?.addEventListener("click", fuera);
      setTimeout(() => el.isConnected && el.remove(), 4200);
    };
    if (introOriginal) {
      let visto = false;
      try { visto = sessionStorage.getItem("mh-intro") === "1"; sessionStorage.setItem("mh-intro", "1"); } catch {}
      if (visto || reducido) introOriginal.remove();
      else correrIntro(introOriginal);
    }
    const verIntro = $("#ver-intro");
    if (verIntro && introMolde) on(verIntro, "click", () => { $("#intro")?.remove(); const el = introMolde.cloneNode(true) as HTMLElement; document.body.appendChild(el); correrIntro(el); });

    // menú en celular
    const menuBtn = $("#menu-btn"), menu = $("#menu");
    const cerrarMenu = () => { menu?.classList.remove("abierto"); menuBtn?.setAttribute("aria-expanded", "false"); };
    if (menuBtn && menu) {
      on(menuBtn, "click", () => { const ab = menu.classList.toggle("abierto"); menuBtn.setAttribute("aria-expanded", ab ? "true" : "false"); });
      menu.querySelectorAll("a").forEach((a) => on(a, "click", cerrarMenu));
      on(window, "keydown", (e: KeyboardEvent) => { if (e.key === "Escape") cerrarMenu(); });
    }

    // copiar celular
    const copiar = $("#copiar");
    if (copiar) on(copiar, "click", () => {
      const ok = () => { copiar.textContent = "Copiado"; setTimeout(() => (copiar.textContent = "Copiar"), 1600); };
      const seleccionar = () => { const r = document.createRange(); const c = $("#cel"); if (!c) return; r.selectNodeContents(c); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); };
      try { navigator.clipboard.writeText(celular).then(ok, seleccionar); } catch { seleccionar(); }
    });

    // aviso flotante
    const aviso = document.createElement("div"); aviso.className = "aviso-flotante"; aviso.setAttribute("role", "status"); document.body.appendChild(aviso);
    limpiar.push(() => aviso.remove());
    let tAviso: ReturnType<typeof setTimeout>;
    on(window, "mh:aviso", (e: CustomEvent<string>) => { aviso.textContent = e.detail; aviso.classList.add("ver"); clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove("ver"), 1800); });

    // "Sumar 25" en tarjetas y "Elegir sabores" en promos
    document.querySelectorAll<HTMLElement>(".sumar").forEach((b) => on(b, "click", () => window.dispatchEvent(new CustomEvent("mh:sumar", { detail: b.dataset.slug }))));
    document.querySelectorAll<HTMLElement>("[data-armar-promo]").forEach((b) => on(b, "click", () => window.dispatchEvent(new CustomEvent("mh:promo", { detail: Number(b.dataset.armarPromo) }))));
    document.querySelectorAll<HTMLElement>("[data-cargar-promo]").forEach((b) => on(b, "click", () => window.dispatchEvent(new CustomEvent("mh:aviso", { detail: b.dataset.cargarPromo }))));

    // revelar al entrar
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }), { threshold: 0.18 });
    document.querySelectorAll(".pop, .hanna").forEach((el) => io.observe(el));
    limpiar.push(() => io.disconnect());

    // elementos que siguen al scroll
    const bordes = [...document.querySelectorAll<HTMLElement>("[data-borde] .tira")];
    const anchos = [...document.querySelectorAll<HTMLElement>("[data-borde]")].map((b) => parseFloat(getComputedStyle(b).getPropertyValue("--w")) || 40);
    const pista = $("#pista"), arco = $<SVGGElement>("#arco");
    const pasos = $("#pasos"), viajero = $("#viajero");
    const huellas = [...document.querySelectorAll<SVGElement>("#huellas svg")], hannaSec = $("#hanna");
    const secciones = [...document.querySelectorAll<HTMLElement>("[data-sabor]")];
    const pieza = $("#pieza"), relleno = $("#relleno"), nudo = $<SVGPathElement>("#pieza-nudo");
    const piezaSvg = pieza?.querySelector("svg") as SVGSVGElement | null;
    const desl = $(".deslizador");

    let ultimoY = scrollY, vel = 0, t0 = performance.now(), offsetCinta = 0, raf = 0;
    const prog = (el: Element, a = 1, b = 0) => { const r = el.getBoundingClientRect(); const h = innerHeight; return Math.min(1, Math.max(0, (h * a - r.top) / (r.height + h * (a - b)))); };

    const cuadro = (now: number) => {
      const y = scrollY, dt = Math.min(64, now - t0); t0 = now;
      vel += (y - ultimoY - vel) * 0.2; ultimoY = y;
      if (!reducido) {
        bordes.forEach((t, i) => { const w = anchos[i]; t.style.transform = `translateX(${-(((y * (i % 2 ? 0.35 : 0.5)) + i * 13) % w)}px)`; });
        if (pista) { offsetCinta += dt * 0.06 + Math.abs(vel) * 0.5; const mitad = pista.scrollWidth / 2; pista.style.transform = `translateX(${-(offsetCinta % mitad)}px)`; }
        if (arco?.ownerSVGElement) { const pa = prog(arco.ownerSVGElement, 1, 0.2); arco.style.transform = `scaleY(${0.35 + 0.65 * Math.min(1, pa * 1.6)})`; }
      }
      if (pasos && viajero) { const pp = prog(pasos, 0.7, 0.4); const alto = pasos.clientHeight - 80; viajero.style.transform = `translateY(${pp * alto}px) rotate(${Math.max(-18, Math.min(18, vel * 0.6))}deg)`; }
      if (hannaSec) { const ph = prog(hannaSec, 0.9, 0.3); const m = Math.round(Math.min(1, ph * 1.6) * huellas.length); huellas.forEach((h, i) => h.classList.toggle("on", i < m)); }
      if (pieza && desl && piezaSvg && nudo && relleno) {
        const max = document.documentElement.scrollHeight - innerHeight; const p = max > 0 ? y / max : 0;
        pieza.style.transform = `translateY(${p * (desl.clientHeight - pieza.offsetHeight)}px)`;
        piezaSvg.style.transform = `rotate(${Math.max(-22, Math.min(22, -vel * 0.8))}deg)`;
        nudo.style.transform = `rotate(${Math.sin(now / 120) * Math.min(25, Math.abs(vel) * 2)}deg)`;
        let actual = secciones[0];
        for (const s of secciones) if (s.getBoundingClientRect().top < innerHeight * 0.5) actual = s;
        if (actual) relleno.setAttribute("fill", actual.dataset.sabor ?? "#F4B9BF");
      }
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    limpiar.push(() => cancelAnimationFrame(raf));

    // arrastrar el heladito para desplazarse
    if (pieza && desl) {
      let arrastrando = false;
      on(pieza, "pointerdown", (e: PointerEvent) => { arrastrando = true; pieza.setPointerCapture(e.pointerId); e.preventDefault(); });
      on(pieza, "pointermove", (e: PointerEvent) => {
        if (!arrastrando) return;
        const r = desl.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (e.clientY - r.top - pieza.offsetHeight / 2) / (r.height - pieza.offsetHeight)));
        window.scrollTo({ top: p * (document.documentElement.scrollHeight - innerHeight), behavior: "instant" as ScrollBehavior });
      });
      ["pointerup", "pointercancel"].forEach((n) => on(pieza, n, () => (arrastrando = false)));
    }

    // chispas al hacer clic
    if (!reducido) on(window, "pointerdown", (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const cs = ["#F4B9BF", "#CFE2A4", "#F7D977", "#CDBBE8", "#FFF4DC"];
      for (let i = 0; i < 8; i++) {
        const d = document.createElement("i"); d.className = "chispa-clic";
        const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4, r = 34 + Math.random() * 26;
        d.style.left = e.clientX - 5 + "px"; d.style.top = e.clientY - 9 + "px"; d.style.background = cs[i % cs.length];
        d.style.setProperty("--x", Math.cos(a) * r + "px"); d.style.setProperty("--y", Math.sin(a) * r + "px"); d.style.setProperty("--g", Math.random() * 360 + "deg");
        document.body.appendChild(d); setTimeout(() => d.remove(), 750);
      }
    });

    return () => limpiar.forEach((f) => f());
  }, [celular]);

  return null;
}
