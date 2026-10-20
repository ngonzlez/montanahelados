// SVG de marca generados desde el material del estudio (src/content/arte.json).
// Son archivos del repo, nunca texto de usuarios, por eso se insertan tal cual.
import arte from "@/content/arte.json";

const LOGO = "/marca/logo.svg?v=1#logo";

type NombreIcono = keyof typeof arte.iconos;

export function Icono({ n }: { n: NombreIcono }) {
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: arte.iconos[n] }} />;
}

export function Helado({ color }: { color: string }) {
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: arte.helado.replace("COLOR", color) }} />;
}

export function Banda({ i }: { i: 0 | 1 | 2 }) {
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: arte.bandas[i] }} />;
}

/** Símbolos compartidos: nudo y huella (se usan con <use href="#...">). El logo vive en /marca/logo.svg (lo guarda el navegador). */
export function Simbolos() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="nudo" viewBox="0 0 120 50">
          <path d="M50 46 L24 6 L60 26 L96 6 L70 46 Z" fill="#FFF4DC" stroke="#6B2219" strokeWidth="6" strokeLinejoin="round" />
        </symbol>
        <symbol id="huella" viewBox="0 0 64 64">
          <path d="M32 31 C24 31 17 40 20 47 C22 53 28 50 32 50 C36 50 42 53 44 47 C47 40 40 31 32 31 Z" />
          <ellipse cx="16" cy="28" rx="4.6" ry="6.4" transform="rotate(-18 16 28)" />
          <ellipse cx="26" cy="18" rx="4.6" ry="6.8" />
          <ellipse cx="38" cy="18" rx="4.6" ry="6.8" />
          <ellipse cx="48" cy="28" rx="4.6" ry="6.4" transform="rotate(18 48 28)" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Logo({ className, etiqueta }: { className?: string; etiqueta?: string }) {
  return (
    <svg className={className} viewBox="0 0 1180 640" role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true}>
      <use href={LOGO} width="1180" height="640" />
    </svg>
  );
}

const MINI_COLORES = ["#FFF4DC", "#F7D977", "#CFE2A4", "#CDBBE8"];
export function MiniHelado({ i }: { i: number }) {
  return (
    <svg viewBox="0 0 60 200" aria-hidden="true" style={{ width: 14, height: 44 }}>
      <path d="M6 30 Q6 14 30 14 Q54 14 54 30 V170 Q54 198 30 198 Q6 198 6 170 Z" fill={MINI_COLORES[i % 4]} stroke="#6B2219" strokeWidth="6" />
    </svg>
  );
}

export function Borde({ img, antes, w, h }: { img: string; antes: string; w: number; h: number }) {
  return (
    <div className="borde" data-borde style={{ ["--antes" as string]: `var(--${antes})`, ["--img" as string]: `url('/bordes/${img}.svg')`, ["--w" as string]: `${w}px`, ["--h" as string]: `${h}px` }}>
      <div className="tira" />
    </div>
  );
}
